/* ============================================================
   shared-tables.js
   ▦ Bảng biểu chèn vào bài — dùng chung cho reader.html và tinh-nghe.html
   (thêm/xoá hàng-cột, kéo giãn từng cột/hàng, chọn cả cột/hàng để định dạng
    hàng loạt, tự nâng cấp bảng dán từ Excel/Word)

   CÁCH DÙNG TRONG 1 APP:
   1. Thêm  <link rel="stylesheet" href="shared-tables.css">  trong <head>.
   2. Thêm  <script src="shared-tables.js"></script>  TRƯỚC script chính của app.
   3. App tự nút "▦ Bảng" riêng, khi bấm gọi:
        insertTableAt(ed, rows, cols)   // ed = vùng contenteditable đang focus
   4. Sau khi render nội dung có thể chứa bảng (bài mới mở, hoặc paste xong),
      gọi:  wireTablesIn(root)   // root = vùng contenteditable đó

   PHỤ THUỘC DUY NHẤT: app phải có sẵn hàm toast(message) để hiện thông báo
   nhỏ (VD "Bảng cần ít nhất 1 hàng."). Cả 4 app hiện tại đều đã có hàm này.
   Ngoài ra file này KHÔNG đụng tới bất kỳ biến/hàm nào khác của app — toàn bộ
   state bảng biểu tự quản lý riêng trong này.

   LƯU Ý KHI SỬA: file này dùng chung cho nhiều app — sửa ở đây là sửa cho
   TẤT CẢ app đang gắn nó cùng lúc. Test kỹ ở 1 app trước khi coi là xong.
   ============================================================ */
