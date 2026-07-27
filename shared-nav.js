/* ============================================================
   shared-nav.js
   🔗 Điều hướng liên app — dùng chung cho cả 4 app
   (khung "← Quay lại [app]" nổi góc dưới trái, khi nhảy từ app này
    sang app khác qua link ?open=id&word=word trong "Đã xuất hiện ở")

   CÁCH DÙNG TRONG 1 APP:
   1. Thêm <script src="shared-nav.js"></script> TRƯỚC script chính.
   2. App phải có sẵn biến toàn cục APP_LABEL (đã có sẵn ở cả 4 app).
   3. Khi cần nhảy sang app khác, gọi:
        navPushAndGo(url)
      (ghi nhớ app hiện tại vào ngăn xếp rồi chuyển trang thật).
   4. Lúc khởi động app (sau khi dữ liệu đã load xong), gọi:
        renderNavBackPill()
      để hiện khung "← Quay lại" nếu người dùng vừa nhảy từ app khác sang.

   Các hàm navBack()/navDismiss() và APP_FILE_MAP (bảng tên app → tên file)
   cũng được cung cấp sẵn ở đây, dùng chung không cần định nghĩa lại.

   LƯU Ý KHI SỬA: file này dùng chung cho cả 4 app — sửa ở đây là sửa cho
   TẤT CẢ app cùng lúc.
   ============================================================ */
(function(){

function escNav(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

window.NAV_STACK_KEY="han_nav_stack";
window.APP_FILE_MAP={
  "📖 Luyện đọc hiểu":"reader.html",
  "🎤 Luyện nói":"noi.html",
  "🎧 Luyện nghe":"tinh-nghe.html",
  "📝 Viết luận HSK":"SoLuyenViet_HSK.html"
};

window.navPushAndGo=function(url){
  try{
    const st=JSON.parse(sessionStorage.getItem(NAV_STACK_KEY)||"[]");
    st.push({label:(typeof APP_LABEL!=="undefined"?APP_LABEL:""),url:location.href});
    sessionStorage.setItem(NAV_STACK_KEY,JSON.stringify(st));
  }catch(e){}
  location.href=url;
};

window.navBack=function(){
  try{
    const st=JSON.parse(sessionStorage.getItem(NAV_STACK_KEY)||"[]");
    const last=st.pop();
    sessionStorage.setItem(NAV_STACK_KEY,JSON.stringify(st));
    if(last) location.href=last.url;
  }catch(e){}
};

window.navDismiss=function(){
  try{ sessionStorage.removeItem(NAV_STACK_KEY); }catch(e){}
  const el=document.getElementById("navBackPill"); if(el) el.remove();
};

window.renderNavBackPill=function(){
  let st=[]; try{ st=JSON.parse(sessionStorage.getItem(NAV_STACK_KEY)||"[]"); }catch(e){}
  if(!st.length) return;
  const last=st[st.length-1];
  const old=document.getElementById("navBackPill"); if(old) old.remove();
  const el=document.createElement("div"); el.id="navBackPill";
  el.style.cssText="position:fixed;left:14px;bottom:14px;z-index:99999;background:#1e2d21;color:#fff;border-radius:24px;padding:9px 14px;font-family:Quicksand,system-ui,sans-serif;font-size:13px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);cursor:pointer";
  el.innerHTML=`<span style="font-size:15px">←</span><span>Quay lại ${escNav(last.label)}</span><span id="navBackX" style="opacity:.6;margin-left:4px;padding:0 4px">✕</span>`;
  el.onclick=(e)=>{ if(e.target.id==="navBackX"){ e.stopPropagation(); navDismiss(); return; } navBack(); };
  document.body.appendChild(el);
};

})();
