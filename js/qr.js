/* Đọc mã QR trên thẻ và suy ra đáp án từ hướng xoay của thẻ.
   Máy đọc chính là ZXing: đọc được NHIỀU thẻ trong cùng một ảnh.
   Nếu ZXing không chạy được thì dùng jsQR, nhưng jsQR chỉ đọc được một thẻ mỗi ảnh. */
const QR=(()=>{
  let cv=null,ctx=null,engine='',zxOn=null;

  function canvas(){
    if(!cv){
      cv=document.createElement('canvas');
      try{ctx=cv.getContext('2d',{willReadFrequently:true})}catch(e){ctx=null}
    }
    return cv;
  }
  function zx(){
    if(zxOn!==null)return zxOn;
    zxOn=false;
    if(typeof ZXingWASM!=='undefined'&&ZXingWASM&&ZXingWASM.readBarcodes){
      try{
        ZXingWASM.setZXingModuleOverrides({
          locateFile:(p,pre)=>/\.wasm$/.test(p)?'vendor/zxing_reader.wasm':(pre||'')+p
        });
        zxOn=true;
      }catch(e){zxOn=false}
    }
    return zxOn;
  }
  /* cạnh nào của thẻ đang ở phía trên thì đó là đáp án em chọn */
  function letterFrom(tl,tr){
    const a=Math.atan2(tr.y-tl.y,tr.x-tl.x)*180/Math.PI;
    const r=Math.round(a/90),tilt=Math.abs(a-90*r);
    if(tilt>32)return null;
    return {letter:['A','D','C','B'][((r%4)+4)%4],tilt};
  }

  /* ---- máy đọc nhiều mã: ZXing ---- */
  async function readZx(img){
    const res=await ZXingWASM.readBarcodes(
      {data:img.data,width:img.width,height:img.height},
      {formats:['QRCode'],maxNumberOfSymbols:120,tryHarder:true,tryInvert:false,tryRotate:true});
    const out=[];
    (res||[]).forEach(r=>{
      const p=r.position;if(!p||!p.topLeft||!p.topRight)return;
      const L=letterFrom(p.topLeft,p.topRight);if(!L)return;
      const m=/^GB(\d+)$/.exec(String(r.text||'').trim());if(!m)return;
      out.push({id:+m[1],letter:L.letter,tilt:L.tilt});
    });
    return out;
  }
  /* ---- máy đọc dự phòng: jsQR (một mã mỗi ảnh) ---- */
  function readJs(img){
    const out=[],d=new Uint8ClampedArray(img.data),w=img.width,h=img.height;
    for(let k=0;k<12;k++){
      let r=null;
      try{r=jsQR(d,w,h,{inversionAttempts:'dontInvert'})}catch(e){}
      if(!r||!r.location)break;
      const loc=r.location,L=letterFrom(loc.topLeftCorner,loc.topRightCorner);
      const m=/^GB(\d+)$/.exec(String(r.data||'').trim());
      if(m&&L)out.push({id:+m[1],letter:L.letter,tilt:L.tilt});
      const c=[loc.topLeftCorner,loc.topRightCorner,loc.bottomLeftCorner,loc.bottomRightCorner];
      const x0=Math.max(0,Math.floor(Math.min(...c.map(p=>p.x)))-5),
            x1=Math.min(w-1,Math.ceil(Math.max(...c.map(p=>p.x)))+5),
            y0=Math.max(0,Math.floor(Math.min(...c.map(p=>p.y)))-5),
            y1=Math.min(h-1,Math.ceil(Math.max(...c.map(p=>p.y)))+5);
      if(x1<=x0||y1<=y0)break;
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const o=(y*w+x)*4;d[o]=d[o+1]=d[o+2]=128;
      }
    }
    return out;
  }

  async function decode(img){
    if(zx()){
      try{const r=await readZx(img);engine='zxing';return r}
      catch(e){zxOn=false}
    }
    if(typeof jsQR==='function'){engine='jsqr';return readJs(img)}
    engine='';return [];
  }
  /* đọc từ <video> hoặc <img> */
  async function fromSource(src,sw,sh,maxPx){
    const c=canvas();if(!ctx||!sw||!sh)return [];
    const sc=Math.min(1,(maxPx||1280)/Math.max(sw,sh));
    const w=Math.max(1,Math.round(sw*sc)),h=Math.max(1,Math.round(sh*sc));
    c.width=w;c.height=h;
    try{ctx.drawImage(src,0,0,w,h)}catch(e){return []}
    let img;try{img=ctx.getImageData(0,0,w,h)}catch(e){return []}
    return decode(img);
  }
  /* nạp sẵn máy đọc để lần quét đầu không bị chậm */
  async function warmup(){
    const c=canvas();if(!ctx)return engine;
    c.width=c.height=32;
    try{ctx.fillStyle='#fff';ctx.fillRect(0,0,32,32);await decode(ctx.getImageData(0,0,32,32))}catch(e){}
    return engine;
  }

  /* camera trực tiếp.
     Thẻ đứng thẳng thì nhận ngay; thẻ còn nghiêng thì phải đọc được 2 lần giống nhau,
     để không nhận sai lúc học sinh đang xoay thẻ. */
  function Cam(video,onRead){
    let stream=null,timer=null,busy=false;const hist={};
    async function frame(){
      if(busy||video.readyState<2||!video.videoWidth)return;
      busy=true;
      try{
        const found=await fromSource(video,video.videoWidth,video.videoHeight,1280);
        found.forEach(f=>{
          const old=hist[f.id];
          if(old&&old.l===f.letter)old.n++;else hist[f.id]={l:f.letter,n:1};
          const cur=hist[f.id];
          if(cur.n>=2||(!old&&f.tilt<=12))onRead(f.id,f.letter);
        });
      }catch(e){}
      busy=false;
    }
    return {
      get on(){return !!stream},
      async start(){
        if(stream)return 'on';
        if(!zx()&&typeof jsQR!=='function')return 'nolib';
        try{
          stream=await navigator.mediaDevices.getUserMedia({
            video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
        }catch(e){stream=null;return 'denied'}
        video.srcObject=stream;
        try{await video.play()}catch(e){}
        timer=setInterval(frame,200);
        return 'ok';
      },
      stop(){
        if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
        clearInterval(timer);timer=null;
        try{video.srcObject=null}catch(e){}
      }
    };
  }
  /* đọc từ một ảnh chụp: nhận ngay */
  function fromFile(file,onRead,done){
    const im=new Image(),url=URL.createObjectURL(file);
    im.onload=async()=>{
      let f=[];
      try{f=await fromSource(im,im.width,im.height,2600)}catch(e){}
      const uniq={};f.forEach(x=>uniq[x.id]=x.letter);
      const ids=Object.keys(uniq);
      ids.forEach(id=>onRead(+id,uniq[id]));
      done(ids.length,ids.length?'':(engine?'':'Chưa tải được thư viện đọc QR.'));
      URL.revokeObjectURL(url);
    };
    im.onerror=()=>{done(0,'Không mở được ảnh.');URL.revokeObjectURL(url)};
    im.src=url;
  }
  return {letterFrom,fromSource,decode,warmup,Cam,fromFile,
    get engine(){return engine},get multi(){return engine==='zxing'}};
})();
window.QR=QR;
