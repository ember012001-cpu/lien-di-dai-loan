/* ============================================================
   shared-vocab.js
   🔖 LÕI KHO TỪ VỰNG CHUNG — dùng chung cho cả 4 app
   (quét từ lồng nhau trong bài, tự động tô đúng màu/định dạng theo thẻ từ,
    tự ghi "đã xuất hiện ở", đồng bộ định dạng khi sửa thẻ từ)

   ĐÂY LÀ PHẦN LÕI QUAN TRỌNG NHẤT — sửa ở đây ảnh hưởng CẢ 4 APP CÙNG LÚC.
   File này KHÔNG đụng vào cấu trúc dữ liệu đã lưu (han_vocab_bank) — chỉ là
   nơi đặt lại các hàm xử lý mà 4 app vốn đã tự viết giống hệt nhau.

   QUY TẮC ĐỊNH DẠNG (từ bản cập nhật gộp màu nền): đậm/nghiêng/gạch chân/
   gạch ngang/màu chữ/MÀU NỀN đều là thuộc tính CHUNG của cả từ (rec.wordStyle),
   dùng giống nhau ở MỌI bài, MỌI app, MỌI nơi từ đó xuất hiện — không còn khác
   nhau theo từng bài như trước nữa. Sửa định dạng ở bất kỳ đâu (kể cả màu nền)
   sẽ cập nhật NGAY LẬP TỨC cho tất cả các chỗ khác (kiểu "sửa mới nhất thắng").

   CÁCH DÙNG TRONG 1 APP:
   1. Thêm <script src="shared-vocab.js"></script> TRƯỚC script chính.
   2. Dùng occFor(rec,itemId), extractWordStyle(el), wordStyleCSS(rec) y hệt
      như trước (không đổi cách gọi).
   3. Để quét 1 vùng nội dung (VD 1 bài đọc, 1 ô transcript, 1 field bài viết):

        const changed = vocabScanRoot(root, bank, ctx, opts);

      - root: 1 phần tử contenteditable cần quét.
      - bank: mảng thẻ từ (vocabBank hoặc state.vocab của app đó).
      - ctx:  {id, title, appLabel} — id/tên bài đang mở + nhãn app (APP_LABEL).
      - opts: {tagName, className, excludeSelector, rebuild}
          tagName:  "span" hoặc "mark" — loại thẻ HTML dùng để bọc từ.
          className: tên class gắn lên thẻ bọc (VD "vw", "vocab", "vocab-hit").
          excludeSelector: các thẻ không quét lại (VD ".vw,.note-mark,script,style").
          rebuild: true → gỡ hết thẻ cũ rồi quét lại từ đầu mỗi lần gọi (kiểu
                   app Nghe vẫn làm); false/bỏ trống → chỉ quét phần CHƯA được
                   bọc, giữ nguyên phần đã bọc trước đó (kiểu Đọc/Nói/Viết vẫn làm).
      Hàm tự lo: tìm từ khớp (kể cả lồng nhau), tự ghi occurrence mới nếu
      bài này lần đầu có từ đó, tự tô đúng màu nền + định dạng theo thẻ từ.
      Trả về true nếu có thay đổi (app tự lưu lại như đã luôn làm).

   4. Để LÀM MỚI định dạng của các từ ĐÃ được bọc từ trước (VD sau khi bạn
      sửa định dạng 1 thẻ từ, cần cập nhật lại mọi chỗ từ đó đã xuất hiện):

        vocabApplyStyles(root, bank, ctx, opts);

      Dùng cùng "opts" như trên (tagName/className). Không cần dùng hàm này
      nếu app đang dùng rebuild:true (vì vocabScanRoot đã tự cập nhật đủ rồi).

   5. Khi tải kho từ vựng lên (mỗi app tự làm 1 lần lúc khởi động), gọi thêm:

        migrateVocabBg(bank);

      Gộp dữ liệu CŨ (màu nền từng lưu riêng theo từng bài) thành 1 màu nền
      DÙNG CHUNG cho cả từ — chỉ cần gọi, không cần lo gọi nhiều lần (an toàn,
      từ nào đã có màu nền chung thì tự bỏ qua, không ghi đè).

   LƯU Ý KHI SỬA: sửa ở đây ảnh hưởng CẢ 4 APP. Đây là phần lõi quan trọng
   nhất — sửa xong nhớ test that kỹ ở từng app trước khi coi là xong.
   ============================================================ */
