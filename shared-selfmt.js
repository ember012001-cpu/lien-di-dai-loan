/* ============================================================
   shared-selfmt.js
   Các thao tác định dạng dựa trên PHẦN CHỮ ĐANG BÔI ĐEN — dùng chung cả 4 app:
   - Tab / Shift+Tab để thụt lề / giảm thụt lề (tự chạy, không cần app gọi gì)
   - 2 hàm nền tảng để app tự dựng "đổi cỡ chữ", "đổi kiểu chữ"... theo đúng
     phần đang bôi đen: getSelRange() và wrapRangeWithStyle()

   CÁCH DÙNG TRONG 1 APP:
   1. Thêm <script src="shared-selfmt.js"></script> TRƯỚC script chính
      (không cần CSS riêng cho file này).
   2. Tab/Shift+Tab đã tự hoạt động ngay, không cần làm gì thêm.
   3. Muốn đổi 1 thuộc tính CSS (fontSize, fontFamily...) theo đúng phần bôi
      đen, dùng 2 hàm:

        const range = getSelRange();               // lấy phần đang bôi đen
        if(!range){ toast("Hãy bôi đen chữ trước."); return; }
        wrapRangeWithStyle(range, "fontSize", "24px");   // áp dụng

      wrapRangeWithStyle tự tìm đúng ô contenteditable chứa phần bôi đen,
      bọc đúng phần đó trong 1 <span> mang style mới, và tự báo cho app biết
      nội dung vừa đổi (bắn sự kiện "input" lên ô đó — app tự lưu như bình
      thường qua listener "input" sẵn có).

   LƯU Ý KHI SỬA: file này dùng chung cho cả 4 app — sửa ở đây là sửa cho
   TẤT CẢ app cùng lúc. Test kỹ ở 1 app trước khi coi là xong.
   ============================================================ */
