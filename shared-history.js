/* ============================================================
   shared-history.js
   🕐 Điểm khôi phục — lưới an toàn khi thao tác hàng loạt
   (Ống hút định dạng, định dạng cả cột/hàng, hoặc bất kỳ chỉnh sửa nào)

   KHÁC VỚI Ctrl+Z: Ctrl+Z của trình duyệt mất ngay khi tải lại trang.
   File này lưu các "điểm khôi phục" vào localStorage — vẫn còn sau khi
   đóng trình duyệt, tắt máy, mở lại app.

   CÁCH HOẠT ĐỘNG:
   - Mỗi khi mở 1 bài, tự động lưu 1 điểm khôi phục "trước khi sửa gì".
   - Trong lúc sửa, cứ khoảng 60 giây có thay đổi thì tự lưu thêm 1 điểm
     (không lưu dồn dập, tránh đầy bộ nhớ).
   - Tối đa giữ 2 điểm gần nhất cho MỖI bài (đã giảm từ 6 xuống 2 để đỡ chiếm bộ nhớ trình
     duyệt) — điểm cũ nhất tự bị xoá khi có điểm mới hơn.
   - Bấm nút "🕐 Lịch sử" (app tự thêm) để xem danh sách & khôi phục.
   - Trước khi khôi phục, TỰ ĐỘNG lưu thêm 1 điểm của trạng thái hiện tại
     (phòng khi khôi phục nhầm, vẫn có đường quay lại).

   CÁCH DÙNG TRONG 1 APP:
   1. Thêm <script src="shared-history.js"></script> TRƯỚC script chính
      (không cần CSS riêng).
   2. Khi mở 1 bài (VD trong hàm openPassage/openEditor/openItem), gọi:
        historySnapshot(itemId, ()=>({...cur}))
      (dataGetter trả về 1 bản sao dữ liệu bài đó — càng đầy đủ càng tốt,
      khôi phục sẽ dùng đúng bản này).
   3. Trong listener "input" đang có sẵn để tự lưu, gọi thêm:
        historyMaybeSnapshot(itemId, ()=>({...cur}))
      (hàm tự biết có nên lưu thêm điểm mới hay chưa, không cần lo tần suất).
   4. Thêm 1 nút "🕐 Lịch sử" ở đâu đó trong giao diện, bấm vào gọi:
        historyPanel(itemId, (snapshotData)=>{
          Object.assign(cur, snapshotData);   // ghi đè lại đúng bài đang mở
          save(); renderXXX();                 // app tự vẽ lại + lưu
        });

   LƯU Ý: dataGetter nên trả về BẢN SAO (spread {...cur} hoặc
   JSON.parse(JSON.stringify(cur))) — không trả về thẳng object đang dùng,
   nếu không snapshot sẽ bị đổi theo khi cur đổi tiếp sau đó.

   LƯU Ý KHI SỬA: file này dùng chung cho cả 4 app.
   ============================================================ */
