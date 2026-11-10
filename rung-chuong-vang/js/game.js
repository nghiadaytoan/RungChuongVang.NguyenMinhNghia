/* Luật chơi Rung Chuông Vàng. */
const Game=(()=>{
  const G={
    players:[],N0:0,qs:[],used:new Set(),
    phase:'idle',mode:'normal',round:0,cur:null,
    answers:{},scanned:new Set(),poll:{},pollShown:false,
    rescueDone:false,lifelineUsed:false,warmLeft:0,
    timeLeft:0,secs:20,msg:'',result:null,dist:null,winner:null,
    back:new Set(),ended:''
  };
  let hooks={};

  const alive=()=>G.players.filter(p=>p.alive);
  const dead=()=>G.players.filter(p=>!p.alive);
  const P=id=>G.players.find(p=>p.id===id);
  const parts=()=>G.mode==='rescue'?dead():alive();
  const votes=()=>G.phase==='poll'?G.poll:G.answers;
  const emit=()=>{if(hooks.change)hooks.change()};

  function shuffled(a){
    const b=a.slice();
    for(let i=b.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[b[i],b[j]]=[b[j],b[i]]}
    return b;
  }
  /* dựng câu hỏi để trình chiếu (đảo đáp án nếu được bật) */
  function build(q){
    let items=q.opts.map((o,i)=>({...o,orig:LET[i]}));
    if(Bank.cfg.shuffle)items=shuffled(items);
    const k=items.findIndex(o=>o.orig===q.ans);
    return {q,text:q.text,img:q.img,tikz:q.tikz,opts:items,ans:LET[k<0?0:k]};
  }
  function pick(mode){
    const free=i=>!G.used.has(i);
    const want=mode==='warm'?'normal':mode;
    let i=G.qs.findIndex((q,i)=>q.type===want&&free(i));
    if(i<0&&want!=='normal')i=G.qs.findIndex((q,i)=>q.type==='normal'&&free(i));
    if(i<0)i=G.qs.findIndex((q,i)=>free(i));
    if(i<0)return null;
    G.used.add(i);return G.qs[i];
  }

  function start(){
    const names=Bank.roster.filter(n=>String(n).trim());
    G.players=names.map((n,i)=>({id:i+1,name:String(n).trim(),alive:true,out:0}));
    G.N0=G.players.length;
    G.qs=Bank.qs.map(q=>Bank.norm(q));
    G.used=new Set();
    G.phase='ready';G.mode='normal';G.round=0;G.cur=null;
    G.answers={};G.scanned=new Set();G.poll={};G.pollShown=false;
    G.rescueDone=false;G.lifelineUsed=false;
    G.warmLeft=Math.max(0,+Bank.cfg.warm||0);
    G.secs=Math.max(5,+Bank.cfg.secs||20);
    G.timeLeft=0;G.result=null;G.dist=null;G.winner=null;G.back=new Set();G.ended='';
    G.msg=`${G.N0} thí sinh vào cuộc.`+(G.warmLeft?` Bắt đầu bằng ${G.warmLeft} câu khởi động (không loại ai).`:'');
    emit();
  }

  /* chọn câu tiếp theo; gọi hooks.intro để chạy hoạt ảnh trước khi thu đáp án */
  function next(){
    if(G.phase==='over')return;
    const a=alive().length;
    let mode;
    if(G.warmLeft>0)mode='warm';
    else if(!G.rescueDone&&a<=Math.ceil(G.N0/3)&&dead().length>0)mode='rescue';
    else if(a===1)mode='final';
    else mode='normal';

    const q=pick(mode);
    if(!q){
      if(mode==='rescue'){G.rescueDone=true;return next()}
      if(mode==='warm'){G.warmLeft=0;return next()}
      G.phase='over';G.winner=alive().map(p=>p.id);G.ended='hetcauhoi';
      G.msg='Đã hết câu hỏi. Những thí sinh còn trụ lại là người chiến thắng.';
      emit();if(hooks.finish)hooks.finish(false);
      return;
    }
    if(mode==='rescue')G.rescueDone=true;
    if(mode==='warm')G.warmLeft--;

    G.mode=mode;G.cur=build(q);G.round++;
    G.answers={};G.scanned=new Set();G.poll={};G.pollShown=false;
    G.result=null;G.dist=null;G.back=new Set();
    G.timeLeft=q.secs||G.secs;
    if(mode==='final')G.timeLeft+=10;
    G.phase='collect';
    G.msg=mode==='warm'?'Câu khởi động – trả lời sai cũng không bị loại, cứ thoải mái!'
      :mode==='rescue'?'Vòng Phao Hồi Sinh: các bạn đã bị loại hãy giơ thẻ!'
      :mode==='final'?'Chỉ còn một thí sinh – CÂU HỎI CHUÔNG VÀNG!'
      :'Giơ thẻ lên: chữ cái của đáp án em chọn nằm ở cạnh trên.';
    emit();
    if(hooks.intro)hooks.intro(mode,G.round);
  }

  /* nhận một thẻ quét được */
  function scan(id,letter){
    const p=P(id);
    if(!p)return 'unknown';
    if(!LET.includes(letter))return 'unknown';
    if(G.phase==='collect'){
      if(!parts().includes(p))return 'noturn';
      const same=G.answers[id]===letter;
      G.answers[id]=letter;G.scanned.add(id);
      emit();return same?'dup':'ok';
    }
    if(G.phase==='poll'){
      if(p.alive)return 'noturn';
      const same=G.poll[id]===letter;
      G.poll[id]=letter;emit();
      return same?'dup':'ok';
    }
    return 'phase';
  }
  /* sửa bằng tay: bấm vào ô thí sinh để xoay A→B→C→D→bỏ */
  function cycle(id){
    const p=P(id);if(!p)return;
    if(G.phase==='collect'){
      if(!parts().includes(p))return;
      const k=LET.indexOf(G.answers[id]);
      if(k===3){delete G.answers[id];G.scanned.delete(id)}
      else{G.answers[id]=LET[k+1];G.scanned.add(id)}
    }else if(G.phase==='poll'){
      if(p.alive)return;
      const k=LET.indexOf(G.poll[id]);
      if(k===3)delete G.poll[id];else G.poll[id]=LET[k+1];
    }else return;
    emit();
  }

  const missing=()=>parts().filter(p=>!G.answers[p.id]);
  const nScanned=()=>G.phase==='poll'?Object.keys(G.poll).length:Object.keys(G.answers).length;
  const nTotal=()=>G.phase==='poll'?dead().length:parts().length;

  /* xong quét → hiện lựa chọn của từng thí sinh */
  function done(){
    if(G.phase!=='collect')return;
    G.phase='choices';
    const m=missing().length;
    G.msg=m?`Đã quét ${nScanned()}/${parts().length}. Còn ${m} em chưa quét được – bấm vào ô của em đó để chọn giúp, rồi công bố.`
           :'Mời cả lớp xem lựa chọn của nhau. Bấm “Công bố đáp án” khi sẵn sàng.';
    emit();
  }
  /* công bố đáp án đúng và loại người sai */
  function reveal(){
    if(G.phase!=='choices')return;
    const ans=G.cur.ans,ps=parts();
    const right=ps.filter(p=>G.answers[p.id]===ans),wrong=ps.filter(p=>G.answers[p.id]!==ans);
    G.result={right:right.map(p=>p.id),wrong:wrong.map(p=>p.id),cancel:false};
    G.dist=LET.map(L=>ps.filter(p=>G.answers[p.id]===L).length);
    G.phase='reveal';

    if(G.mode==='warm'){
      G.msg=`Câu khởi động: ${right.length}/${ps.length} em trả lời đúng. Chưa ai bị loại.`;
      G.result.wrong=[];
    }else if(G.mode==='normal'){
      if(!right.length){
        G.result.wrong=[];G.result.cancel=true;
        G.msg='Không ai trả lời đúng nên câu này được hủy – không ai bị loại.';
      }else{
        wrong.forEach(p=>{p.alive=false;p.out=G.round});
        G.msg=`${wrong.length} thí sinh bị loại. Còn lại ${alive().length}/${G.N0}.`;
      }
    }else if(G.mode==='rescue'){
      right.forEach(p=>{p.alive=true;p.out=0;G.back.add(p.id)});
      G.msg=right.length?`${right.length} thí sinh được hồi sinh! Còn lại ${alive().length}/${G.N0}.`
                        :'Không ai trả lời đúng nên không có thí sinh nào được hồi sinh.';
    }else{ /* final */
      G.phase='over';
      if(right.length){G.winner=right.map(p=>p.id);G.ended='thang';G.msg='🏆 RUNG CHUÔNG VÀNG THÀNH CÔNG!'}
      else{
        wrong.forEach(p=>{p.alive=false;p.out=G.round});
        G.winner=null;G.ended='truot';G.msg='Trả lời sai ở câu Chuông vàng – cuộc thi kết thúc.';
      }
    }
    emit();
    if(hooks.graded)hooks.graded();
    if(G.phase==='over'&&hooks.finish)hooks.finish(G.ended==='thang');
  }

  function canLifeline(){
    return G.mode==='final'&&G.phase==='collect'&&!G.lifelineUsed&&dead().length>0;
  }
  function lifeline(){
    if(!canLifeline())return;
    G.lifelineUsed=true;G.phase='poll';G.poll={};
    G.msg='Các bạn đã bị loại hãy giơ thẻ để gợi ý cho thí sinh cuối cùng!';
    emit();
    if(hooks.lifeline)hooks.lifeline();
  }
  function showPoll(){
    if(G.phase!=='poll')return;
    G.pollShown=true;G.phase='collect';
    G.msg='Đây là bình chọn của khán giả. Thí sinh hãy quyết định!';
    emit();
  }

  function tick(){
    if(G.phase!=='collect'||G.timeLeft<=0)return;
    G.timeLeft--;
    if(G.timeLeft<=0){
      G.msg='⏰ Hết giờ suy nghĩ! Mời các em giữ nguyên thẻ để được quét.';
      if(window.Snd)Snd.tick(true);
    }else if(G.timeLeft<=5&&window.Snd)Snd.tick(false);
    if(hooks.clock)hooks.clock();
  }

  /* xếp hạng 3 vị trí cho bảng vinh danh */
  function ranking(){
    const out=[],al=alive();
    if(al.length)out.push({ids:al.map(p=>p.id),
      sub:G.ended==='thang'?'Rung chuông vàng!':'Trụ lại đến cuối cùng'});
    const by={};
    dead().forEach(p=>{const r=p.out||0;(by[r]=by[r]||[]).push(p.id)});
    Object.keys(by).map(Number).sort((a,b)=>b-a).forEach(r=>{
      out.push({ids:by[r],sub:r?`Dừng ở câu ${r}`:'Đã bị loại'});
    });
    return out.slice(0,3).map(g=>({names:g.ids.map(i=>P(i).name),sub:g.sub}));
  }

  return {G,hooks:h=>{hooks=h},start,next,scan,cycle,done,reveal,
    lifeline,canLifeline,showPoll,tick,ranking,
    alive,dead,parts,votes,P,missing,nScanned,nTotal};
})();
window.Game=Game;