(function(){

// dùng chung 1 sự kiện "input" để báo cho app biết nội dung vừa đổi (app tự lưu)
function _fireInput(el){ if(el) el.dispatchEvent(new Event("input",{bubbles:true})); }
function _toast(msg){ if(typeof toast==="function") toast(msg); else console.warn(msg); }

function tableToolbarInnerHTML(){
  return `<button data-act="addRowAbove" title="Chèn hàng phía trên hàng đang bấm vào">⬆️ Hàng</button>
    <button data-act="addRowBelow" title="Chèn hàng phía dưới hàng đang bấm vào">⬇️ Hàng</button>
    <button data-act="delRow" title="Xoá hàng đang bấm vào" class="danger">➖ Hàng</button>
    <span class="ins-table-toolbar-sep"></span>
    <button data-act="addColLeft" title="Chèn cột bên trái cột đang bấm vào">⬅️ Cột</button>
    <button data-act="addColRight" title="Chèn cột bên phải cột đang bấm vào">➡️ Cột</button>
    <button data-act="delCol" title="Xoá cột đang bấm vào" class="danger">➖ Cột</button>
    <span class="ins-table-toolbar-sep"></span>
    <button data-act="delTable" class="danger">🗑 Xoá bảng</button>`;
}
function makeTableHTML(rows,cols){
  let colgroup="<colgroup>"+Array(cols).fill("<col>").join("")+"</colgroup>";
  let body="";
  for(let r=0;r<rows;r++){
    body+="<tr>";
    for(let c=0;c<cols;c++) body+='<td><br></td>';
    body+="</tr>";
  }
  return `<div class="ins-table-wrap"><div class="ins-table-toolbar" contenteditable="false">
    ${tableToolbarInnerHTML()}
  </div><table class="ins-table">${colgroup}<tbody>${body}</tbody></table></div><p><br></p>`;
}

window.insertTableAt=function(ed,rows,cols,preRange){
  if(!ed) return;
  ed.focus();
  let range=preRange;
  if(!range){
    const sel=window.getSelection();
    if(sel&&sel.rangeCount&&ed.contains(sel.getRangeAt(0).commonAncestorContainer)) range=sel.getRangeAt(0);
    else{ range=document.createRange(); range.selectNodeContents(ed); range.collapse(false); }
  }
  const tmp=document.createElement("div"); tmp.innerHTML=makeTableHTML(rows,cols);
  const frag=document.createDocumentFragment(); let node; while(node=tmp.firstChild) frag.appendChild(node);
  range.deleteContents(); range.insertNode(frag);
  _fireInput(ed); window.wireTablesIn(ed);
};

function tableAction(table,act,cell,wrap){
  const rows=[...table.rows];
  if(!cell) cell=table.querySelector("td,th");
  const tr=cell?cell.closest("tr"):rows[0];
  const cIdx=tr?[...tr.cells].indexOf(cell):0;
  const ncols=rows[0]?rows[0].cells.length:0;
  if(act==="addRowAbove"||act==="addRowBelow"){
    const newTr=document.createElement("tr");
    for(let i=0;i<ncols;i++){ const td=document.createElement("td"); td.innerHTML="<br>"; newTr.appendChild(td); }
    if(act==="addRowAbove") tr.before(newTr); else tr.after(newTr);
  }else if(act==="delRow"){
    if(rows.length<=1){ _toast("Bảng cần ít nhất 1 hàng."); return; }
    tr.remove();
  }else if(act==="addColLeft"||act==="addColRight"){
    rows.forEach(r=>{ const td=document.createElement("td"); td.innerHTML="<br>";
      const refCell=r.cells[cIdx];
      if(refCell){ if(act==="addColLeft") refCell.before(td); else refCell.after(td); }
      else r.appendChild(td); });
    const cg=table.querySelector("colgroup");
    if(cg){ const col=document.createElement("col"); const refCol=cg.children[cIdx];
      if(refCol){ if(act==="addColLeft") refCol.before(col); else refCol.after(col); }
      else cg.appendChild(col); }
  }else if(act==="delCol"){
    if(ncols<=1){ _toast("Bảng cần ít nhất 1 cột."); return; }
    rows.forEach(r=>{ if(r.cells[cIdx]) r.cells[cIdx].remove(); });
    const cg=table.querySelector("colgroup"); if(cg&&cg.children[cIdx]) cg.children[cIdx].remove();
  }else if(act==="delTable"){
    if(!confirm("Xoá cả bảng này?")) return;
    const ed=wrap.closest('[contenteditable="true"]'); wrap.remove(); if(ed) _fireInput(ed); return;
  }
  addColResizeHandles(table); addRowResizeHandles(table);
  clearBulkSelection(table);
  if(wrap.classList.contains("active")) layoutHeaders(table);
  const ed=wrap.closest('[contenteditable="true"]'); if(ed) _fireInput(ed);
}

function addColResizeHandles(table){
  const cg=table.querySelector("colgroup"); const firstRow=table.querySelector("tr"); if(!cg||!firstRow) return;
  [...firstRow.cells].forEach((cell,i)=>{
    // Dọn tay cầm CŨ trước khi tạo mới: tay cầm có thể đã bị lưu lẫn vào nội dung bài từ lần
    // trước (nó là 1 phần tử DOM thật trong ô, nên khi lưu innerHTML sẽ lưu luôn) — nhưng lưu
    // HTML KHÔNG lưu được sự kiện bấm/kéo gắn bằng JS, nên tay cầm cũ tải lại sẽ trông có vẻ có
    // nhưng bấm/kéo không có tác dụng gì. Luôn xoá cũ + tạo mới để chắc chắn có sự kiện đầy đủ.
    cell.querySelectorAll(".col-resize").forEach(h=>h.remove());
    const h=document.createElement("span"); h.className="col-resize"; h.contentEditable="false";
    cell.appendChild(h);
    h.addEventListener("mousedown",e=>{
      e.preventDefault(); e.stopPropagation();
      const startX=e.clientX, startW=cell.getBoundingClientRect().width, col=cg.children[i];
      const startTableW=table.getBoundingClientRect().width;
      table.style.width=startTableW+"px"; // khoá độ rộng bảng lại thành số cụ thể để tự phình/co theo cột đang kéo, không đụng cột khác
      document.body.classList.add("tbl-dragging"); // khoá chọn chữ toàn trang trong lúc kéo, tránh trình duyệt tự bôi đen lung tung
      function onMove(ev){
        const delta=ev.clientX-startX;
        const w=Math.max(30,startW+delta);
        if(col) col.style.width=w+"px";
        table.style.width=Math.max(120,startTableW+delta)+"px";
      }
      function onUp(){ document.removeEventListener("mousemove",onMove); document.removeEventListener("mouseup",onUp);
        document.body.classList.remove("tbl-dragging");
        const ed=table.closest('[contenteditable="true"]'); if(ed) _fireInput(ed);
        if(table.closest(".ins-table-wrap.active")) layoutHeaders(table); }
      document.addEventListener("mousemove",onMove); document.addEventListener("mouseup",onUp);
    });
  });
}

function addRowResizeHandles(table){
  [...table.rows].forEach(row=>{
    const lastCell=row.cells[row.cells.length-1]; if(!lastCell) return;
    lastCell.querySelectorAll(".row-resize").forEach(h=>h.remove()); // dọn tay cầm cũ, lý do như trên
    const h=document.createElement("span"); h.className="row-resize"; h.contentEditable="false";
    lastCell.appendChild(h);
    h.addEventListener("mousedown",e=>{
      e.preventDefault(); e.stopPropagation();
      const startY=e.clientY, startH=row.getBoundingClientRect().height;
      document.body.classList.add("tbl-dragging");
      function onMove(ev){ const hh=Math.max(24,startH+(ev.clientY-startY)); row.style.height=hh+"px"; }
      function onUp(){ document.removeEventListener("mousemove",onMove); document.removeEventListener("mouseup",onUp);
        document.body.classList.remove("tbl-dragging");
        const ed=table.closest('[contenteditable="true"]'); if(ed) _fireInput(ed);
        if(table.closest(".ins-table-wrap.active")) layoutHeaders(table); }
      document.addEventListener("mousemove",onMove); document.addEventListener("mouseup",onUp);
    });
  });
}

// ---- Dấu ☰ chọn nhanh cả cột / cả hàng để định dạng hàng loạt ----
function layoutHeaders(table){
  const wrap=table.closest(".ins-table-wrap"); if(!wrap) return;
  let colBox=wrap.querySelector(".col-picks"), rowBox=wrap.querySelector(".row-picks");
  if(!colBox){ colBox=document.createElement("div"); colBox.className="col-picks"; colBox.contentEditable="false"; wrap.appendChild(colBox); }
  if(!rowBox){ rowBox=document.createElement("div"); rowBox.className="row-picks"; rowBox.contentEditable="false"; wrap.appendChild(rowBox); }
  colBox.innerHTML=""; rowBox.innerHTML="";
  const wrapRect=wrap.getBoundingClientRect(), tableRect=table.getBoundingClientRect();
  const offsetTop=tableRect.top-wrapRect.top, offsetLeft=tableRect.left-wrapRect.left;
  colBox.style.position="absolute"; colBox.style.top=(offsetTop-20)+"px"; colBox.style.left=offsetLeft+"px"; colBox.style.height="18px";
  rowBox.style.position="absolute"; rowBox.style.top=offsetTop+"px"; rowBox.style.left=(offsetLeft-20)+"px"; rowBox.style.width="18px";
  const firstRow=table.querySelector("tr");
  const cols=firstRow?[...firstRow.cells]:[];
  let leftAcc=0;
  cols.forEach((cell,i)=>{
    const w=cell.getBoundingClientRect().width;
    const h=document.createElement("div"); h.className="col-pick"; h.textContent="☰"; h.title="Chọn cả cột này — dùng thanh nhỏ hiện ra bên dưới để định dạng (không dùng thanh công cụ chính)";
    h.style.left=leftAcc+"px"; h.style.width=w+"px"; h.style.top="0"; h.style.height="18px";
    h.addEventListener("mousedown",e=>e.preventDefault());
    h.addEventListener("click",e=>{ e.stopPropagation(); selectColumn(table,i); });
    colBox.appendChild(h); leftAcc+=w;
  });
  const rows=[...table.rows]; let topAcc=0;
  rows.forEach((row,i)=>{
    const rh=row.getBoundingClientRect().height;
    const h=document.createElement("div"); h.className="row-pick"; h.textContent="☰"; h.title="Chọn cả hàng này — dùng thanh nhỏ hiện ra bên dưới để định dạng (không dùng thanh công cụ chính)";
    h.style.top=topAcc+"px"; h.style.height=rh+"px"; h.style.left="0"; h.style.width="18px";
    h.addEventListener("mousedown",e=>e.preventDefault());
    h.addEventListener("click",e=>{ e.stopPropagation(); selectRow(table,i); });
    rowBox.appendChild(h); topAcc+=rh;
  });
}

function selectColumn(table,idx){
  clearBulkSelection(table);
  const cells=[]; [...table.rows].forEach(row=>{ const c=row.cells[idx]; if(c) cells.push(c); });
  cells.forEach(c=>c.classList.add("tbl-cell-selected"));
  table._bulkCells=cells; showBulkToolbar(table);
}
function selectRow(table,idx){
  clearBulkSelection(table);
  const row=table.rows[idx]; const cells=row?[...row.cells]:[];
  cells.forEach(c=>c.classList.add("tbl-cell-selected"));
  table._bulkCells=cells; showBulkToolbar(table);
}
function clearBulkSelection(table){
  if(!table) return;
  table.querySelectorAll(".tbl-cell-selected").forEach(c=>c.classList.remove("tbl-cell-selected"));
  table._bulkCells=null;
  const bt=document.getElementById("bulkToolbar"); if(bt) bt.classList.remove("show");
}
function showBulkToolbar(table){
  const bt=document.getElementById("bulkToolbar"); const wrap=table.closest(".ins-table-wrap"); if(!bt||!wrap) return;
  const tableRect=table.getBoundingClientRect();
  // #bulkToolbar nằm ngoài .ins-table-wrap (gắn thẳng vào <body>) và dùng position:fixed —
  // toạ độ phải lấy TRỰC TIẾP theo khung nhìn (viewport), không được trừ theo wrap
  // (trước đây trừ nhầm theo wrap khiến thanh này bị đặt sai chỗ, trốn mất/bị đè khuất).
  let top=tableRect.top-46, left=tableRect.left;
  // ghim lại trong khung nhìn để không bao giờ bị trôi ra ngoài màn hình (VD bảng ở sát mép trên)
  top=Math.max(6,Math.min(window.innerHeight-46,top));
  left=Math.max(6,Math.min(window.innerWidth-260,left));
  bt.style.top=top+"px";
  bt.style.left=left+"px";
  bt._table=table;
  bt.classList.add("show");
}
function applyBulkStyle(prop,value){
  const bt=document.getElementById("bulkToolbar"); const table=bt&&bt._table; if(!table||!table._bulkCells) return;
  table._bulkCells.forEach(cell=>{
    const span=document.createElement("span"); span.style[prop]=value;
    while(cell.firstChild) span.appendChild(cell.firstChild);
    cell.appendChild(span);
  });
  const ed=table.closest('[contenteditable="true"]'); if(ed) _fireInput(ed);
}
// đơn giản: luôn set giá trị "on" (đậm/nghiêng/gạch chân). Muốn tắt cho 1 vài ô thì tự sửa tay ô đó.
function applyBulkToggle(prop,onVal){ applyBulkStyle(prop,onVal); }

// ---- Bảng dán từ ngoài (Excel/Word...) + gắn nút điều khiển cho mọi bảng trong root ----
window.wireTablesIn=function(root){
  if(!root) return;
  root.querySelectorAll("table:not(.ins-table)").forEach(table=>{
    if(table.closest(".ins-table-wrap")) return;
    table.classList.add("ins-table");
    const firstRow=table.querySelector("tr");
    const ncols=firstRow?firstRow.cells.length:0;
    // đo độ rộng THẬT của từng cột (Excel/Word thường tự set width riêng từng ô, không qua colgroup)
    // trước khi can thiệp, để cột không bị nhảy/lệch khi chuyển sang cơ chế colgroup có thể kéo giãn
    const measured=firstRow?[...firstRow.cells].map(c=>c.getBoundingClientRect().width||90):[];
    table.style.tableLayout="fixed"; table.style.width="";
    const oldCg=table.querySelector("colgroup"); if(oldCg) oldCg.remove();
    const cg=document.createElement("colgroup");
    for(let i=0;i<ncols;i++){ const col=document.createElement("col"); col.style.width=Math.round(measured[i]||90)+"px"; cg.appendChild(col); }
    table.insertBefore(cg,table.firstChild);
    // gỡ width cố định trên từng ô (thuộc tính width= hoặc style width) để không đánh nhau với colgroup
    table.querySelectorAll("td,th").forEach(cell=>{ cell.removeAttribute("width"); cell.style.width=""; });
    const wrap=document.createElement("div"); wrap.className="ins-table-wrap";
    const toolbar=document.createElement("div"); toolbar.className="ins-table-toolbar"; toolbar.contentEditable="false";
    toolbar.innerHTML=tableToolbarInnerHTML();
    table.parentNode.insertBefore(wrap,table);
    wrap.appendChild(toolbar); wrap.appendChild(table);
  });
  root.querySelectorAll(".ins-table-wrap").forEach(wrap=>{
    const table=wrap.querySelector("table"); if(!table) return;
    if(!wrap._tblWired){
      // DỌN DẸP lần đầu gặp wrap này: dấu ☰ chọn cột/hàng và trạng thái "đang mở" (active) có thể
      // đã bị lưu lẫn vào nội dung bài từ trước (chúng là phần tử DOM thật, gõ chữ → lưu HTML là
      // lưu luôn chúng) — nếu không dọn, chúng hiện ra ở vị trí cũ/sai và không hoạt động, vì lưu
      // HTML không lưu được sự kiện bấm/kéo gắn bằng JS. Luôn bắt đầu từ trạng thái "chưa mở, sạch".
      wrap.classList.remove("active");
      wrap.querySelectorAll(".col-picks,.row-picks").forEach(el=>el.remove());
      // LÀM MỚI thanh nút: bảng được TẠO TỪ TRƯỚC khi có bản cập nhật này vẫn còn giữ nguyên
      // thanh nút CŨ đã lưu sẵn trong nội dung bài (VD chỉ có "➕ Hàng" kiểu cũ, chưa có
      // ⬆️/⬇️/⬅️/➡️) — luôn ghi đè lại đúng bộ nút mới nhất mỗi khi trang tải lên, để bảng cũ
      // cũng tự động có đủ nút mới, không cần tạo lại bảng.
      const oldToolbar=wrap.querySelector(".ins-table-toolbar");
      if(oldToolbar) oldToolbar.innerHTML=tableToolbarInnerHTML();
    }
    addColResizeHandles(table); addRowResizeHandles(table);
    if(wrap._tblWired) return; wrap._tblWired=true;
    table.addEventListener("mouseup",e=>{ const td=e.target.closest("td,th"); if(td) table._lastCell=td; });
    table.addEventListener("click",e=>{ const td=e.target.closest("td,th"); if(td) table._lastCell=td; });
    wrap.addEventListener("click",()=>{
      document.querySelectorAll(".ins-table-wrap.active").forEach(w=>{if(w!==wrap){w.classList.remove("active");clearBulkSelection(w.querySelector("table"));}});
      wrap.classList.add("active");
      layoutHeaders(table);
    });
    const toolbar=wrap.querySelector(".ins-table-toolbar");
    toolbar.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("mousedown",e=>e.preventDefault());
      btn.addEventListener("click",e=>{ e.stopPropagation(); tableAction(table,btn.dataset.act,table._lastCell||table.querySelector("td,th"),wrap); });
    });
  });
};

