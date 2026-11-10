/* Tạo thẻ QR in cho học sinh: 4 cạnh ghi A, B, C, D. */
const Cards={
  qrData(text,cell){
    if(typeof qrcode!=='function')return '';
    try{const q=qrcode(0,'M');q.addData(text);q.make();return q.createDataURL(cell||8,0)}
    catch(e){return ''}
  },
  render(host,names){
    if(!host)return;
    if(typeof qrcode!=='function'){
      host.innerHTML='<div class="warn err">Chưa tải được thư viện tạo mã QR (vendor/qrcode.js).</div>';
      return;
    }
    host.innerHTML=names.map((nm,i)=>{
      const id=i+1,url=Cards.qrData('GB'+id,8);
      return `<div class="cardwrap"><div class="card">
        <span class="cno">#${id}</span>
        <span class="Lt t">A</span><span class="Lt r">B</span>
        <span class="Lt b">C</span><span class="Lt l">D</span>
        <img class="qr" src="${url}" alt="QR ${id}"></div>
        <div class="cap">#${id} ${esc(nm)}</div></div>`;
    }).join('');
  }
};
window.Cards=Cards;
