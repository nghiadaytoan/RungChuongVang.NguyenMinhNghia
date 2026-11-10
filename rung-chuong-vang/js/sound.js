/* Âm thanh tổng hợp bằng WebAudio – không cần file nhạc nào. */
const Snd=(()=>{
  let ac=null,on=true,master=null;
  function ctx(){
    if(!ac){
      try{
        const C=window.AudioContext||window.webkitAudioContext;
        if(!C)return null;
        ac=new C();master=ac.createGain();master.gain.value=.85;master.connect(ac.destination);
      }catch(e){return null}
    }
    if(ac.state==='suspended')ac.resume().catch(()=>{});
    return ac;
  }
  function env(node,t,a,d,g){
    const v=ac.createGain();
    v.gain.setValueAtTime(.0001,t);
    v.gain.linearRampToValueAtTime(g,t+a);
    v.gain.exponentialRampToValueAtTime(.0001,t+a+d);
    node.connect(v);v.connect(master);return v;
  }
  function beep(f,at,dur,g,type){
    if(!on||!ctx())return;
    const t=ac.currentTime+at,o=ac.createOscillator();
    o.type=type||'sine';o.frequency.setValueAtTime(f,t);
    env(o,t,.008,dur,g==null?.2:g);o.start(t);o.stop(t+dur+.05);
  }
  function slide(f0,f1,at,dur,g,type){
    if(!on||!ctx())return;
    const t=ac.currentTime+at,o=ac.createOscillator();
    o.type=type||'sine';o.frequency.setValueAtTime(f0,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    env(o,t,.01,dur,g==null?.2:g);o.start(t);o.stop(t+dur+.05);
  }
  function noise(at,dur,f0,f1,g,q){
    if(!on||!ctx())return;
    const t=ac.currentTime+at,n=Math.floor(ac.sampleRate*Math.min(dur+.2,6));
    const b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    const s=ac.createBufferSource();s.buffer=b;
    const bp=ac.createBiquadFilter();bp.type='bandpass';bp.Q.value=q==null?1.1:q;
    bp.frequency.setValueAtTime(f0,t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);
    const v=ac.createGain();
    v.gain.setValueAtTime(.0001,t);
    v.gain.linearRampToValueAtTime(g==null?.18:g,t+dur*.35);
    v.gain.linearRampToValueAtTime(.0001,t+dur);
    s.connect(bp);bp.connect(v);v.connect(master);s.start(t);s.stop(t+dur+.1);
  }
  const API={
    enabled:v=>{if(v!==undefined){on=!!v;if(on)ctx()}return on},
    unlock(){ctx()},
    tick(last){ if(last){beep(1180,0,.09,.16,'square')} else beep(820,0,.055,.09,'square') },
    scanOk(){beep(1320,0,.07,.1,'triangle');beep(1760,.06,.09,.07,'triangle')},
    drum(){ // trống dồn
      if(!on||!ctx())return;
      for(let i=0;i<26;i++){const t=i*.055;noise(t,.05,160,90,.1+i*.004,1.6)}
      noise(1.5,.5,220,70,.3,1.1);
    },
    correct(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>beep(f,i*.085,.3,.2,'triangle'))},
    wrong(){slide(300,110,0,.55,.25,'sawtooth');noise(0,.35,420,120,.12,.8)},
    out(){slide(420,120,0,.42,.18,'square')},
    bell(){
      [0,.62,1.26,2.3].forEach(t=>{
        beep(440,t,2.7,.2,'sine');beep(440*2.76,t,1.7,.09,'sine');
        beep(440*5.4,t,.95,.045,'sine');
      });
    },
    whoosh(){noise(0,3.3,200,1700,.22,1.2);noise(1.6,1.8,1500,280,.16,1.2)},
    wave(){noise(0,2.6,320,140,.2,.5);noise(1.1,2.4,180,90,.16,.5);noise(.2,.5,900,400,.1,.9)},
    splash(){noise(0,.5,1400,420,.2,.7);beep(900,.02,.14,.08,'triangle')},
    pop(){ // pháo hoa nổ
      if(!on||!ctx())return;
      noise(0,.5,900,160,.14,.7);beep(160,0,.14,.1,'sine');
    },
    launch(){slide(160,620,0,.6,.06,'sine')},
    fanfare(){
      [[523.25,0],[659.25,.13],[783.99,.26],[1046.5,.39],[783.99,.56],[1046.5,.68]]
        .forEach(([f,t])=>{beep(f,t,.42,.18,'triangle');beep(f/2,t,.42,.08,'sine')});
    }
  };
  return API;
})();
window.Snd=Snd;