document.addEventListener("click",e=>{
  document.querySelectorAll(".ins-table-wrap.active").forEach(w=>{
    if(!w.contains(e.target)&&!e.target.closest("#bulkToolbar")){ w.classList.remove("active"); clearBulkSelection(w.querySelector("table")); }
  });
});

// ---- tự tạo khung "thanh định dạng hàng loạt" 1 lần, gắn thẳng vào trang ----
function initBulkToolbar(){
  if(document.getElementById("bulkToolbar")) return;
  const bt=document.createElement("div");
  bt.className="bulk-toolbar"; bt.id="bulkToolbar";
  bt.innerHTML=`
    <button data-bf="bold" title="Đậm"><b>B</b></button>
    <button data-bf="italic" title="Nghiêng"><i>I</i></button>
    <button data-bf="underline" title="Gạch chân"><u>U</u></button>
    <div class="bt-sep"></div>
    <select id="bulkFont" title="Kiểu chữ cho cả cột/hàng">
      <option value="">Kiểu chữ…</option>
      <option value="'KaiTi','楷体',serif">楷体 Kaiti</option>
      <option value="'Quicksand',sans-serif">Quicksand</option>
      <option value="'SimSun','宋体',serif">宋体 SimSun</option>
      <option value="'YaHei','微软雅黑',sans-serif">黑体 YaHei</option>
    </select>
    <div class="bt-sep"></div>
    <span>Nền</span><input type="color" id="bulkBg" value="#fff3a3" title="Màu nền cho cả cột/hàng">
    <span>Chữ</span><input type="color" id="bulkFc" value="#2a2722" title="Màu chữ cho cả cột/hàng">
    <div class="bt-sep"></div>
    <button id="bulkClose" title="Bỏ chọn">✕</button>`;
  document.body.appendChild(bt);
  bt.querySelectorAll("[data-bf]").forEach(b=>{
    b.addEventListener("mousedown",e=>e.preventDefault());
    b.addEventListener("click",()=>{
      if(b.dataset.bf==="bold") applyBulkToggle("fontWeight","700");
      else if(b.dataset.bf==="italic") applyBulkToggle("fontStyle","italic");
      else if(b.dataset.bf==="underline") applyBulkToggle("textDecoration","underline");
    });
  });
  bt.querySelector("#bulkFont").addEventListener("mousedown",e=>e.stopPropagation());
  bt.querySelector("#bulkFont").addEventListener("change",e=>{
    if(e.target.value) applyBulkStyle("fontFamily",e.target.value);
    e.target.selectedIndex=0;
  });
  bt.querySelector("#bulkBg").addEventListener("input",e=>applyBulkStyle("backgroundColor",e.target.value));
  bt.querySelector("#bulkFc").addEventListener("input",e=>applyBulkStyle("color",e.target.value));
  const closeBtn=bt.querySelector("#bulkClose");
  closeBtn.addEventListener("mousedown",e=>e.preventDefault());
  closeBtn.addEventListener("click",()=>{ if(bt._table) clearBulkSelection(bt._table); });
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initBulkToolbar);
else initBulkToolbar();

// nếu người dùng paste ảnh/bảng trực tiếp vào 1 vùng contenteditable, tự nâng cấp bảng vừa dán
document.addEventListener("input",e=>{
  const ed=e.target;
  if(ed && ed.isContentEditable && ed.querySelector && ed.querySelector("table:not(.ins-table)")){
    window.wireTablesIn(ed);
  }
},true);

})();
