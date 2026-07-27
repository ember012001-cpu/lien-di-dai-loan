/* ============================================================
   shared-vocab-review.js
   🔁 ÔN TẬP TỪ VỰNG — lõi xử lý dùng cho trang on-tap.html
   (tính lịch ôn kiểu lặp lại ngắt quãng, sinh câu hỏi trắc nghiệm tự động
    chấm điểm, cập nhật lịch ôn dựa trên kết quả — không cần tự đánh giá)

   NGUYÊN TẮC LỊCH ÔN: dùng lại đúng mốc 1/3/7/14/21/30/60/90/180 ngày đã
   quen thuộc (giống lịch ôn của bài đọc). Mỗi thẻ từ có rec.srs =
   {stage, nextReview, lastReviewed}. Trả lời ĐÚNG → tăng 1 mốc (ôn thưa
   hơn). Trả lời SAI → lùi 2 mốc, tối thiểu về mốc đầu (ôn lại sớm hơn).
   Từ CHƯA TỪNG ôn (không có rec.srs) luôn được coi là "đến hạn ngay".

   File này KHÔNG tự lưu dữ liệu — trang gọi nó tự chịu trách nhiệm gọi
   saveVocabBank()/lưu lại bank sau khi gradeAndReschedule() chạy xong.
   ============================================================ */