(function(){

// ---- Tìm occurrence của 1 thẻ từ tại 1 bài cụ thể ----
window.occFor=function(rec,itemId){ return (rec.occurrences||[]).find(o=>o.itemId===itemId); };

// ---- Đọc định dạng (đậm/nghiêng/gạch chân/gạch ngang/màu chữ/màu nền) từ nội dung 1 ô contenteditable ----
window.extractWordStyle=function(el){
  const html=el.innerHTML||"";
  const bold=/<(b|strong)[\s>]/i.test(html)||/font-weight\s*:\s*(bold|[6-9]\d\d)/i.test(html);
  const italic=/<(i|em)[\s>]/i.test(html)||/font-style\s*:\s*italic/i.test(html);
  const underline=/<u[\s>]/i.test(html)||/text-decoration(-line)?\s*:\s*[a-z\s]*underline/i.test(html);
  const strike=/<(s|strike|del)[\s>]/i.test(html)||/text-decoration(-line)?\s*:\s*[a-z\s]*line-through/i.test(html);
  const m=html.match(/(?<![a-z-])color\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\))/i);
  const bgm=html.match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\))/i);
  return {bold,italic,underline,strike,color:m?m[1]:null,bg:bgm?bgm[1]:null};
};

// ---- Tạo chuỗi CSS inline từ rec.wordStyle (đậm/nghiêng/gạch chân/gạch ngang/màu chữ/màu nền) ----
window.wordStyleCSS=function(rec){
  const st=rec.wordStyle||{};
  const parts=[];
  parts.push("font-weight:"+(st.bold?"700":"400"));
  parts.push("font-style:"+(st.italic?"italic":"normal"));
  const td=[]; if(st.underline) td.push("underline"); if(st.strike) td.push("line-through");
  parts.push("text-decoration:"+(td.length?td.join(" "):"none"));
  if(st.color) parts.push("color:"+st.color);
  if(st.bg) parts.push("background-color:"+st.bg);
  return parts.join(";");
};

function applyFullStyle(el,rec){
  const st=rec.wordStyle||{};
  el.style.fontWeight=st.bold?"700":"400";
  el.style.fontStyle=st.italic?"italic":"normal";
  const td=[]; if(st.underline) td.push("underline"); if(st.strike) td.push("line-through");
  el.style.textDecoration=td.length?td.join(" "):"none";
  if(st.color) el.style.color=st.color;
  el.style.background=st.bg||"";
}