(function(){

const HIST_KEY="han_item_history_v1";
const MAX_PER_ITEM=2; // giảm từ 6 xuống 2 — đỡ chiếm bộ nhớ trình duyệt (dễ làm bài đọc/thẻ từ lưu không được nếu để nhiều)
const MIN_INTERVAL_MS=60000; // 60 giây

function loadAll(){
  try{ const raw=localStorage.getItem(HIST_KEY); return raw?JSON.parse(raw):{}; }catch(e){ return {}; }
}
function saveAll(obj){
  try{ localStorage.setItem(HIST_KEY, JSON.stringify(obj)); }
  catch(e){
    // hết bộ nhớ hay lỗi gì đó — đây chỉ là tính năng phụ, không được làm hỏng app chính,
    // nên im lặng bỏ qua, không alert/toast làm phiền người dùng.
  }
}

// DỌN 1 LẦN khi file này vừa tải lên: nếu dữ liệu cũ (từ trước khi giảm xuống còn 2 điểm/bài)
// vẫn còn giữ nhiều hơn MAX_PER_ITEM điểm cho 1 bài nào đó, cắt bớt ngay — giải phóng bộ nhớ
// ngay lập tức, không cần đợi có sửa đổi mới mới được dọn.
(function pruneOnLoad(){
  try{
    const all=loadAll();
    let changed=false;
    Object.keys(all).forEach(id=>{
      const list=all[id];
      if(Array.isArray(list)&&list.length>MAX_PER_ITEM){
        all[id]=list.slice(list.length-MAX_PER_ITEM);
        changed=true;
      }
    });
    if(changed) saveAll(all);
  }catch(e){}
})();

function fmtTime(ts){
  const d=new Date(ts);
  const now=new Date();
  const sameDay=d.toDateString()===now.toDateString();
  const hh=String(d.getHours()).padStart(2,"0"), mm=String(d.getMinutes()).padStart(2,"0");
  if(sameDay) return "Hôm nay "+hh+":"+mm;
  const y=new Date(now); y.setDate(now.getDate()-1);
  if(d.toDateString()===y.toDateString()) return "Hôm qua "+hh+":"+mm;
  return d.getDate()+"/"+(d.getMonth()+1)+" "+hh+":"+mm;
}

// Luôn lưu 1 điểm khôi phục mới ngay lúc gọi.
window.historySnapshot=function(itemId,dataGetter){
  if(!itemId||typeof dataGetter!=="function") return;
  let data; try{ data=dataGetter(); }catch(e){ return; }
  if(data===undefined||data===null) return;
  const all=loadAll();
  const list=Array.isArray(all[itemId])?all[itemId]:[];
  list.push({t:Date.now(),data});
  while(list.length>MAX_PER_ITEM) list.shift();
  all[itemId]=list;
  saveAll(all);
};

// Chỉ lưu nếu đã cách điểm gần nhất ít nhất MIN_INTERVAL_MS — dùng trong lúc gõ liên tục,
// tránh lưu dồn dập.
window.historyMaybeSnapshot=function(itemId,dataGetter){
  if(!itemId) return;
  const all=loadAll();
  const list=Array.isArray(all[itemId])?all[itemId]:[];
  const last=list[list.length-1];
  if(last && (Date.now()-last.t)<MIN_INTERVAL_MS) return;
  window.historySnapshot(itemId,dataGetter);
};

window.historyList=function(itemId){
  const all=loadAll();
  return (Array.isArray(all[itemId])?all[itemId]:[]).slice().reverse(); // mới nhất trước
};

// Hiện 1 popup nhỏ liệt kê các điểm khôi phục đã lưu cho itemId, bấm vào 1 điểm sẽ
// tự lưu thêm 1 điểm "trước khi khôi phục" (phòng khôi phục nhầm) rồi gọi onRestore(data).
window.historyPanel=function(itemId,onRestore,currentDataGetter){
  const items=window.historyList(itemId);
  let old=document.getElementById("historyPanelOverlay"); if(old) old.remove();
  const overlay=document.createElement("div"); overlay.id="historyPanelOverlay";
  overlay.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(30,25,20,.45);display:flex;align-items:center;justify-content:center";
  const box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:14px;max-width:420px;width:92%;max-height:80vh;overflow:auto;padding:16px;font-family:Quicksand,system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.3)";
  const rows=items.length?items.map((it,i)=>`
    <div class="hp-row" data-i="${i}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 8px;border-bottom:1px solid #eee2;cursor:pointer;border-radius:8px">
      <span style="font-size:13.5px;color:#2A2722">🕐 ${fmtTime(it.t)}</span>
      <button data-i="${i}" style="font-size:12px;padding:5px 10px;border:1px solid #2f6b5e;color:#2f6b5e;background:#fff;border-radius:6px;cursor:pointer">Khôi phục</button>
    </div>`).join("") : `<div style="font-size:13px;color:#8a8378;padding:14px 4px">Chưa có điểm khôi phục nào cho bài này. Điểm khôi phục sẽ tự lưu khi bạn mở bài và trong lúc chỉnh sửa.</div>`;
  box.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <h3 style="font-size:15px;margin:0;color:#2A2722">🕐 Điểm khôi phục của bài này</h3>
      <button id="hpClose" style="border:none;background:none;font-size:18px;cursor:pointer;color:#8a8378">×</button>
    </div>
    <div style="font-size:12px;color:#8a8378;margin-bottom:8px">Tự lưu khi mở bài, và mỗi ~1 phút khi có sửa đổi. Bấm "Khôi phục" sẽ tự lưu thêm 1 bản của trạng thái hiện tại trước, để có thể quay lại nếu khôi phục nhầm.</div>
    <div id="hpList">${rows}</div>`;
  overlay.appendChild(box); document.body.appendChild(overlay);
  overlay.addEventListener("click",e=>{ if(e.target===overlay) overlay.remove(); });
  box.querySelector("#hpClose").onclick=()=>overlay.remove();
  box.querySelectorAll("[data-i]").forEach(elx=>{
    elx.addEventListener("click",e=>{
      e.stopPropagation();
      const i=parseInt(elx.dataset.i,10);
      const snap=items[i]; if(!snap) return;
      if(!confirm("Khôi phục về thời điểm "+fmtTime(snap.t)+"? Trạng thái hiện tại sẽ được lưu lại trước khi khôi phục, vẫn quay lại được nếu cần.")) return;
      if(typeof currentDataGetter==="function") window.historySnapshot(itemId,currentDataGetter);
      overlay.remove();
      onRestore&&onRestore(snap.data);
    });
  });
};

})();
