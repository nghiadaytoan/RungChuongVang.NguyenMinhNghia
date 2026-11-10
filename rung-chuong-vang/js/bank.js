/* Ngân hàng câu hỏi: lưu trữ, soạn thảo, LaTeX, ảnh, xuất/nhập file. */
const LET=['A','B','C','D'];
const TYPES={normal:'Câu thường',rescue:'Câu cứu trợ',final:'Câu chuông vàng'};
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- LaTeX ---------- */
const Tex={
  ready:()=>typeof renderMathInElement==='function',
  run(el){
    if(!el||!Tex.ready())return;
    try{
      renderMathInElement(el,{throwOnError:false,errorColor:'#ff8f85',delimiters:[
        {left:'$$',right:'$$',display:true},{left:'\\[',right:'\\]',display:true},
        {left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false}]});
    }catch(e){}
  },
  /* đặt nội dung có công thức vào một thẻ */
  put(el,txt){ if(!el)return; el.textContent=txt==null?'':txt; Tex.run(el); }
};

/* ---------- lưu trữ (IndexedDB, dự phòng localStorage) ---------- */
const Store=(()=>{
  const DB='rcv',ST='kv';let dbp=null;
  function open(){
    if(dbp)return dbp;
    dbp=new Promise(res=>{
      try{
        if(!window.indexedDB)return res(null);
        const r=indexedDB.open(DB,1);
        r.onupgradeneeded=()=>{try{r.result.createObjectStore(ST)}catch(e){}};
        r.onsuccess=()=>res(r.result);
        r.onerror=()=>res(null);
        setTimeout(()=>res(null),4000);
      }catch(e){res(null)}
    });
    return dbp;
  }
  async function get(k){
    const db=await open();
    if(db){
      const v=await new Promise(res=>{
        try{const t=db.transaction(ST,'readonly').objectStore(ST).get(k);
          t.onsuccess=()=>res(t.result);t.onerror=()=>res(undefined)}catch(e){res(undefined)}
      });
      if(v!==undefined)return v;
    }
    try{const s=localStorage.getItem('rcv_'+k);return s?JSON.parse(s):undefined}catch(e){return undefined}
  }
  async function set(k,v){
    const db=await open();let okIdb=false;
    if(db)okIdb=await new Promise(res=>{
      try{const t=db.transaction(ST,'readwrite').objectStore(ST).put(v,k);
        t.onsuccess=()=>res(true);t.onerror=()=>res(false)}catch(e){res(false)}
    });
    if(okIdb)return true;
    try{localStorage.setItem('rcv_'+k,JSON.stringify(v));return true}catch(e){return false}
  }
  return {get,set};
})();

/* Bộ câu hỏi tối thiểu, dùng khi không đọc được data/cau-hoi-mau.json
   (ví dụ khi mở trang trực tiếp từ file trên máy). */
const SEED={
  cfg:{title:'HỘI THI RUNG CHUÔNG VÀNG',school:'',secs:20,warm:1},
  roster:Array.from({length:30},(_,i)=>'Thí sinh '+(i+1)),
  questions:[
    {text:'Thủ đô của Việt Nam là thành phố nào?',opts:['Hà Nội','Huế','Đà Nẵng','TP. Hồ Chí Minh'],ans:'A',type:'normal'},
    {text:'Kết quả của $7 \\times 8$ là bao nhiêu?',opts:['54','56','63','48'],ans:'B',type:'normal'},
    {text:'Hành tinh nào gần Mặt Trời nhất?',opts:['Sao Kim','Trái Đất','Sao Thủy','Sao Hỏa'],ans:'C',type:'normal'},
    {text:'Ai là tác giả của Truyện Kiều?',opts:['Nguyễn Trãi','Nguyễn Du','Hồ Xuân Hương','Nguyễn Khuyến'],ans:'B',type:'normal'},
    {text:'Số nguyên tố nhỏ nhất là số nào?',opts:['0','1','2','3'],ans:'C',type:'normal'},
    {text:'Giá trị của $\\sqrt{144}$ là bao nhiêu?',opts:['11','12','14','16'],ans:'B',type:'normal'},
    {text:'Đơn vị đo cường độ dòng điện là gì?',opts:['Vôn','Oát','Ôm','Ampe'],ans:'D',type:'normal'},
    {text:'Tổng các góc trong một tam giác bằng bao nhiêu?',opts:['$90^\\circ$','$180^\\circ$','$270^\\circ$','$360^\\circ$'],ans:'B',type:'normal'},
    {text:'Nước đóng băng ở nhiệt độ nào?',opts:['$0^\\circ C$','$10^\\circ C$','$-10^\\circ C$','$32^\\circ C$'],ans:'A',type:'rescue'},
    {text:'Mỗi đội bóng đá có bao nhiêu cầu thủ trên sân?',opts:['9','10','11','12'],ans:'C',type:'rescue'},
    {text:'Kim loại nào ở thể lỏng trong điều kiện nhiệt độ phòng?',opts:['Sắt','Thủy ngân','Đồng','Nhôm'],ans:'B',type:'final'},
    {text:'Nguyên tố hóa học có ký hiệu $Au$ là nguyên tố nào?',opts:['Bạc','Đồng','Vàng','Nhôm'],ans:'C',type:'final'}
  ]
};