// Quét ĐỆ QUY: bắt từ dài nhất trước ở mỗi vị trí, rồi quét TIẾP bên trong phần vừa bắt để tìm
// từ ngắn hơn lồng bên trong (VD 爽快 chứa 爽 và 快). Mỗi thẻ giữ định dạng riêng của nó —
// không thẻ nào ghi đè thẻ nào, vì áp vào các thẻ lồng nhau khác nhau.
function buildVocabFrag(text,wordMap,words,ctx,onNewOcc,opts){
  if(!text||!words.length) return null;
  const rx=new RegExp(words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  const frag=document.createDocumentFragment();
  let last=0,m,matched=false;
  while(m=rx.exec(text)){
    matched=true;
    const word=m[0]; const rec=wordMap.get(word);
    if(m.index>last) frag.appendChild(document.createTextNode(text.slice(last,m.index)));
    let occ=occFor(rec,ctx.id);
    if(!occ){
      occ={app:ctx.appLabel,itemId:ctx.id,itemTitle:ctx.title||"(chưa đặt tên)",addedAt:Date.now()};
      if(!Array.isArray(rec.occurrences)) rec.occurrences=[];
      rec.occurrences.push(occ); onNewOcc&&onNewOcc();
    }
    const el=document.createElement(opts.tagName); el.className=opts.className; el.dataset.vid=rec.id;
    if(opts.wordAttr) el.dataset.word=word; // app Nghe cần data-word để bấm vào từ nhảy tới thẻ
    applyFullStyle(el,rec);
    const innerWords=words.filter(w=>w!==word);
    const innerFrag=buildVocabFrag(word,wordMap,innerWords,ctx,onNewOcc,opts);
    if(innerFrag) el.appendChild(innerFrag); else el.textContent=word;
    frag.appendChild(el);
    last=m.index+word.length;
  }
  if(!matched) return null;
  if(last<text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  return frag;
}

// ---- Quét 1 vùng nội dung, tự bọc từ đã có trong kho chung + tự ghi occurrence mới ----
// Trả về true nếu có thay đổi.
window.vocabScanRoot=function(root,bank,ctx,opts){
  if(!root||!ctx||!ctx.id) return false;
  bank=bank||[];
  if(!bank.length) return false;
  opts=opts||{};
  const tagName=opts.tagName||"span";
  const className=opts.className||"vw";
  const excludeSelector=opts.excludeSelector||(tagName+"."+className+",script,style");
  // AN TOÀN TỐI ĐA: bọc TOÀN BỘ quá trình quét trong try/catch — nếu có bất kỳ lỗi bất ngờ
  // nào xảy ra (dữ liệu lạ, trình duyệt lạ...), hàm sẽ dừng êm và trả về false (coi như
  // "không có gì thay đổi"), thay vì làm lỗi lan ra ngoài khiến nơi gọi hàm này (thường là
  // renderReader/renderMain) bị dừng giữa chừng — đây chính là nguyên nhân từng khiến nội
  // dung bài bị lưu lại THIẾU (bị cắt cụt) khi lỗi xảy ra đúng lúc đang lưu.
  try{
    if(opts.rebuild){
      // QUAN TRỌNG: không đọc thẳng elx.textContent — nếu bên trong đã có chú thích pinyin
      // (thẻ <rt>, hiện khi bật pinyin), textContent sẽ gộp luôn chữ phiên âm vào chung với
      // chữ Hán (VD "淘气" bị lẫn thành "淘táo气qì"), làm hỏng nội dung dần theo mỗi lần quét lại.
      // Phải bỏ hết <rt> trước rồi mới lấy chữ thật.
      root.querySelectorAll(tagName+"."+className).forEach(elx=>{
        const clone=elx.cloneNode(true);
        clone.querySelectorAll("rt").forEach(rt=>rt.remove());
        const t=document.createTextNode(clone.textContent);
        elx.replaceWith(t);
      });
      root.normalize();
    }

    const wordMap=new Map();
    bank.forEach(v=>{ if(v&&v.word && !wordMap.has(v.word)) wordMap.set(v.word,v); });
    const words=[...wordMap.keys()].sort((a,b)=>b.length-a.length);
    if(!words.length) return false;
    const rxTest=new RegExp(words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'));

    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
      const p=n.parentElement;
      return (p&&p.closest&&p.closest(excludeSelector))?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
    }});
    const todo=[]; let n; while(n=walker.nextNode()){ if(n.nodeValue&&rxTest.test(n.nodeValue)) todo.push(n); }

    let changed=false;
    todo.forEach(node=>{
      // AN TOÀN: nếu quét/tô 1 đoạn chữ nào đó bị lỗi bất ngờ, KHÔNG được để cả quá trình dừng
      // giữa chừng (dừng giữa chừng rồi lỡ lưu lại sẽ làm mất nội dung phía sau đoạn bị lỗi).
      // Bọc từng đoạn riêng: đoạn nào lỗi thì bỏ qua đúng đoạn đó, giữ nguyên chữ gốc, các đoạn
      // khác vẫn tiếp tục quét bình thường.
      try{
        const frag=buildVocabFrag(node.nodeValue,wordMap,words,ctx,()=>{changed=true;},{tagName,className,wordAttr:opts.wordAttr});
        if(frag){ node.replaceWith(frag); changed=true; }
      }catch(e){ console.warn("vocabScanRoot: bỏ qua 1 đoạn do lỗi, giữ nguyên chữ gốc",e); }
    });
    return changed;
  }catch(e){
    console.warn("vocabScanRoot: dừng an toàn do lỗi, không đụng gì thêm vào nội dung",e);
    return false;
  }
};

