/* ============================================================
   shared-colorpop.js
   🎨 Bảng màu 60 màu đầy đủ — dùng chung cho cả 4 app
   (bôi đen chữ → bấm nút màu nền/màu chữ → chọn màu → áp dụng ngay)

   CÁCH DÙNG TRONG 1 APP:
   1. Thêm <link rel="stylesheet" href="shared-colorpop.css"> trong <head>.
   2. Thêm <script src="shared-colorpop.js"></script> TRƯỚC script chính.
   3. Mỗi nút mở bảng màu của app, khi bấm (dùng mousedown+preventDefault để
      giữ đúng phần đang bôi đen) gọi:
        openColorPop("hl", nutNay)   // mở bảng chọn MÀU NỀN
        openColorPop("fc", nutNay)   // mở bảng chọn MÀU CHỮ
      "nutNay" chỉ cần để tính vị trí đặt bảng màu cho đúng chỗ.
   4. (Tuỳ chọn) muốn nút tự đổi màu xem trước sau khi chọn — gắn thuộc tính
        data-colorpreview="hl"   hoặc   data-colorpreview="fc"
      lên nút đó trong HTML, file này sẽ tự cập nhật màu nền của nút.
   5. (Tuỳ chọn) nếu nút mở bảng màu nằm trong 1 menu/thanh mà app có logic
      "bấm ra ngoài thì đóng lại", thêm thuộc tính  data-colortrigger  lên nút
      đó để bảng màu không bị đóng nhầm ngay khi vừa mở.

   PHỤ THUỘC: KHÔNG cần app có sẵn hàm/biến gì — file này tự lo hết,
   tự chèn HTML bảng màu vào trang, tự áp màu bằng cách bọc đúng phần chữ
   đang bôi đen (giống cách Ống hút định dạng hoạt động), không dùng
   document.execCommand nên không bị mất focus/chọn nhầm vùng khác.

   LƯU Ý KHI SỬA: file này dùng chung cho cả 4 app — sửa ở đây là sửa cho
   TẤT CẢ app cùng lúc. Test kỹ ở 1 app trước khi coi là xong.
   ============================================================ */
