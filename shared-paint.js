/* ============================================================
   shared-paint.js
   🖌 Ống hút định dạng (Format Painter) — dùng chung cho cả 4 app
   (bôi đen chữ đã đẹp → bấm 🖌 → bôi đen chỗ khác → dán định dạng ngay)

   CÁCH DÙNG TRONG 1 APP:
   1. Thêm <link rel="stylesheet" href="shared-paint.css"> trong <head>.
   2. Thêm <script src="shared-paint.js"></script> TRƯỚC script chính của app.
   3. Mỗi nút 🖌 của app (toolbar, chuột phải...) khi bấm gọi:
        togglePaintMode([nut1, nut2, ...])
      truyền vào TẤT CẢ nút 🖌 đang có trên trang lúc đó (để cùng sáng/tắt màu
      đồng bộ) — có thể chỉ 1 nút cũng được, VD togglePaintMode([myBtn]).
   4. Xong — không cần làm gì thêm, việc dán định dạng khi bôi đen chỗ khác
      được file này tự lo hoàn toàn.

   PHỤ THUỘC: nếu app có hàm toast(message) thì dùng hàm đó để báo, không có
   thì tự dùng alert() thay thế. Ngoài ra không đụng tới biến/hàm nào khác
   của app.

   LƯU Ý KHI SỬA: file này dùng chung cho cả 4 app — sửa ở đây là sửa cho
   TẤT CẢ app cùng lúc. Test kỹ ở 1 app trước khi coi là xong.
   ============================================================ */
(function(){

let paintFormat=null, paintModeOn=false, lastBtns=[];

function _msg(m){ if(typeof toast==="function") toast(m); else alert(m); }

function captureFormat(){
  const sel=window.getSelection();
  if(!sel||sel.rangeCount===0||sel.isCollapsed) return null;
  const range=sel.getRangeAt(0);
  const node=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
  if(!node) return null;
  const cs=getComputedStyle(node);
  return {fontWeight:cs.fontWeight,fontStyle:cs.fontStyle,textDecorationLine:cs.textDecorationLine,color:cs.color,backgroundColor:cs.backgroundColor,fontFamily:cs.fontFamily};
}

function setPaintMode(on,btnList){
  paintModeOn=on;
  document.body.classList.toggle("paint-mode",on);
  (btnList||[]).forEach(b=>{ if(b) b.classList.toggle("paint-on",on); });
}

window.togglePaintMode=function(btnList){
  lastBtns=btnList||[];
  if(!paintModeOn){
    const f=captureFormat();
    if(!f){ _msg("Hãy bôi đen chữ đã định dạng trước để sao chép."); return; }
    paintFormat=f; setPaintMode(true,lastBtns);
    _msg("Đang sao chép định dạng — bôi đen chỗ khác để dán, bấm 🖌 lần nữa hoặc Esc để tắt.");
  } else {
    paintFormat=null; setPaintMode(false,lastBtns);
  }
};

document.addEventListener("mouseup",()=>{
  if(!paintModeOn||!paintFormat) return;
  const sel=window.getSelection();
  if(!sel||sel.rangeCount===0||sel.isCollapsed) return;
  const range=sel.getRangeAt(0);
  const node=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  const ed=node&&node.closest?node.closest('[contenteditable="true"]'):null;
  if(!ed) return;
  const bold=parseInt(paintFormat.fontWeight)>=600||paintFormat.fontWeight==="bold";
  const styleObj={
    fontWeight:bold?"700":"400",
    fontStyle:paintFormat.fontStyle,
    textDecoration:paintFormat.textDecorationLine,
    color:paintFormat.color,
    fontFamily:paintFormat.fontFamily
  };
  if(paintFormat.backgroundColor&&!/rgba?\(0,\s*0,\s*0,\s*0\)/.test(paintFormat.backgroundColor)&&paintFormat.backgroundColor!=="transparent") styleObj.backgroundColor=paintFormat.backgroundColor;
  // AN TOÀN VỚI BẢNG: nếu vùng bôi đen "tràn" qua cả 1 cái bảng, KHÔNG bọc <span> quanh
  // toàn bộ (sẽ nhét <table> vào trong <span>, làm vỡ layout bảng) — chuyển sang áp cho
  // từng đoạn chữ riêng lẻ, bỏ qua khung bảng.
  let hasStructural=false;
  try{ const preview=range.cloneContents(); hasStructural=!!(preview.querySelector&&preview.querySelector("table,tr,td,th,thead,tbody,colgroup,ul,ol,li")); }catch(e){}
  try{
    if(hasStructural){
      applyStyleObjToTextNodesInRange(range,styleObj);
    } else {
      const span=document.createElement("span");
      Object.keys(styleObj).forEach(k=>{ span.style[k]=styleObj[k]; });
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
    }
  }catch(e){}
  ed.dispatchEvent(new Event("input",{bubbles:true}));
});

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
      const span=document.createElement("span");
      Object.keys(styleObj).forEach(k=>{ span.style[k]=styleObj[k]; });
      span.appendChild(r.extractContents());
      r.insertNode(span);
    }catch(e){}
  });
}

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&paintModeOn){ paintFormat=null; setPaintMode(false,lastBtns); }
});

})();