/* ---------- mô hình dữ liệu ---------- */
const Bank={
  cfg:{title:'HỘI THI RUNG CHUÔNG VÀNG',school:'',logo:'',secs:20,warm:1,shuffle:false,sound:true},
  roster:[],
  qs:[],
  sel:-1,
  dirty:false,

  blank(){
    return {id:'q'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
      text:'',img:'',tikz:'',opts:[{t:'',img:''},{t:'',img:''},{t:'',img:''},{t:'',img:''}],
      ans:'A',type:'normal',secs:null};
  },
  norm(q){
    const b=Bank.blank();
    const o=(q.opts||[]).map(x=>typeof x==='string'?{t:x,img:''}:{t:(x&&x.t)||'',img:(x&&x.img)||''});
    while(o.length<4)o.push({t:'',img:''});
    return {...b,...q,opts:o.slice(0,4),
      ans:LET.includes(String(q.ans||'').toUpperCase())?String(q.ans).toUpperCase():'A',
      type:TYPES[q.type]?q.type:'normal',
      secs:q.secs?+q.secs:null,id:q.id||b.id};
  },
  count(t){return Bank.qs.filter(q=>q.type===t).length},

  problems(){
    const p=[];
    if(!Bank.roster.length)p.push('Chưa có thí sinh nào.');
    if(!Bank.qs.length)p.push('Chưa có câu hỏi nào.');
    if(Bank.qs.length&&!Bank.count('final'))p.push('Chưa có câu Chuông vàng (loại "Câu chuông vàng").');
    if(Bank.qs.length&&!Bank.count('rescue'))p.push('Chưa có câu cứu trợ – vòng Phao Hồi Sinh sẽ dùng tạm câu thường.');
    Bank.qs.forEach((q,i)=>{
      const bad=Bank.qBad(q);
      if(bad)p.push(`Câu ${i+1}: ${bad}`);
    });
    return p;
  },
  qBad(q){
    if(!String(q.text).trim()&&!q.img)return 'thiếu nội dung';
    const empty=q.opts.filter(o=>!String(o.t).trim()&&!o.img).length;
    if(empty)return `còn ${empty} đáp án để trống`;
    return '';
  },

  async load(){
    const d=await Store.get('bank');
    if(d&&typeof d==='object'){
      Bank.cfg={...Bank.cfg,...(d.cfg||{})};
      Bank.roster=Array.isArray(d.roster)?d.roster.slice():[];
      Bank.qs=(d.questions||d.qs||[]).map(Bank.norm);
    }
    if(!Bank.roster.length||!Bank.qs.length){
      const seed=await Bank.fetchSeed();
      if(seed){
        if(!Bank.roster.length)Bank.roster=seed.roster||[];
        if(!Bank.qs.length)Bank.qs=(seed.questions||[]).map(Bank.norm);
        if(!d)Bank.cfg={...Bank.cfg,...(seed.cfg||{})};
      }
    }
    if(!Bank.roster.length)Bank.roster=Array.from({length:30},(_,i)=>'Thí sinh '+(i+1));
  },
  fetchSeed(){
    return new Promise(res=>{
      let done=false;
      const fin=v=>{if(!done){done=true;res(v)}};
      setTimeout(()=>fin(SEED),4000);
      try{
        const x=new XMLHttpRequest();
        x.open('GET','data/cau-hoi-mau.json',true);
        x.onload=()=>{try{fin(JSON.parse(x.responseText))}catch(e){fin(SEED)}};
        x.onerror=()=>fin(SEED);
        x.send();
      }catch(e){fin(SEED)}
    });
  },
  async save(){
    const ok=await Store.set('bank',{version:1,cfg:Bank.cfg,roster:Bank.roster,questions:Bank.qs});
    Bank.dirty=false;
    return ok;
  },
  toJSON(){
    return JSON.stringify({version:1,cfg:Bank.cfg,roster:Bank.roster,questions:Bank.qs},null,1);
  },
  fromJSON(txt){
    const d=JSON.parse(txt);
    if(!d||typeof d!=='object')throw new Error('File không đúng dạng.');
    if(d.cfg)Bank.cfg={...Bank.cfg,...d.cfg};
    if(Array.isArray(d.roster)&&d.roster.length)Bank.roster=d.roster.slice();
    const qs=d.questions||d.qs;
    if(Array.isArray(qs))Bank.qs=qs.map(Bank.norm);
    Bank.sel=Bank.qs.length?0:-1;
  },
  /* nhập từ dạng văn bản cũ: Câu | A | B | C | D | Đáp án | loại */
  fromText(txt){
    const out=[];
    txt.split('\n').forEach(l=>{
      l=l.trim();if(!l||l[0]==='#')return;
      const p=l.split('|').map(x=>x.trim());
      if(p.length<6)return;
      const a=p[5].toUpperCase();if(!LET.includes(a))return;
      const t=(p[6]||'n').toLowerCase()[0];
      out.push(Bank.norm({text:p[0],opts:p.slice(1,5),ans:a,
        type:t==='f'?'final':t==='r'?'rescue':'normal'}));
    });
    if(!out.length)throw new Error('Không đọc được dòng nào. Mỗi dòng cần đủ: Câu hỏi | A | B | C | D | Đáp án | loại');
    Bank.qs=Bank.qs.concat(out);
    return out.length;
  }
};

