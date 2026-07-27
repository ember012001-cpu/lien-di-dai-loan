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
    const span=document.createElement("span"); span.style[prop]=value;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    if(!opts.keepSelection){
      const sel=window.getSelection();
      sel.removeAllRanges();
      const r2=document.createRange(); r2.selectNodeContents(span); sel.addRange(r2);
    }
    ed.dispatchEvent(new Event("input",{bubbles:true}));
    return ed;
  }catch(e){ return null; }
};

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
