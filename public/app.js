const $=s=>document.querySelector(s), projection=location.pathname==='/proiezione', admin=location.pathname==='/regia';
document.body.classList.toggle('projection',projection);$('#mode').textContent=projection?'PROIEZIONE':admin?'REGIA':'PARTECIPA';$('#controls').hidden=!admin;
if(admin)$('#key').value=sessionStorage.getItem('regia-key')||'';
let state, online=false, activeKey=null, animations=[], timeouts=[];
const scratches=new Map();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
// 24 fixed positions in a 12 × 12 field. Stable on every connected screen.
const slots=Array.from({length:144},(_,i)=>i).filter(i=>[3,8,13,22,28,35,38,45,49,58,63,68,73,80,86,93,96,105,111,118,123,130,135,142].includes(i));
function content(value){return typeof value==='string'?{type:'text',text:value}:value;}
function fill(element,value){element.replaceChildren();const c=content(value);if(!c)return;if(c.type==='image'||c.type==='gif'){const img=document.createElement('img');img.src=c.src;img.alt=c.alt||'';element.append(img);}else element.textContent=c.text||'';}
async function action(path,data){const res=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(admin?{Authorization:`Bearer ${$('#key').value}`}:{})},body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw Error(result.error);if(admin)sessionStorage.setItem('regia-key',$('#key').value);return result;}
function cancelReveal(){for(const a of animations)a.cancel();for(const t of timeouts)clearTimeout(t);animations=[];timeouts=[];$('#reveal').hidden=true;}
function later(fn,ms){timeouts.push(setTimeout(fn,ms));}
function reveal(active){cancelReveal();const panel=$('#reveal'),target=document.querySelector(`[data-id="${active.id}"]`);if(!target)return;const remaining=active.until-Date.now();if(remaining<300)return;
$('#reveal-number').textContent=String(active.id).padStart(2,'0');fill($('#phrase'),active.text);panel.hidden=false;
if(reduced){later(()=>panel.hidden=true,Math.min(remaining,7000));return;}
const rect=target.getBoundingClientRect();const small={transform:`translate(${rect.left}px,${rect.top}px) scale(${rect.width/innerWidth},${rect.height/innerHeight})`,opacity:1};const full={transform:'translate(0,0) scale(1)',opacity:1};
const grow=Math.min(1000,remaining*.15),hold=Math.max(grow,remaining-1500);animations.push(panel.animate([small,full],{duration:grow,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'}));
later(()=>{const r=document.querySelector(`[data-id="${active.id}"]`).getBoundingClientRect();animations.push(panel.animate([full,{transform:`translate(${r.left}px,${r.top}px) scale(${r.width/innerWidth},${r.height/innerHeight})`,opacity:1}],{duration:1100,easing:'cubic-bezier(.65,0,.25,1)',fill:'forwards'}));later(()=>panel.hidden=true,1100);},hold);
}

function render(s){if(state&&s.opened.length<state.opened.length)scratches.clear();state=s;$('#count').textContent=`${s.opened.length} / ${s.total} possibilità aperte`;$('#queue').textContent=s.paused?'SCARTI IN PAUSA':s.queue.length?`${s.queue.length} IN ATTESA`:'GRATTA UNA POSSIBILITÀ';$('#pause').textContent=s.paused?'Riprendi':'Metti in pausa';const grid=$('#grid');grid.replaceChildren();const cells=Math.max(144,s.total*6),positions=s.total<=24?slots:Array.from({length:s.total},(_,i)=>Math.floor(i*cells/s.total));let index=0;
for(let i=0;i<cells;i++){if(!positions.slice(0,s.total).includes(i)){const empty=document.createElement('div');empty.className='empty';empty.setAttribute('aria-hidden','true');grid.append(empty);continue;}const card=s.cards[index++];let b=document.createElement('button');const queued=s.queue.includes(card.id),opened=card.text!==null;if(!opened&&!queued&&scratches.has(card.id)){b=scratches.get(card.id).button;b.disabled=projection||s.paused||!online;grid.append(b);continue;}
b.dataset.id=card.id;b.className='card'+(opened?' opened':'')+(queued?' queued':'');b.disabled=projection||opened||queued||s.paused||!online;b.setAttribute('aria-label',opened?`Casella ${card.id} aperta`:`Gratta casella ${card.id}`);if(opened){fill(b,card.text);}else{const num=document.createElement('span');num.className='number';num.textContent=String(card.id).padStart(2,'0');b.append(num);}if(!projection&&!opened&&!queued)attachScratch(b,card.id);grid.append(b);}
const key=s.active?`${s.active.id}:${s.active.until}`:null;if(key!==activeKey){activeKey=key;if(s.active)reveal(s.active);else cancelReveal();}}
function attachScratch(button,id){
 const item={button,canvas:null,loading:false,done:false,drawing:false,last:null,checks:0};scratches.set(id,item);
 async function prepare(e){if(item.canvas||item.loading||item.done||button.disabled)return;item.loading=true;try{const response=await fetch(`/api/peek?id=${id}`);if(!response.ok)throw Error('Contenuto non disponibile');const data=await response.json();if(button.disabled)return;
 button.replaceChildren();const under=document.createElement('span');under.className='scratch-content';fill(under,data.content);button.append(under);const canvas=document.createElement('canvas');canvas.className='tile-coating';canvas.width=320;canvas.height=320;button.append(canvas);item.canvas=canvas;const ctx=canvas.getContext('2d');ctx.fillStyle='#aaa99f';ctx.fillRect(0,0,320,320);ctx.fillStyle='#33332f';ctx.font='64px monospace';ctx.textAlign='center';ctx.fillText(String(id).padStart(2,'0'),160,183);ctx.globalCompositeOperation='destination-out';ctx.lineWidth=44;ctx.lineCap='round';item.ctx=ctx;
 const rect=button.getBoundingClientRect();const point=e&&e.clientX!==undefined?{x:(e.clientX-rect.left)*320/rect.width,y:(e.clientY-rect.top)*320/rect.height}:{x:160,y:160};ctx.beginPath();ctx.arc(point.x,point.y,24,0,Math.PI*2);ctx.fill();button.classList.add('scratching');button.setAttribute('aria-label',`Gratta casella ${id}. Premi Invio per aprire senza trascinare.`);$('#notice').textContent='Gratta direttamente la casella con il dito o il mouse.';
 }catch(error){$('#notice').textContent=error.message;}finally{item.loading=false;}}
 async function finish(){if(item.done||button.disabled)return;item.done=true;try{await action('open',{id});$('#notice').textContent=`Casella ${id} scartata ✳`;}catch(error){item.done=false;$('#notice').textContent=error.message;}}
 function rub(e){if(!item.drawing||!item.canvas||item.done||button.disabled)return;const r=button.getBoundingClientRect(),x=(e.clientX-r.left)*320/r.width,y=(e.clientY-r.top)*320/r.height;const ctx=item.ctx;ctx.beginPath();ctx.moveTo(item.last?.x??x,item.last?.y??y);ctx.lineTo(x,y);ctx.stroke();item.last={x,y};if(++item.checks%5===0){const pixels=ctx.getImageData(0,0,320,320).data;let erased=0;for(let i=3;i<pixels.length;i+=16)if(pixels[i]<128)erased++;if(erased/(pixels.length/16)>=.78){item.drawing=false;finish();}}}
 button.onpointerdown=e=>{if(button.disabled)return;item.drawing=true;item.last=null;button.setPointerCapture(e.pointerId);if(!item.canvas)prepare(e);else rub(e);};button.onpointermove=rub;button.onpointerup=button.onpointercancel=()=>{item.drawing=false;item.last=null;};
 button.onclick=e=>{if(e.detail===0){if(item.canvas)finish();else prepare();}};
}
const events=new EventSource('/events');events.onmessage=e=>{online=true;$('#connection').textContent='● connessa';render(JSON.parse(e.data));};events.onerror=()=>{online=false;$('#connection').textContent='○ riconnessione…';if(state)render(state);};

$('#pause').onclick=async()=>{try{await action('pause',{paused:!state.paused});}catch(e){$('#notice').textContent=e.message;}};
$('#reset').onclick=async()=>{if(!confirm('Richiudere tutte le caselle e cancellare la coda?'))return;try{await action('reset',{});}catch(e){$('#notice').textContent=e.message;}};