(function(){

// Lấy Range hiện đang được bôi đen (null nếu không có gì được chọn)
window.getSelRange=function(){
  const sel=window.getSelection();
  if(sel && sel.rangeCount && !sel.isCollapsed) return sel.getRangeAt(0).cloneRange();
  return null;
};

// Bọc "range" (đoạn đang bôi đen, hoặc 1 range đã lưu trước đó) trong 1 <span>
// mang style[prop]=value. Trả về ô contenteditable chứa nó nếu thành công
// (và tự bắn sự kiện "input" lên ô đó để app tự lưu), hoặc null nếu thất bại
// (không tìm thấy ô contenteditable hợp lệ chứa "range").
// opts.keepSelection=true → giữ nguyên vùng bôi đen sau khi áp dụng (mặc định
// là chọn lại đúng phần vừa đổi, cho phép đổi tiếp thuộc tính khác ngay).
//
// AN TOÀN VỚI BẢNG: nếu vùng bôi đen "tràn" qua cả 1 cái bảng (chọn từ ngoài bảng
// sang trong bảng, hoặc chọn nguyên cả bảng), KHÔNG được bọc <span> quanh toàn bộ —
// làm vậy sẽ nhét thẻ <table> vào trong <span>, phá vỡ hoàn toàn cách trình duyệt
// dựng bảng (chính là nguyên nhân bảng bị vỡ layout khi trước). Gặp trường hợp này,
// hàm tự chuyển sang áp style cho TỪNG đoạn chữ riêng lẻ, bỏ qua khung bảng.
window.wrapRangeWithStyle=function(range,prop,value,opts){
  opts=opts||{};
  if(!range) return null;
  const node=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  const ed=node&&node.closest?node.closest('[contenteditable="true"]'):null;
  if(!ed) return null;
  let hasStructural=false;
  try{
    const preview=range.cloneContents();
    hasStructural=!!(preview.querySelector&&preview.querySelector("table,tr,td,th,thead,tbody,colgroup,ul,ol,li"));
  }catch(e){}
  if(hasStructural) return applyStyleToTextNodesInRange(range,ed,prop,value);
  try{
    const frag=range.extractContents();
    // Xoá thuộc tính CÙNG LOẠI (VD fontSize) khỏi bên trong phần vừa lấy ra trước — tránh
    // bấm nhiều lần liên tiếp (VD "Cỡ +" nhiều lần) cứ lồng thêm 1 lớp <span> mới, ngày càng
    // sâu — chỉ nên có đúng 1 lớp mang giá trị mới nhất.
    stripPropDeep(frag,prop);
    const span=document.createElement("span"); span.style[prop]=value;
    span.appendChild(frag);
    const startMark=document.createComment("_szS_"), endMark=document.createComment("_szE_");
    range.insertNode(endMark);
    range.insertNode(span);
    range.insertNode(startMark);
    unwrapRedundantPropAncestors(startMark,endMark,ed,prop);
    startMark.remove(); endMark.remove();
    if(!opts.keepSelection){
      const sel=window.getSelection();
      sel.removeAllRanges();
      const r2=document.createRange(); r2.selectNodeContents(span); sel.addRange(r2);
    }
    ed.dispatchEvent(new Event("input",{bubbles:true}));
    return ed;
  }catch(e){ return null; }
};

// Xoá thuộc tính CSS "prop" khỏi CHÍNH phần tử này và mọi phần tử con bên trong.
function stripPropDeep(root,prop){
  if(root.nodeType===1 && root.style && root.style[prop]) root.style[prop]="";
  if(root.querySelectorAll){
    root.querySelectorAll("[style]").forEach(el=>{ if(el.style[prop]) el.style[prop]=""; });
  }
}
// Sau khi vừa áp 1 lớp <span> mới mang thuộc tính "prop", trèo lên các thẻ cha — nếu thẻ cha
// đó CŨNG có sẵn thuộc tính "prop" (từ lần bấm trước) VÀ toàn bộ nội dung của nó chỉ là đúng
// đoạn mình vừa xử lý, xoá "prop" của thẻ cha đó luôn (không đụng các thuộc tính KHÁC như màu
// chữ, đậm...), tránh lồng ngày càng sâu qua mỗi lần bấm.
function unwrapRedundantPropAncestors(m1,m2,editableRoot,prop){
  const ourText=getTextBetweenMarkers(m1,m2);
  let el=m1.parentElement;
  while(el && el!==editableRoot && el.nodeType===1){
    const parent=el.parentElement;
    if(!parent) break;
    if(el.style && el.style[prop]){
      if(el.textContent===ourText) el.style[prop]="";
      else break;
    }
    el=parent;
  }
}
function getTextBetweenMarkers(m1,m2){
  if(!m1.parentElement) return "";
  const siblings=[...m1.parentElement.childNodes];
  const i1=siblings.indexOf(m1), i2=siblings.indexOf(m2);
  if(i1===-1||i2===-1) return "";
  const [lo,hi]=i1<i2?[i1,i2]:[i2,i1];
  let s=""; for(let k=lo+1;k<hi;k++) s+=(siblings[k].textContent||"");
  return s;
}

// Khi vùng chọn "tràn" qua bảng/danh sách: áp style cho từng cụm chữ riêng lẻ nằm trong
// vùng chọn, không đụng gì tới khung bảng/danh sách — tránh làm vỡ cấu trúc HTML.
function applyStyleToTextNodesInRange(range,ed,prop,value){
  const root=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  if(!root) return null;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
    try{ return range.intersectsNode(n)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT; }
    catch(e){ return NodeFilter.FILTER_REJECT; }
  }});
  const nodes=[]; let n; while(n=walker.nextNode()) nodes.push(n);
  nodes.forEach(txt=>{
    try{
      let startOffset=0, endOffset=txt.nodeValue.length;
      if(txt===range.startContainer) startOffset=range.startOffset;
      if(txt===range.endContainer) endOffset=range.endOffset;
      if(startOffset>=endOffset) return;
      const r=document.createRange(); r.setStart(txt,startOffset); r.setEnd(txt,endOffset);
      const span=document.createElement("span"); span.style[prop]=value;
      span.appendChild(r.extractContents());
      r.insertNode(span);
    }catch(e){}
  });
  ed.dispatchEvent(new Event("input",{bubbles:true}));
  return ed;
}

// Tab để thụt lề, Shift+Tab để giảm thụt lề — giống Word, tự chạy trên mọi ô contenteditable
document.addEventListener("keydown",e=>{
  if(e.key!=="Tab") return;
  const ed=document.activeElement;
  if(!ed||!ed.isContentEditable) return;
  e.preventDefault();
  document.execCommand("styleWithCSS",false,true);
  document.execCommand(e.shiftKey?"outdent":"indent",false,null);
  ed.dispatchEvent(new Event("input",{bubbles:true}));
});

})();