/* ---------- ảnh: nén rồi đổi thành dataURL ---------- */
function readImage(file,maxPx,cb){
  if(!file)return;
  if(!/^image\//.test(file.type)){cb(null,'Chỉ nhận tệp ảnh.');return}
  const im=new Image(),url=URL.createObjectURL(file);
  im.onload=()=>{
    try{
      const M=maxPx||1200,sc=Math.min(1,M/Math.max(im.width,im.height));
      const w=Math.max(1,Math.round(im.width*sc)),h=Math.max(1,Math.round(im.height*sc));
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const x=c.getContext('2d');x.drawImage(im,0,0,w,h);
      let out=c.toDataURL('image/webp',.85);
      if(out.length<30||out.indexOf('data:image/webp')!==0)out=c.toDataURL('image/jpeg',.85);
      const png=c.toDataURL('image/png');
      cb(png.length<out.length?png:out,'');
    }catch(e){cb(null,'Không xử lý được ảnh này.')}
    URL.revokeObjectURL(url);
  };
  im.onerror=()=>{cb(null,'Không mở được ảnh này.');URL.revokeObjectURL(url)};
  im.src=url;
}

/* ---------- xuất file (có đường dự phòng là copy) ---------- */
function offerFile(name,text,mime){
  let done=false;
  try{
    const b=new Blob([text],{type:mime||'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download=name;a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);
    done=true;
  }catch(e){}
  showCopyBox(name,text,done);
}
function showCopyBox(name,text,downloaded){
  const d=$('#copyBox');if(!d)return;
  d.innerHTML=`<div class="warn">${downloaded?'Nếu trình duyệt không tải được file':'Trình duyệt ở đây không cho tải file'}
   <b>${esc(name)}</b>, hãy bấm Copy rồi dán vào một file văn bản và lưu lại với tên đó.</div>
   <textarea class="mono" readonly style="height:150px"></textarea>
   <div class="row"><button class="btn sm" id="cpBtn">Copy toàn bộ</button>
   <button class="btn sm alt" id="cpClose">Đóng</button><span id="cpMsg" class="hint"></span></div>`;
  d.style.display='block';
  const ta=d.querySelector('textarea');ta.value=text;
  $('#cpBtn').onclick=async()=>{
    ta.select();let ok=false;
    try{await navigator.clipboard.writeText(text);ok=true}catch(e){try{ok=document.execCommand('copy')}catch(_){}}
    $('#cpMsg').textContent=ok?'Đã copy.':'Hãy bấm Ctrl+C để copy.';
  };
  $('#cpClose').onclick=()=>{d.style.display='none';d.innerHTML=''};
}

/* ================= giao diện soạn câu hỏi ================= */
const Editor={
  mount(){
    $('#bAdd').onclick=()=>{Bank.qs.push(Bank.blank());Bank.sel=Bank.qs.length-1;Editor.all();Editor.touch()};
    $('#bDup').onclick=()=>{
      const q=Editor.cur();if(!q)return;
      const c=Bank.norm(JSON.parse(JSON.stringify(q)));c.id=Bank.blank().id;
      Bank.qs.splice(Bank.sel+1,0,c);Bank.sel++;Editor.all();Editor.touch();
    };
    $('#bDel').onclick=()=>{
      if(Bank.sel<0)return;
      Bank.qs.splice(Bank.sel,1);Bank.sel=Math.min(Bank.sel,Bank.qs.length-1);Editor.all();Editor.touch();
    };
    $('#bUp').onclick=()=>Editor.move(-1);
    $('#bDown').onclick=()=>Editor.move(1);
    $('#bCheck').onclick=()=>{
      const p=Bank.problems();
      $('#bankMsg').innerHTML=p.length
        ?`<div class="warn err"><b>Cần sửa:</b><br>${p.map(esc).join('<br>')}</div>`
        :`<div class="warn" style="background:#143a22;border-color:#2fa95f">Ngân hàng câu hỏi hợp lệ. ${Bank.qs.length} câu: ${Bank.count('normal')} thường, ${Bank.count('rescue')} cứu trợ, ${Bank.count('final')} chuông vàng.</div>`;
    };
    $('#bExport').onclick=()=>offerFile('ngan-hang-cau-hoi.json',Bank.toJSON());
    $('#bImport').onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=()=>{
        try{Bank.fromJSON(String(r.result));Editor.all();Editor.touch();
          $('#bankMsg').innerHTML='<div class="warn" style="background:#143a22;border-color:#2fa95f">Đã nạp '+Bank.qs.length+' câu hỏi từ file.</div>';
          if(window.App)App.afterBankChange();
        }catch(err){$('#bankMsg').innerHTML='<div class="warn err">Không đọc được file: '+esc(err.message)+'</div>'}
      };
      r.readAsText(f);e.target.value='';
    };
    $('#bPaste').onclick=()=>{
      const box=$('#pasteBox');
      box.style.display=box.style.display==='block'?'none':'block';
    };
    $('#bPasteGo').onclick=()=>{
      try{
        const n=Bank.fromText($('#pasteText').value);
        Bank.sel=Bank.qs.length-1;Editor.all();Editor.touch();
        $('#pasteBox').style.display='none';$('#pasteText').value='';
        $('#bankMsg').innerHTML='<div class="warn" style="background:#143a22;border-color:#2fa95f">Đã thêm '+n+' câu.</div>';
      }catch(err){$('#bankMsg').innerHTML='<div class="warn err">'+esc(err.message)+'</div>'}
    };

    /* công cụ chèn công thức */
    $$('#texTools button').forEach(b=>b.onclick=()=>Editor.insert(b.dataset.ins,b.dataset.back));
    /* nội dung câu hỏi */
    $('#qText').oninput=()=>{const q=Editor.cur();if(q){q.text=$('#qText').value;Editor.touch();Editor.list();Editor.preview()}};
    $('#qTikz').oninput=()=>{const q=Editor.cur();if(q){q.tikz=$('#qTikz').value;Editor.touch()}};
    $('#qType').onchange=()=>{const q=Editor.cur();if(q){q.type=$('#qType').value;Editor.touch();Editor.list()}};
    $('#qSecs').oninput=()=>{const q=Editor.cur();if(q){const v=+$('#qSecs').value;q.secs=v>0?v:null;Editor.touch()}};
    $('#qImg').onchange=e=>Editor.pickImg(e.target,img=>{const q=Editor.cur();if(q){q.img=img;Editor.form();Editor.touch()}});
    $('#qImgDel').onclick=()=>{const q=Editor.cur();if(q){q.img='';Editor.form();Editor.touch()}};
    /* 4 đáp án */
    for(let i=0;i<4;i++){
      $('#aT'+i).oninput=()=>{const q=Editor.cur();if(q){q.opts[i].t=$('#aT'+i).value;Editor.touch();Editor.preview()}};
      $('#aR'+i).onchange=()=>{const q=Editor.cur();if(q){q.ans=LET[i];Editor.touch();Editor.form()}};
      $('#aI'+i).onchange=e=>Editor.pickImg(e.target,img=>{const q=Editor.cur();if(q){q.opts[i].img=img;Editor.form();Editor.touch()}});
      $('#aD'+i).onclick=()=>{const q=Editor.cur();if(q){q.opts[i].img='';Editor.form();Editor.touch()}};
    }
    Editor.all();
  },
  cur(){return Bank.sel>=0&&Bank.sel<Bank.qs.length?Bank.qs[Bank.sel]:null},
  touch(){Bank.dirty=true;clearTimeout(Editor._t);Editor._t=setTimeout(()=>Bank.save(),700);},
  move(d){
    const i=Bank.sel,j=i+d;
    if(i<0||j<0||j>=Bank.qs.length)return;
    const a=Bank.qs;[a[i],a[j]]=[a[j],a[i]];Bank.sel=j;Editor.all();Editor.touch();
  },
  pickImg(input,cb){
    const f=input.files[0];input.value='';
    readImage(f,1400,(img,err)=>{
      if(err){$('#bankMsg').innerHTML='<div class="warn err">'+esc(err)+'</div>';return}
      cb(img);
    });
  },
  insert(txt,back){
    const el=document.activeElement&&/^(qText|aT[0-3])$/.test(document.activeElement.id)
      ?document.activeElement:$('#qText');
    const s=el.selectionStart||0,e=el.selectionEnd||0,v=el.value;
    el.value=v.slice(0,s)+txt+v.slice(e);
    const pos=s+txt.length-(+back||0);
    el.focus();el.setSelectionRange(pos,pos);
    el.dispatchEvent(new Event('input'));
  },
  all(){Editor.list();Editor.form()},
  list(){
    const el=$('#qlist');
    el.innerHTML=Bank.qs.map((q,i)=>{
      const bad=Bank.qBad(q);
      const title=String(q.text).replace(/\$[^$]*\$/g,'◻').trim()||(q.img?'(câu chỉ có ảnh)':'(chưa có nội dung)');
      return `<div class="qrow${i===Bank.sel?' sel':''}" data-i="${i}">
        <span class="ix ${q.type}">${i+1}</span>
        <span class="tt${bad?' bad':''}">${esc(title)}</span>
        ${q.img?'<span title="có ảnh">🖼</span>':''}
        <span class="hint" style="margin:0">${q.ans}</span></div>`;
    }).join('')||'<p class="hint">Chưa có câu nào. Bấm “+ Thêm câu”.</p>';
    $$('#qlist .qrow').forEach(r=>r.onclick=()=>{Bank.sel=+r.dataset.i;Editor.all()});
    $('#qCounts').textContent=`${Bank.qs.length} câu · ${Bank.count('normal')} thường · ${Bank.count('rescue')} cứu trợ · ${Bank.count('final')} chuông vàng`;
  },
  form(){
    const q=Editor.cur(),box=$('#qform');
    box.style.display=q?'block':'none';
    if(!q)return;
    $('#qText').value=q.text;
    $('#qTikz').value=q.tikz||'';
    $('#qType').value=q.type;
    $('#qSecs').value=q.secs||'';
    $('#qImgWrap').innerHTML=q.img
      ?`<img src="${q.img}" alt="" style="max-height:130px;background:#fff;border-radius:8px;padding:4px">`
      :'<span class="hint">Chưa có ảnh.</span>';
    $('#qImgDel').style.display=q.img?'inline-block':'none';
    for(let i=0;i<4;i++){
      $('#aT'+i).value=q.opts[i].t;
      $('#aR'+i).checked=q.ans===LET[i];
      $('#aBox'+i).classList.toggle('correct',q.ans===LET[i]);
      $('#aW'+i).innerHTML=q.opts[i].img
        ?`<img src="${q.opts[i].img}" alt="" style="max-height:62px;background:#fff;border-radius:6px;padding:3px">`:'';
      $('#aD'+i).style.display=q.opts[i].img?'inline-block':'none';
    }
    Editor.preview();
  },
  preview(){
    const q=Editor.cur(),p=$('#prev');
    if(!q){p.innerHTML='';return}
    p.innerHTML=`<div class="pq"></div>${q.img?`<div style="margin-bottom:9px"><img src="${q.img}" alt=""></div>`:''}
      <div class="po">${q.opts.map((o,i)=>
        `<div class="${q.ans===LET[i]?'c':''}"><b>${LET[i]}.</b> <span class="ot"></span>
         ${o.img?`<br><img src="${o.img}" style="max-height:70px" alt="">`:''}</div>`).join('')}</div>`;
    Tex.put(p.querySelector('.pq'),q.text);
    p.querySelectorAll('.ot').forEach((el,i)=>Tex.put(el,q.opts[i].t));
  }
};
window.Bank=Bank;window.Editor=Editor;window.Tex=Tex;window.Store=Store;
window.$=$;window.$$=$$;window.esc=esc;window.LET=LET;window.readImage=readImage;