(function(){

const REPS=[1,3,7,14,21,30,60,90,180]; // ngày

function stripHtml(html){
  const d=document.createElement('div'); d.innerHTML=html||'';
  return (d.textContent||'').trim();
}
function shuffle(arr){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// ---- Từ này đã tới hạn ôn chưa? Chưa từng ôn -> luôn tới hạn ----
window.vocabIsDue=function(rec){
  if(!rec||!rec.srs||!rec.srs.nextReview) return true;
  return Date.now()>=rec.srs.nextReview;
};

// ---- Danh sách từ đến hạn ôn hôm nay (có nghĩa/cách dùng mới sinh được câu hỏi) ----
window.vocabGetDue=function(bank){
  return (bank||[]).filter(v=>v&&v.word&&window.vocabIsDue(v));
};

// ---- Gộp danh sách từ đến hạn theo TỪNG BÀI (để hiện "bài X có Y từ cần ôn") ----
// Trả về mảng [{app,itemId,itemTitle,words:[...]}], sắp xếp nhiều từ nhất trước.
// 1 từ có thể thuộc nhiều bài (xuất hiện ở nhiều nơi) -> được liệt vào TỪNG bài đó.
window.vocabGroupDueByItem=function(bank){
  const due=window.vocabGetDue(bank);
  const map=new Map();
  due.forEach(v=>{
    const occs=Array.isArray(v.occurrences)?v.occurrences:[];
    if(!occs.length){
      const key='__none__';
      if(!map.has(key)) map.set(key,{app:'',itemId:'',itemTitle:'(Chưa gắn với bài nào)',words:[]});
      map.get(key).words.push(v);
      return;
    }
    occs.forEach(o=>{
      if(!o||!o.itemId) return;
      const key=o.app+'|'+o.itemId;
      if(!map.has(key)) map.set(key,{app:o.app,itemId:o.itemId,itemTitle:o.itemTitle||'(chưa đặt tên)',words:[]});
      const grp=map.get(key);
      if(!grp.words.some(w=>w.id===v.id)) grp.words.push(v);
    });
  });
  return [...map.values()].sort((a,b)=>b.words.length-a.words.length);
};

// ---- Sinh 1 câu hỏi ngẫu nhiên (trong số các dạng có đủ dữ liệu) cho 1 từ ----
// bank: toàn bộ kho (để lấy phương án nhiễu). Trả về null nếu từ này thiếu dữ liệu
// tối thiểu để ra câu hỏi (chưa có "cách dùng/nghĩa" và không đủ từ khác để nhiễu).
window.vocabGenQuestion=function(word,bank){
  const withContent=(bank||[]).filter(v=>v&&v.word&&v.id!==word.id&&stripHtml(v.content));
  const hasOwnContent=!!stripHtml(word.content);
  const types=[];
  if(hasOwnContent && withContent.length>=1) types.push('meaning_choice','word_choice','listen_choice','true_false');
  if(hasOwnContent) types.push('type_answer');
  if(!types.length) return null;
  const type=types[Math.floor(Math.random()*types.length)];

  if(type==='meaning_choice'){
    const correct=stripHtml(word.content);
    const wrongPool=shuffle(withContent.map(v=>stripHtml(v.content)));
    const wrong=wrongPool.slice(0,Math.min(3,wrongPool.length));
    const options=shuffle([correct,...wrong]);
    return {type,word,promptHan:word.word,options,correctIndex:options.indexOf(correct)};
  }
  if(type==='word_choice'){
    const correct=word.word;
    const wrongPool=shuffle((bank||[]).filter(v=>v&&v.word&&v.id!==word.id).map(v=>v.word));
    const wrong=wrongPool.slice(0,Math.min(3,wrongPool.length));
    const options=shuffle([correct,...wrong]);
    return {type,word,promptMeaning:stripHtml(word.content),options,correctIndex:options.indexOf(correct)};
  }
  if(type==='listen_choice'){
    const correct=word.word;
    const wrongPool=shuffle((bank||[]).filter(v=>v&&v.word&&v.id!==word.id).map(v=>v.word));
    const wrong=wrongPool.slice(0,Math.min(3,wrongPool.length));
    const options=shuffle([correct,...wrong]);
    return {type,word,speak:word.word,options,correctIndex:options.indexOf(correct)};
  }
  if(type==='true_false'){
    const isTrue=Math.random()<0.5;
    let shown=stripHtml(word.content);
    if(!isTrue && withContent.length){
      shown=stripHtml(withContent[Math.floor(Math.random()*withContent.length)].content);
    }
    return {type,word,promptHan:word.word,shown,isTrue};
  }
  // type_answer
  return {type,word,promptMeaning:stripHtml(word.content),answer:word.word};
};

// ---- Chấm 1 câu (tuỳ dạng) — trả về true/false ----
window.vocabGradeAnswer=function(q,userAnswer){
  if(q.type==='meaning_choice'||q.type==='word_choice'||q.type==='listen_choice'){
    return userAnswer===q.correctIndex;
  }
  if(q.type==='true_false'){
    return userAnswer===q.isTrue;
  }
  if(q.type==='type_answer'){
    const norm=s=>String(s||'').trim();
    let a=norm(userAnswer), b=norm(q.answer);
    if(a===b) return true;
    // chấp nhận cả giản thể/phồn thể nếu opencc-js đã được nạp sẵn trên trang
    try{
      if(window.OpenCC){
        const s2t=window.OpenCC.Converter({from:'cn',to:'tw'});
        const t2s=window.OpenCC.Converter({from:'tw',to:'cn'});
        if(s2t(a)===b||t2s(a)===b||s2t(a)===s2t(b)) return true;
      }
    }catch(e){}
    return false;
  }
  return false;
};

// ---- Cập nhật lịch ôn của 1 thẻ từ dựa trên đúng/sai — KHÔNG tự lưu, trang tự gọi lưu ----
window.vocabRescheduleAfterAnswer=function(rec,correct){
  if(!rec) return;
  if(!rec.srs) rec.srs={stage:-1,nextReview:0};
  const cur=(typeof rec.srs.stage==='number')?rec.srs.stage:-1;
  rec.srs.stage=correct?Math.min(cur+1,REPS.length-1):Math.max(cur-2,0);
  const days=REPS[rec.srs.stage]||REPS[0];
  rec.srs.nextReview=Date.now()+days*86400000;
  rec.srs.lastReviewed=Date.now();
};

})();