(function(){

const COLOR_PALETTE=[
  // Đen – xám – trắng
  '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#efefef','#f3f3f3','#ffffff',
  // Đỏ thẫm → đỏ → cam → vàng → lục → lam → xanh → tím → hồng
  '#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff','#9900ff','#ff00ff',
  // Tông trung
  '#e06666','#f6b26b','#ffd966','#93c47d','#76d7ea','#6fa8dc','#6d9eeb','#8e7cc3','#c27ba0','#ea9999',
  // Nhạt hơn
  '#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e4f7','#cfe2f3','#d9d2e9','#ead1dc','#ffd0cc','#ffe8cc',
  // Rất nhạt (highlight)
  '#ffefef','#fff4e5','#fffde7','#f0fff0','#e0f7fa','#e3f2fd','#ede7f6','#fce4ec','#fff8e1','#f9fbe7',
  // Trung đậm
  '#cc0000','#e69138','#f1c232','#6aa84f','#45818e','#3d85c8','#3c78d8','#674ea7','#a64d79','#bf9000',
];
const DEFAULT_INK='#2A2722';

let _colorMode='hl', _savedRange=null, _built=false;

function ensurePopupDOM(){
  if(document.getElementById('colorPop')) return;
  const pop=document.createElement('div');
  pop.className='color-pop'; pop.id='colorPop';
  pop.innerHTML=`
    <div class="color-pop-title" id="colorPopTitle">Màu nền</div>
    <div class="color-grid" id="colorGrid"></div>
    <div class="color-custom">
      Tùy chọn: <input type="color" id="colorCustom" value="#ffffff">
      <button class="color-no-hl" id="colorNoHl">✕ Bỏ</button>
    </div>`;
  document.body.appendChild(pop);
}

function ensureBuilt(){
  if(_built) return; _built=true;
  ensurePopupDOM();
  const grid=document.getElementById('colorGrid');
  COLOR_PALETTE.forEach(c=>{
    const s=document.createElement('span'); s.style.background=c; s.dataset.c=c; s.title=c;
    s.addEventListener('mousedown',e=>{ e.preventDefault(); applyColorPick(c); });
    grid.appendChild(s);
  });
  const ci=document.getElementById('colorCustom');
  ci.addEventListener('input',()=>applyColorPick(ci.value));
  const nh=document.getElementById('colorNoHl');
  nh.addEventListener('mousedown',e=>{ e.preventDefault(); applyColorPick(_colorMode==='hl'?'transparent':DEFAULT_INK); });
  // đóng bảng màu khi bấm ra ngoài (trừ chính bảng màu và các nút có data-colortrigger)
  document.addEventListener('mousedown',e=>{
    const pop=document.getElementById('colorPop');
    if(pop && pop.classList.contains('show') && !pop.contains(e.target) && !e.target.closest('[data-colortrigger]'))
      pop.classList.remove('show');
  },true);
}

window.openColorPop=function(mode,trigger){
  ensureBuilt();
  _colorMode=mode;
  const sel=window.getSelection();
  if(sel && sel.rangeCount && !sel.isCollapsed) _savedRange=sel.getRangeAt(0).cloneRange();
  const pop=document.getElementById('colorPop'); if(!pop||!trigger) return;
  document.getElementById('colorPopTitle').textContent = mode==='hl' ? '🎨 Màu nền văn bản' : '🖊 Màu chữ';
  document.getElementById('colorNoHl').textContent = mode==='hl' ? '✕ Bỏ nền' : '↩ Mặc định';
  const r=trigger.getBoundingClientRect();
  pop.style.left=Math.max(4,Math.min(window.innerWidth-240,r.left))+'px';
  pop.style.top=(r.bottom+6)+'px';
  pop.classList.add('show');
};

function applyColorPick(color){
  if(_savedRange){
    try{
      const node=_savedRange.commonAncestorContainer.nodeType===1?_savedRange.commonAncestorContainer:_savedRange.commonAncestorContainer.parentElement;
      const ed=node&&node.closest?node.closest('[contenteditable="true"]'):null;
      if(ed){
        // AN TOÀN VỚI BẢNG: nếu vùng bôi đen "tràn" qua cả 1 cái bảng, KHÔNG bọc <span>
        // quanh toàn bộ (sẽ nhét <table> vào trong <span>, làm vỡ layout bảng) — chuyển
        // sang áp cho từng đoạn chữ riêng lẻ, bỏ qua khung bảng.
        let hasStructural=false;
        try{ const preview=_savedRange.cloneContents(); hasStructural=!!(preview.querySelector&&preview.querySelector("table,tr,td,th,thead,tbody,colgroup,ul,ol,li")); }catch(e){}

        if(_colorMode==='hl' && color==='transparent'){
          // BỎ NỀN: không chồng thêm lớp trong suốt lên trên (màu cũ vẫn hiện xuyên qua) —
          // phải XOÁ HẲN background-color khỏi mọi phần tử trong vùng bôi đen.
          if(hasStructural){
            removeBgFromTextNodesInRange(_savedRange);
          }else{
            const frag=_savedRange.extractContents();
            stripBackgroundColorDeep(frag);
            _savedRange.insertNode(frag);
          }
        }else{
          const styleObj=(_colorMode==='hl') ? {backgroundColor:color} : {color:color};
          if(hasStructural){
            applyStyleObjToTextNodesInRange(_savedRange,styleObj);
          } else {
            const span=document.createElement('span');
            Object.keys(styleObj).forEach(k=>{ span.style[k]=styleObj[k]; });
            span.appendChild(_savedRange.extractContents());
            _savedRange.insertNode(span);
          }
        }
        ed.dispatchEvent(new Event('input',{bubbles:true}));
      }
    }catch(e){}
  }
  const shown=(color==='transparent')?'#fff':color;
  if(_colorMode==='hl') document.querySelectorAll('[data-colorpreview="hl"]').forEach(el=>el.style.background=shown);
  else document.querySelectorAll('[data-colorpreview="fc"]').forEach(el=>el.style.background=color);
  const pop=document.getElementById('colorPop'); if(pop) pop.classList.remove('show');
}
// Xoá background-color khỏi CHÍNH phần tử này và MỌI phần tử con bên trong — dùng khi
// "Bỏ nền", để đảm bảo không còn màu nền nào sót lại ở bất kỳ lớp nào bên trong vùng đã chọn.
function stripBackgroundColorDeep(root){
  if(root.nodeType===1 && root.style && root.style.backgroundColor) root.style.backgroundColor='';
  if(root.querySelectorAll){
    root.querySelectorAll('[style*="background"]').forEach(el=>{ el.style.backgroundColor=''; });
  }
}
// Trường hợp vùng chọn tràn qua bảng/danh sách — bỏ nền theo từng đoạn chữ, đồng thời xoá
// luôn background-color của phần tử cha trực tiếp (nếu phần tử cha CHỈ bọc đúng đoạn chữ này).
function removeBgFromTextNodesInRange(range){
  const root=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  if(!root) return;
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
      const frag=r.extractContents();
      stripBackgroundColorDeep(frag);
      r.insertNode(frag);
      if(txt.parentElement && txt.parentElement.style && txt.parentElement.style.backgroundColor) txt.parentElement.style.backgroundColor='';
    }catch(e){}
  });
}

function applyStyleObjToTextNodesInRange(range,styleObj){
  const root=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  if(!root) return;
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
      const span=document.createElement('span');
      Object.keys(styleObj).forEach(k=>{ span.style[k]=styleObj[k]; });
      span.appendChild(r.extractContents());
      r.insertNode(span);
    }catch(e){}
  });
}

})();
