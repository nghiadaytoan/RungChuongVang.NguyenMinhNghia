/* Nối màn hình chính với điện thoại.
   Hai cách: phòng của claude.ai (khi chạy trong claude.ai) hoặc PeerJS (khi chạy trên web thường). */
const Link=(()=>{
  let kind=null,room=null,conns=new Set(),H={},peer=null,upFlag=false;
  let role='host',hostId='',statusCb=null;
  const fire=(t,d)=>(H[t]||[]).forEach(f=>{try{f(d)}catch(e){}});
  const status=()=>{if(statusCb)statusCb()};

  function newId(){
    let id='';
    try{id=localStorage.getItem('rcv_hid')||''}catch(e){}
    if(!/^rcv-[a-z0-9]{6,}$/.test(id)){
      id='rcv-'+Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,5);
      try{localStorage.setItem('rcv_hid',id)}catch(e){}
    }
    return id;
  }

  /* ---- cách 1: phòng claude.ai ---- */
  async function viaRoom(){
    if(!(window.claude&&window.claude.use))return false;
    let r=null;
    try{r=await window.claude.use('room')}catch(e){r=null}
    if(!r)return false;
    room=r;kind='room';
    try{r.presence({role})}catch(e){}
    ['scan','cmd','state','ack'].forEach(t=>{
      try{r.on(t,m=>{if(!m.isMe)fire(t,m.data)})}catch(e){}
    });
    try{r.onPeers(status)}catch(e){}
    try{r.onConnection(status)}catch(e){}
    return true;
  }

  /* ---- cách 2: PeerJS ---- */
  function viaPeer(){
    return new Promise(res=>{
      if(typeof Peer!=='function')return res(false);
      let settled=false;
      const ok=v=>{if(!settled){settled=true;res(v)}};
      setTimeout(()=>ok(!!peer),11000);
      const hook=c=>{
        c.on('open',()=>{conns.add(c);upFlag=true;status();fire('_join',null)});
        c.on('data',m=>{if(m&&typeof m.t==='string')fire(m.t,m.d)});
        c.on('close',()=>{conns.delete(c);if(role==='scanner'){upFlag=false;setTimeout(connect,1800)}status()});
        c.on('error',()=>{});
      };
      function connect(){
        if(role!=='scanner'||!peer||peer.destroyed)return;
        try{hook(peer.connect(hostId,{reliable:true}))}catch(e){setTimeout(connect,2500)}
      }
      try{
        peer=role==='host'?new Peer(hostId):new Peer();
        kind='peer';
        peer.on('open',()=>{if(role==='host')upFlag=true;else connect();status();ok(true)});
        peer.on('connection',hook);
        peer.on('disconnected',()=>{upFlag=false;status();try{peer.reconnect()}catch(e){}});
        peer.on('error',e=>{
          const t=e&&e.type;
          if(t==='unavailable-id'&&role==='host'){
            try{localStorage.removeItem('rcv_hid')}catch(_){}
            try{peer.destroy()}catch(_){}
            hostId=newId();peer=null;
            viaPeer().then(ok);
          }else if(t==='peer-unavailable'&&role==='scanner'){upFlag=false;status();setTimeout(connect,2500)}
          else status();
        });
      }catch(e){ok(false)}
    });
  }

  async function init(r,hid,cb){
    role=r;statusCb=cb;
    hostId=r==='host'?newId():(hid||'');
    if(await viaRoom())return kind;
    if(r==='scanner'&&!hostId){kind=null;return null}
    const ok=await viaPeer();
    if(!ok)kind=null;
    return kind;
  }
  function send(t,d){
    if(kind==='room'&&room){try{room.emit(t,d).catch(()=>{})}catch(e){}return}
    conns.forEach(c=>{if(c.open){try{c.send({t,d})}catch(e){}}});
  }
  function on(t,f){(H[t]=H[t]||[]).push(f)}
  function connected(){
    if(kind==='room'&&room){try{return room.connected()}catch(e){return false}}
    if(kind==='peer')return role==='host'?!!peer&&!peer.destroyed:upFlag&&conns.size>0;
    return false;
  }
  function nPeers(){
    if(kind==='room'&&room){
      try{return room.peers().filter(p=>!p.isMe&&p.presence&&p.presence.role==='scanner').length}
      catch(e){return 0}
    }
    return [...conns].filter(c=>c.open).length;
  }
  /* dùng cho kiểm thử: đưa một gói tin vào như thể vừa nhận được */
  function rx(t,d){fire(t,d)}
  return {init,send,on,rx,connected,nPeers,
    get kind(){return kind},get hostId(){return kind==='peer'?hostId:''}};
})();
window.Link=Link;
