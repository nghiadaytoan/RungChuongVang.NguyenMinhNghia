/* Hiệu ứng: pháo hoa, chớp số câu, máy bay, biển & phao, chuông vàng, bục vinh danh. */
const Fx=(()=>{
  const fx=()=>document.getElementById('fx');
  let timer=null,confStop=true,fwStop=true;

  function open(cls,html){
    const el=fx();clearTimeout(timer);
    el.className='on';
    el.innerHTML=`<div class="sheet ${cls}">${html}</div>`;
    return el.firstElementChild;
  }
  function close(){
    const el=fx();clearTimeout(timer);confStop=true;
    el.className='';el.innerHTML='';
  }
  function busy(){return fx().className==='on'}

  /* ---------- pháo hoa hai bên (màn mở màn) ---------- */
  function fireworks(cv){
    if(!cv)return;
    let x=null;try{x=cv.getContext('2d')}catch(e){}
    if(!x)return;
    let shells=[],parts=[],last=0,next=0;
    fwStop=false;
    const COL=['#ffd35c','#ff6b6b','#5aa9ff','#6ff0a0','#ffffff','#ef8bff','#ffab4d'];
    function size(){cv.width=cv.clientWidth||innerWidth;cv.height=cv.clientHeight||innerHeight}
    size();
    const onR=()=>size();addEventListener('resize',onR);
    function launch(){
      const left=Math.random()<.5;
      const sx=left?cv.width*(.04+Math.random()*.1):cv.width*(.86+Math.random()*.1);
      const tx=left?cv.width*(.14+Math.random()*.26):cv.width*(.6+Math.random()*.26);
      const ty=cv.height*(.12+Math.random()*.28);
      shells.push({x:sx,y:cv.height+10,vx:(tx-sx)/70,vy:-(cv.height-ty)/70,
        c:COL[(Math.random()*COL.length)|0],life:70});
      if(window.Snd)Snd.launch();
    }
    function burst(s){
      const n=46+((Math.random()*26)|0);
      for(let i=0;i<n;i++){
        const a=Math.PI*2*i/n+Math.random()*.1,sp=1.6+Math.random()*3.4;
        parts.push({x:s.x,y:s.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
          c:Math.random()<.22?'#fff':s.c,life:52+((Math.random()*34)|0),age:0});
      }
      if(window.Snd)Snd.pop();
    }
    function loop(t){
      if(fwStop||!cv.isConnected){removeEventListener('resize',onR);return}
      requestAnimationFrame(loop);
      if(t-last<16)return;last=t;
      if(t>next){launch();next=t+520+Math.random()*820}
      x.globalCompositeOperation='source-over';
      x.fillStyle='rgba(10,18,48,.26)';x.fillRect(0,0,cv.width,cv.height);
      x.globalCompositeOperation='lighter';
      shells=shells.filter(s=>{
        s.x+=s.vx;s.y+=s.vy;s.vy+=.028;s.life--;
        x.fillStyle=s.c;x.beginPath();x.arc(s.x,s.y,2.4,0,7);x.fill();
        if(s.life<=0||s.vy>=0){burst(s);return false}
        return true;
      });
      parts=parts.filter(p=>{
        p.age++;p.x+=p.vx;p.y+=p.vy;p.vy+=.045;p.vx*=.986;p.vy*=.986;
        const k=1-p.age/p.life;
        if(k<=0)return false;
        x.globalAlpha=Math.max(0,k);
        x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,2.1,0,7);x.fill();
        x.globalAlpha=1;
        return true;
      });
    }
    requestAnimationFrame(loop);
  }
  function stopFireworks(){fwStop=true}

  /* ---------- pháo giấy ---------- */
  function confetti(host){
    const cv=document.createElement('canvas');
    cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none';
    host.appendChild(cv);
    let x=null;try{x=cv.getContext('2d')}catch(e){}
    if(!x)return;
    cv.width=cv.clientWidth||innerWidth;cv.height=cv.clientHeight||innerHeight;
    const COL=['#ffd35c','#ff6b6b','#5aa9ff','#6ff0a0','#ffffff','#ef8bff'];
    const ps=Array.from({length:190},()=>({
      x:Math.random()*cv.width,y:-Math.random()*cv.height,
      vx:(Math.random()-.5)*2.2,vy:2+Math.random()*4.4,
      s:5+Math.random()*9,r:Math.random()*6,vr:(Math.random()-.5)*.34,
      c:COL[(Math.random()*COL.length)|0]}));
    confStop=false;
    (function loop(){
      if(confStop||!cv.isConnected)return;
      requestAnimationFrame(loop);
      x.clearRect(0,0,cv.width,cv.height);
      ps.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
        if(p.y>cv.height+24){p.y=-24;p.x=Math.random()*cv.width}
        x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;
        x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore();
      });
    })();
  }

  /* ---------- chớp "CÂU 7" ---------- */
  function flash(label,num,sub,after){
    open('flash',`<div class="ring"></div><div class="k">
      <div class="kk">${esc(label)}</div><div class="kn">${esc(num)}</div>
      ${sub?`<div class="ks">${esc(sub)}</div>`:''}</div>`);
    if(window.Snd)Snd.pop();
    timer=setTimeout(()=>{close();if(after)after()},1500);
  }

  /* ---------- máy bay: trợ giúp từ khán giả ---------- */
  function plane(after){
    open('plane',`<div class="pg"><div class="bn">📊 TRỢ GIÚP TỪ KHÁN GIẢ</div>
      <img src="img/may-bay.svg" alt="máy bay"></div>`);
    if(window.Snd)Snd.whoosh();
    timer=setTimeout(()=>{close();if(after)after()},4000);
  }

  /* ---------- biển & Phao Hồi Sinh ---------- */
  function sea(nBack,after){
    const bub=Array.from({length:16},()=>{
      const d=7+Math.random()*20;
      return `<span class="bub" style="left:${(Math.random()*100).toFixed(1)}%;width:${d}px;height:${d}px;
        animation-duration:${(4+Math.random()*5).toFixed(1)}s;animation-delay:${(Math.random()*4).toFixed(1)}s"></span>`;
    }).join('');
    const sheet=open('sea',`
      <div class="ttl"><div class="t1">Vòng đặc biệt</div><div class="t2">PHAO HỒI SINH</div>
        <div class="t3">${esc(nBack)} thí sinh đã bị loại được quyền trả lời lại. Đúng thì trở lại cuộc chơi!</div></div>
      <img class="buoy" src="img/phao.svg" alt="phao cứu sinh">
      <div class="water"><div class="wl c"></div><div class="wl b"></div><div class="wl a"></div></div>
      ${bub}
      <div class="foot"><button class="btn big" id="fxGo">Bắt đầu vòng cứu trợ ▶</button></div>`);
    if(window.Snd){Snd.wave();setTimeout(()=>Snd.splash(),900)}
    const go=()=>{close();if(after)after()};
    sheet.querySelector('#fxGo').onclick=go;
    timer=setTimeout(go,9000);
  }

  /* ---------- chuông vàng ---------- */
  function bell(names,onNext){
    const sheet=open('cel',`<div class="rays"></div><div class="mid">
      <img class="bell" src="img/chuong-vang.svg" alt="chuông vàng">
      <h2>RUNG CHUÔNG VÀNG!</h2>
      <div class="who">${esc(names)}</div>
      <button class="btn big" id="fxNext">🏅 Bảng vinh danh ▶</button></div>`);
    confetti(sheet);
    if(window.Snd){Snd.bell();setTimeout(()=>Snd.fanfare(),700)}
    const go=()=>onNext&&onNext();
    sheet.querySelector('#fxNext').onclick=go;
    timer=setTimeout(go,8000);
  }

  /* ---------- bục vinh danh ---------- */
  function podium(groups,success,onClose,onAgain){
    const MD=['🥇','🥈','🥉'];
    const slot=i=>{
      const g=groups[i];
      if(!g)return '<div class="slot"></div>';
      const shown=g.names.slice(0,3).map(esc).join('<br>')+
        (g.names.length>3?`<br>+${g.names.length-3} bạn nữa`:'');
      return `<div class="slot p${i+1}">
        <div class="who"><div class="md">${MD[i]}</div><div class="nm">${shown}</div>
        <div class="sb">${esc(g.sub)}</div></div>
        <div class="blk">${i+1}</div></div>`;
    };
    const sheet=open('cel',`<div class="rays"></div><div class="pod"><div class="podIn">
      <h2>🏆 BẢNG VINH DANH</h2>
      ${success?'':'<div class="note">Chưa ai rung được chuông vàng lần này – đây là những bạn xuất sắc nhất!</div>'}
      <div class="steps">${slot(1)}${slot(0)}${slot(2)}</div>
      <div class="row" style="justify-content:center;margin-top:16px">
        <button class="btn alt" id="fxClose">Đóng</button>
        <button class="btn" id="fxAgain">🔁 Chơi lại</button></div>
    </div></div>`);
    confetti(sheet);
    if(window.Snd){
      setTimeout(()=>Snd.drum(),200);
      setTimeout(()=>Snd.fanfare(),2100);
      if(success)setTimeout(()=>Snd.bell(),2700);
    }
    sheet.querySelector('#fxClose').onclick=()=>{close();onClose&&onClose()};
    sheet.querySelector('#fxAgain').onclick=()=>{close();onAgain&&onAgain()};
  }

  return {open,close,busy,fireworks,stopFireworks,confetti,flash,plane,sea,bell,podium};
})();
window.Fx=Fx;