// ---- Làm mới định dạng (màu nền + đậm/nghiêng/gạch chân/màu chữ) của các từ ĐÃ được bọc từ trước ----
// Dùng sau khi sửa 1 thẻ từ, để mọi chỗ từ đó đã xuất hiện tự cập nhật theo định dạng mới.
window.vocabApplyStyles=function(root,bank,ctx,opts){
  if(!root||!ctx) return;
  opts=opts||{};
  const tagName=opts.tagName||"span";
  const className=opts.className||"vw";
  root.querySelectorAll(tagName+"."+className+"[data-vid]").forEach(el=>{
    try{
      const rec=(bank||[]).find(v=>v&&v.id===el.dataset.vid);
      if(!rec) return;
      applyFullStyle(el,rec);
    }catch(e){ console.warn("vocabApplyStyles: bỏ qua 1 thẻ do lỗi",e); }
  });
};

// ---- Kiểm tra 1 "occurrence" (đã xuất hiện ở bài nào) có còn trỏ tới bài THẬT SỰ CÒN TỒN TẠI
// không — dùng để ẩn bớt các tham chiếu "chết" (trỏ tới bài đã bị xoá) khi hiển thị mục
// "📍 Cũng xuất hiện ở". Hàm này CHỈ ĐỌC dữ liệu (localStorage) để kiểm tra, KHÔNG xoá hay sửa
// gì cả — an toàn tuyệt đối với dữ liệu đã lưu, kể cả nếu gọi sai/gọi nhầm chỗ nào đó.
// Khi không chắc chắn (đọc lỗi, chưa từng mở app đó trên máy này, không nhận diện được app...)
// LUÔN trả về true (coi như còn tồn tại) — thà thỉnh thoảng còn sót 1 tham chiếu cũ hiển thị ra,
// còn hơn ẩn nhầm 1 tham chiếu vẫn còn đúng.
const APP_STORAGE_MAP={
  "📖 Luyện đọc hiểu":{key:"han_reader",field:"tree"},
  "🎤 Luyện nói":{key:"han_speaking",field:"tree"},
  "🎧 Luyện nghe":{key:"tinh_nghe_state",field:"roots"},
  "📝 Viết luận HSK":{key:"hsk_writing_journal_v1",field:"entries"}
};
function findIdInTree(nodes,id){
  if(!Array.isArray(nodes)) return false;
  for(const n of nodes){
    if(n&&n.id===id) return true;
    if(n&&Array.isArray(n.children)&&findIdInTree(n.children,id)) return true;
  }
  return false;
}
window.occItemExists=function(occ){
  if(!occ||!occ.app||!occ.itemId) return true;
  const cfg=APP_STORAGE_MAP[occ.app];
  if(!cfg) return true;
  try{
    const raw=localStorage.getItem(cfg.key);
    if(!raw) return true;
    const data=JSON.parse(raw);
    const list=data[cfg.field];
    if(!Array.isArray(list)) return true;
    return findIdInTree(list,occ.itemId);
  }catch(e){ return true; }
};

// ---- Gộp dữ liệu CŨ: trước đây màu NỀN được lưu riêng theo từng bài (occ.hl), giờ màu nền
// dùng CHUNG cho cả từ (giống đậm/nghiêng/màu chữ) — hàm này chạy 1 lần, tự chọn màu nền GẦN
// ĐÂY NHẤT (occurrence cuối cùng trong danh sách có màu) làm chuẩn cho những từ CHƯA có màu nền
// chung. An toàn: chỉ THÊM rec.wordStyle.bg, không xoá occ.hl cũ (giữ lại phòng khi cần đối chiếu).
// Gọi lại nhiều lần không sao — từ nào đã có rec.wordStyle.bg thì bỏ qua, không ghi đè.
window.migrateVocabBg=function(bank){
  if(!Array.isArray(bank)) return false;
  let changed=false;
  bank.forEach(rec=>{
    try{
      if(!rec||typeof rec!=="object") return;
      if(!rec.wordStyle) rec.wordStyle={};
      if(rec.wordStyle.bg) return; // đã có màu nền chung rồi, bỏ qua
      const occs=Array.isArray(rec.occurrences)?rec.occurrences:[];
      for(let i=occs.length-1;i>=0;i--){
        if(occs[i]&&occs[i].hl){ rec.wordStyle.bg=occs[i].hl; changed=true; break; }
      }
    }catch(e){ console.warn("migrateVocabBg: bỏ qua 1 thẻ do lỗi",e); }
  });
  return changed;
};

})();
