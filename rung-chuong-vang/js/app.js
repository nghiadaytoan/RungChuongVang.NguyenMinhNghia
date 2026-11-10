/* Kết nối mọi thứ lại: tab, thiết lập, màn mở màn, màn chơi, điện thoại. */
const App=(()=>{
  const G=Game.G;
  let cam=null,lastSent={},tabNow='setup';

  /* ================= tab ================= */
  function tab(t){
    tabNow=t;
    $$('section').forEach(s=>s.classList.toggle('on',s.id===t));
    $$('nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
    if(t==='cards')Cards.render($('#cardsGrid'),Bank.roster);
    if(t==='play'){renderAll();pairBox()}
  }

  /* ================= thiết lập ================= */
  function fillSetup(){
    $('#roster').value=Bank.roster.join('\n');
    $('#cTitle').value=Bank.cfg.title||'';
    $('#cSchool').value=Bank.cfg.school||'';
    $('#cSecs').value=Bank.cfg.secs||20;
    $('#cWarm').value=Bank.cfg.warm||0;
    $('#cShuffle').checked=!!Bank.cfg.shuffle;
    $('#cSound').checked=Bank.cfg.sound!==false;
    $('#logoWrap').innerHTML=Bank.cfg.logo
      ?`<img src="${Bank.cfg.logo}" style="height:64px" alt="logo">`
      :'<img src="img/logo-mau.svg" style="height:64px;opacity:.6" alt="logo mẫu">';
    summary();
  }
  function readSetup(){
    Bank.roster=$('#roster').value.split('\n').map(s=>s.trim()).filter(Boolean);
    Bank.cfg.title=$('#cTitle').value.trim()||'HỘI THI RUNG CHUÔNG VÀNG';
    Bank.cfg.school=$('#cSchool').value.trim();
    Bank.cfg.secs=Math.max(5,+$('#cSecs').value||20);
    Bank.cfg.warm=Math.max(0,Math.min(5,+$('#cWarm').value||0));
    Bank.cfg.shuffle=$('#cShuffle').checked;
    Bank.cfg.sound=$('#cSound').checked;
    Snd.enabled(Bank.cfg.sound);
    Bank.save();summary();
  }
  function summary(){
    const p=Bank.problems();
    $('#setupMsg').innerHTML=
      `<div class="hint">${Bank.roster.length} thí sinh · ${Bank.qs.length} câu hỏi `
      +`(${Bank.count('normal')} thường, ${Bank.count('rescue')} cứu trợ, ${Bank.count('final')} chuông vàng)</div>`
      +(p.length?`<div class="warn">${p.slice(0,4).map(esc).join('<br>')}</div>`:'');
  }
  function afterBankChange(){fillSetup();if(tabNow==='cards')Cards.render($('#cardsGrid'),Bank.roster)}

  /* ================= màn mở màn ================= */
  function openingShow(){
    readSetup();
    const n=Bank.roster.length;
    const cw=n<=12?210:n<=30?168:n<=60?140:118;
    $('#opening').style.setProperty('--cw',cw+'px');
    $('#oTitle').textContent=Bank.cfg.title;
    $('#oSchool').textContent=Bank.cfg.school||'';
    $('#oLogo').src=Bank.cfg.logo||'img/logo-mau.svg';
    $('#oCount').textContent=`${n} thí sinh · ${Bank.qs.length} câu hỏi`;
    $('#openGrid').innerHTML=Bank.roster.map((nm,i)=>
      `<div class="scard" style="animation-delay:${Math.min(i*45,1600)}ms">
        <span class="no">${i+1}</span><span class="nm">${esc(nm)}</span></div>`).join('');
    $('#opening').classList.add('on');
    Snd.unlock();
    Fx.fireworks($('#fw'));
  }
  function openingHide(){
    Fx.stopFireworks();
    $('#opening').classList.remove('on');
  }

  /* ================= màn chơi ================= */
  function renderAll(){renderStage();renderScan();renderTiles();sendState()}

  function renderStage(){
    const tag=$('#modeTag');
    if(G.phase==='idle'){tag.textContent='Chuẩn bị';tag.className='tag'}
    else if(G.phase==='ready'){tag.textContent='Sẵn sàng';tag.className='tag'}
    else if(G.phase==='over'){tag.textContent='Kết thúc';tag.className='tag final'}
    else{
      tag.textContent=G.mode==='warm'?'KHỞI ĐỘNG':G.mode==='rescue'?'PHAO HỒI SINH'
        :G.mode==='final'?'CHUÔNG VÀNG':'Câu '+G.round;
      tag.className='tag '+(G.mode==='normal'?'':G.mode);
    }
    $('#aliveTag').textContent=G.N0?`Còn lại ${Game.alive().length}/${G.N0}`:'';
    $('#msg').textContent=G.msg||'';
    clock();

    const q=G.cur;
    if(!q){
      $('#qtext').textContent=G.phase==='ready'
        ?'Sẵn sàng! Bấm “Câu hỏi đầu tiên”.'
        :'Bấm “Khai mạc” để bắt đầu một ván mới.';
      $('#qimg').innerHTML='';$('#opts').innerHTML='';
    }else{
      Tex.put($('#qtext'),q.text);
      $('#qimg').innerHTML=q.img?`<img src="${q.img}" alt="hình câu hỏi">`:'';
      const rev=G.phase==='reveal'||G.phase==='over';
      let dist=null,who='';
      if(rev&&G.dist){dist=G.dist;who='thí sinh'}
      else if(G.pollShown&&G.phase!=='poll'){
        dist=LET.map(L=>Object.values(G.poll).filter(v=>v===L).length);who='khán giả';
      }
      const tot=dist?dist.reduce((a,b)=>a+b,0):0;
      $('#opts').innerHTML=q.opts.map((o,i)=>{
        const pc=tot?Math.round(dist[i]*100/tot):0;
        const cls=rev?(LET[i]===q.ans?'right':'dim'):'';
        return `<div class="opt ${cls}"><div class="L">${LET[i]}</div>
          <span class="tx"><span class="ot"></span>${o.img?`<br><img src="${o.img}" alt="">`:''}</span>
          ${dist&&tot?`<span class="pct">${pc}% ${who}</span><div class="bar" style="width:${pc}%"></div>`:''}
        </div>`;
      }).join('');
      $$('#opts .ot').forEach((el,i)=>Tex.put(el,q.opts[i].t));
    }
    renderCtrls();
  }
  function clock(){
    const c=$('#clock');
    const run=G.phase==='collect'&&G.timeLeft>0;
    c.textContent=G.phase==='collect'?(G.timeLeft>0?G.timeLeft:'⏱'):'';
    c.className=run&&G.timeLeft<=5?'low':'';
  }
  function renderCtrls(){
    const b=(id,cls,txt)=>`<button class="btn ${cls}" id="${id}">${txt}</button>`;
    let h='';
    if(G.phase==='idle')h=b('cOpen','big','🎉 Khai mạc');
    else if(G.phase==='ready')h=b('cNext','big','Câu hỏi đầu tiên ▶');
    else if(G.phase==='collect'){
      if(Game.canLifeline())h+=b('cLife','alt','📊 Hỏi khán giả');
      h+=b('cDone','','✅ Xong – hiện lựa chọn');
    }
    else if(G.phase==='poll')h=b('cPoll','','Hiện bình chọn của khán giả');
    else if(G.phase==='choices')h=b('cRev','','🔔 Công bố đáp án');
    else if(G.phase==='reveal')h=b('cNext','','Tiếp tục ▶');
    else if(G.phase==='over')h=b('cPod','alt','🏅 Bảng vinh danh')+b('cOpen','','🔁 Chơi lại');
    $('#ctrls').innerHTML=h;
    const on=(id,f)=>{const e=$('#'+id);if(e)e.onclick=f};
    on('cOpen',()=>{Game.start();openingShow()});
    on('cNext',()=>Game.next());
    on('cDone',()=>Game.done());
    on('cRev',()=>Game.reveal());
    on('cLife',()=>Game.lifeline());
    on('cPoll',()=>Game.showPoll());
    on('cPod',showPodium);
  }
  function renderScan(){
    const bar=$('#scanBar'),live=G.phase==='collect'||G.phase==='poll';
    bar.classList.toggle('on',live);
    if(!live)return;
    const n=Game.nScanned(),t=Game.nTotal();
    $('#scanNum').innerHTML=`<b>${n}</b> / ${t}`;
    $('#scanWhat').textContent=G.phase==='poll'?'khán giả đã bình chọn':'thí sinh đã được quét';
    $('#scanFill').style.width=(t?Math.round(n*100/t):0)+'%';
  }
  function renderTiles(){
    const v=Game.votes();
    const main=Game.alive(),aud=Game.dead();
    const showPick=G.phase==='choices'||G.phase==='reveal'||G.phase==='over';
    const cell=(p,isAud)=>{
      let c='tile';
      if(isAud)c+=' out';
      if(G.result){
        if(G.result.right.includes(p.id))c+=' right';
        else if(G.result.wrong.includes(p.id))c+=' wrong';
      }
      if(G.back.has(p.id))c+=' back';
      if((G.phase==='collect'||G.phase==='poll')&&v[p.id])c+=' scanned';
      const pick=G.answers[p.id];
      return `<div class="${c}" data-id="${p.id}"><b>${p.id}</b>${esc(p.name)}
        ${showPick&&pick?`<span class="pk">${pick}</span>`:''}</div>`;
    };
    $('#tiles').innerHTML=main.map(p=>cell(p,false)).join('')||'<p class="hint">Chưa có thí sinh.</p>';
    $('#audience').innerHTML=aud.map(p=>cell(p,true)).join('');
    $('#audienceWrap').classList.toggle('on',aud.length>0);
    $('#audienceWrap').classList.toggle('hot',G.phase==='poll');
    $('#audCount').textContent=aud.length?`(${aud.length} bạn)`:'';
    $$('#tiles .tile,#audience .tile').forEach(t=>t.onclick=()=>Game.cycle(+t.dataset.id));
  }

  /* ================= hiệu ứng theo diễn biến ================= */
  function showPodium(){
    Fx.podium(Game.ranking(),G.ended==='thang',()=>{},()=>{Game.start();openingShow()});
  }
  Game.hooks({
    change:renderAll,
    clock(){clock();renderScan();sendState()},
    intro(mode,round){
      if(mode==='rescue'){Fx.sea(Game.dead().length,()=>{});return}
      if(mode==='warm')Fx.flash('Vòng khởi động','★','Trả lời sai cũng không bị loại');
      else if(mode==='final')Fx.flash('Câu hỏi','🔔','CHUÔNG VÀNG');
      else Fx.flash('Câu',String(round),'');
    },
    lifeline(){Fx.plane(()=>{})},
    graded(){
      if(!G.result)return;
      if(G.mode==='final')return;
      if(G.result.right.length)Snd.correct();
      if(G.result.wrong.length)setTimeout(()=>Snd.out(),380);
    },
    finish(success){
      setTimeout(()=>{
        if(success)Fx.bell(Game.alive().map(p=>p.name).join(', '),showPodium);
        else{Snd.wrong();setTimeout(showPodium,1200)}
      },1600);
    }
  });

  /* ================= camera trên máy tính ================= */
  function hostRead(id,letter){
    const r=Game.scan(id,letter),p=Game.P(id);
    if(r==='ok'){Snd.scanOk();log(`✅ #${id} ${p?p.name:''} → ${letter}`)}
    else if(r!=='dup')log(`⚠ #${id} ${p?p.name:''}: ${why(r)}`);
  }
  const why=r=>({locked:'đã chốt',phase:'chưa mở câu hỏi',noturn:'không đến lượt',
    unknown:'thẻ không có trong danh sách'}[r]||'không nhận');
  function log(t){
    const l=$('#log');
    l.innerHTML=esc(t)+'<br>'+l.innerHTML.split('<br>').slice(0,30).join('<br>');
  }
  function wireCam(){
    cam=QR.Cam($('#video'),hostRead);
    $('#camBtn').onclick=async()=>{
      Snd.unlock();
      if(cam.on){cam.stop();$('#camBtn').textContent='Bật camera';$('#camMsg').textContent='';return}
      const r=await cam.start();
      if(r==='ok'){$('#camBtn').textContent='Tắt camera';$('#camMsg').textContent='Đang quét…'}
      else if(r==='nolib')$('#camMsg').textContent='Chưa tải được thư viện đọc QR.';
      else $('#camMsg').textContent='Không mở được camera ở đây. Hãy dùng “Chụp thẻ”, hoặc quét bằng điện thoại.';
    };
    $('#photo').onchange=e=>{
      const f=e.target.files[0];e.target.value='';if(!f)return;
      QR.fromFile(f,hostRead,(n,err)=>{
        $('#camMsg').textContent=err||(n?`Đã đọc ${n} thẻ trong ảnh.`:'Không đọc được thẻ nào – thử chụp gần và sáng hơn.');
      });
    };
  }

  /* ================= điện thoại ================= */
  function pairBox(){
    const box=$('#pairBox');
    if(Link.kind==='room'){
      box.innerHTML='<p class="hint">📱 Mở đúng đường dẫn này trên điện thoại (cùng tài khoản claude.ai), '
        +'rồi mở <b>scan.html</b> hoặc bấm “Chế độ máy quét”. Kết quả hiện ngay ở đây.</p>'
        +'<a class="btn sm alt" href="scan.html" target="_blank" rel="noopener">Mở trang máy quét</a>';
      return;
    }
    if(Link.kind==='peer'&&Link.hostId){
      if(location.protocol==='file:'){
        box.innerHTML='<div class="warn">Trang đang mở từ file trên máy nên điện thoại không vào được. '
          +'Hãy đưa cả thư mục lên web (Netlify hoặc GitHub Pages) rồi mở bản trên web.</div>';
        return;
      }
      const base=location.href.replace(/[^/]*$/,'');
      const url=base+'scan.html#'+Link.hostId;
      const img=Cards.qrData(url,4);
      box.innerHTML=`<p class="hint">📱 <b>Ghép điện thoại:</b> mở camera điện thoại, quét mã này rồi bấm vào liên kết.</p>
        ${img?`<img src="${img}" alt="mã ghép cặp">`:''}<div class="url">${esc(url)}</div>`;
      return;
    }
    box.innerHTML='<p class="hint">Chưa kết nối được kênh cho điện thoại. Vẫn chơi bình thường bằng camera máy tính.</p>';
  }
  function linkStat(){
    const n=Link.nPeers();
    $('#linkStat').textContent=Link.kind
      ?(n?`📱 ${n} máy quét đã kết nối`:(Link.connected()?'📱 Chưa có máy quét':'🔴 Mất kết nối'))
      :'';
    if($('#pairBox'))pairBox();
  }
  function sendState(){
    if(!Link.kind)return;
    const live=G.phase==='collect'||G.phase==='poll';
    Link.send('state',{
      ph:G.phase,m:G.mode,r:G.round,
      n:Game.nScanned(),tt:Game.nTotal(),
      t:G.timeLeft,
      miss:live&&G.phase==='collect'?Game.missing().slice(0,14).map(p=>p.id+'. '+p.name.slice(0,24)):[],
      nmiss:live&&G.phase==='collect'?Game.missing().length:0,
      al:Game.alive().length,n0:G.N0,
      life:Game.canLifeline()?1:0,msg:String(G.msg||'').slice(0,160)
    });
  }
  function wireLink(){
    Link.on('scan',d=>{
      if(!d)return;
      const id=+d.id,L=String(d.l||'');
      const r=Game.scan(id,L),p=Game.P(id);
      if(r==='ok')Snd.scanOk();
      if(r!=='dup')log((r==='ok'?'✅ ':'⚠ ')+`#${id} ${p?p.name:''} `+(r==='ok'?'→ '+L:why(r)));
      Link.send('ack',{id,l:L,r,name:p?p.name.slice(0,30):''});
    });
    Link.on('cmd',d=>{
      const c=d&&d.c;
      if(c==='done')Game.done();
      else if(c==='reveal')Game.reveal();
      else if(c==='next')Game.next();
      else if(c==='life')Game.lifeline();
      else if(c==='poll')Game.showPoll();
      else if(c==='pod')showPodium();
      sendState();
    });
    Link.on('_join',()=>{linkStat();sendState()});
  }

  /* ================= chế độ trình chiếu ================= */
  function showMode(v){
    document.body.classList.toggle('show',v);
    if(v){
      tab('play');
      try{(document.documentElement.requestFullscreen||(()=>{})).call(document.documentElement)}catch(e){}
    }else{
      try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}
    }
  }

  /* ================= khởi động ================= */
  async function init(){
    await Bank.load();
    Snd.enabled(Bank.cfg.sound!==false);
    fillSetup();
    Editor.mount();
    wireCam();wireLink();
    QR.warmup().then(e=>{
      $('#engine').textContent = e==='zxing'
        ? '✅ Máy đọc quét được nhiều thẻ cùng lúc trong một ảnh.'
        : e==='jsqr'
        ? '⚠ Máy đọc nhiều thẻ không chạy được ở đây, nên mỗi ảnh chỉ đọc được MỘT thẻ. Hãy quét từng em.'
        : '⚠ Chưa tải được thư viện đọc mã QR.';
    });

    $$('nav button').forEach(b=>b.onclick=()=>{if(tabNow==='setup')readSetup();tab(b.dataset.tab)});
    ['#roster','#cTitle','#cSchool','#cSecs','#cWarm'].forEach(s=>$(s).onchange=readSetup);
    $('#cShuffle').onchange=readSetup;
    $('#cSound').onchange=readSetup;
    $('#genBtn').onclick=()=>{
      const n=Math.max(2,Math.min(200,+$('#genN').value||30));
      $('#roster').value=Array.from({length:n},(_,i)=>'Thí sinh '+(i+1)).join('\n');
      readSetup();
    };
    $('#logoFile').onchange=e=>{
      const f=e.target.files[0];e.target.value='';if(!f)return;
      readImage(f,320,(img,err)=>{
        if(err){$('#setupMsg').innerHTML='<div class="warn err">'+esc(err)+'</div>';return}
        Bank.cfg.logo=img;Bank.save();fillSetup();
      });
    };
    $('#logoDel').onclick=()=>{Bank.cfg.logo='';Bank.save();fillSetup()};
    $('#startBtn').onclick=()=>{readSetup();Game.start();openingShow()};
    $('#printBtn').onclick=()=>{try{window.print()}catch(e){
      $('#cardsMsg').textContent='Khung này không cho in. Hãy mở trang bằng Chrome rồi bấm Ctrl+P.'}};
    $('#oGo').onclick=()=>{openingHide();tab('play');showMode(true);Game.next()};
    $('#oBack').onclick=()=>{openingHide();tab('setup')};
    $('#showBtn').onclick=()=>showMode(!document.body.classList.contains('show'));
    $('#showExit').onclick=()=>showMode(false);
    $('#simBtn').onclick=()=>{
      if(G.phase==='collect'){
        Game.parts().forEach(p=>{
          if(!G.answers[p.id])Game.scan(p.id,Math.random()<.6?G.cur.ans:LET[(Math.random()*4)|0]);
        });
      }else if(G.phase==='poll'){
        Game.dead().forEach(p=>Game.scan(p.id,Math.random()<.62?G.cur.ans:LET[(Math.random()*4)|0]));
      }
    };
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){if(Fx.busy())Fx.close();else if(document.body.classList.contains('show'))showMode(false)}
      if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;
      if(e.code==='Space'||e.key==='Enter'){
        e.preventDefault();
        if(G.phase==='collect')Game.done();
        else if(G.phase==='choices')Game.reveal();
        else if(G.phase==='reveal'||G.phase==='ready')Game.next();
        else if(G.phase==='poll')Game.showPoll();
      }
    });
    document.addEventListener('click',()=>Snd.unlock(),{once:true});

    setInterval(()=>Game.tick(),1000);
    setInterval(()=>{linkStat();sendState()},3000);
    tab('setup');renderAll();
    await Link.init('host',null,linkStat);
    linkStat();pairBox();sendState();
  }
  return {init,tab,afterBankChange,showMode};
})();
window.App=App;
document.addEventListener('DOMContentLoaded',()=>App.init());
