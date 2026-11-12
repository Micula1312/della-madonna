const $=s=>document.querySelector(s), projection=location.pathname==='/proiezione', admin=location.pathname==='/regia';
document.body.classList.toggle('projection',projection);document.body.classList.toggle('admin',admin);$('#mode').textContent=projection?'PROIEZIONE':admin?'REGIA':'PARTECIPA';$('#controls').hidden=!admin;
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
if($('#scratch-dialog').open)$('#scratch-dialog').close();$('#reveal-number').textContent=String(active.id).padStart(2,'0');fill($('#phrase'),active.text);panel.hidden=false;
if(reduced){later(()=>panel.hidden=true,Math.min(remaining,7000));return;}
const rect=target.getBoundingClientRect();const small={transform:`translate(${rect.left}px,${rect.top}px) scale(${rect.width/innerWidth},${rect.height/innerHeight})`,opacity:1};const full={transform:'translate(0,0) scale(1)',opacity:1};
const grow=Math.min(1000,remaining*.15),hold=Math.max(grow,remaining-1500);animations.push(panel.animate([small,full],{duration:grow,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'}));
later(()=>{const r=document.querySelector(`[data-id="${active.id}"]`).getBoundingClientRect();animations.push(panel.animate([full,{transform:`translate(${r.left}px,${r.top}px) scale(${r.width/innerWidth},${r.height/innerHeight})`,opacity:1}],{duration:1100,easing:'cubic-bezier(.65,0,.25,1)',fill:'forwards'}));later(()=>panel.hidden=true,1100);},hold);
}

function render(s){if(state&&s.opened.length<state.opened.length){scratches.clear();$('#scratch-dialog').close();}state=s;$('#count').textContent=`${s.opened.length} / ${s.total} possibilità aperte`;$('#queue').textContent=s.paused?'SCARTI IN PAUSA':s.queue.length?`${s.queue.length} IN ATTESA`:'GRATTA UNA POSSIBILITÀ';$('#pause').textContent=s.paused?'Riprendi':'Metti in pausa';const grid=$('#grid');grid.replaceChildren();const cells=Math.max(144,s.total*6),positions=s.total<=24?slots:Array.from({length:s.total},(_,i)=>Math.floor(i*cells/s.total));let index=0;
for(let i=0;i<cells;i++){if(!positions.slice(0,s.total).includes(i)){const empty=document.createElement('div');empty.className='empty';empty.setAttribute('aria-hidden','true');grid.append(empty);continue;}const card=s.cards[index++];let b=document.createElement('button');const queued=s.queue.includes(card.id),opened=card.text!==null;if(!opened&&!queued&&scratches.has(card.id)){b=scratches.get(card.id).button;b.disabled=projection||s.paused||!online;grid.append(b);continue;}
b.dataset.id=card.id;b.className='card'+(opened?' opened':'')+(queued?' queued':'');b.disabled=projection||opened||queued||s.paused||!online;b.setAttribute('aria-label',opened?`Casella ${card.id} aperta`:`Gratta casella ${card.id}`);if(opened){fill(b,card.text);}else{const num=document.createElement('span');num.className='number';num.textContent=String(card.id).padStart(2,'0');b.append(num);}if(!projection&&!opened&&!queued)attachScratch(b,card.id);grid.append(b);}
const key=s.active?`${s.active.id}:${s.active.until}`:null;if(key!==activeKey){activeKey=key;if(s.active)reveal(s.active);else cancelReveal();}}
let scratchSession=0;
function attachScratch(button,id){button.onclick=()=>openScratch(id);}
async function openScratch(id){
 const session=++scratchSession,dialog=$('#scratch-dialog'),canvas=$('#scratch'),ctx=canvas.getContext('2d');let drawing=false,last=null,checks=0,done=false;
 try{const response=await fetch(`/api/peek?id=${id}`);if(!response.ok)throw Error('Contenuto non disponibile');const data=await response.json();if(session!==scratchSession)return;
 fill($('#scratch-under'),data.content);canvas.width=720;canvas.height=720;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#7394c4';ctx.fillRect(0,0,720,720);
 // Light paper grain, with the same scattered snow marks as the calendar.
 for(let i=0;i<9000;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(25,40,75,.025)';ctx.fillRect(Math.random()*720,Math.random()*720,1,1);}
 ctx.fillStyle='#f6eedb';ctx.font='900 200px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(id),360,370);
 for(const [x,y] of [[65,80],[580,130],[140,580],[630,625],[480,65]]){ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();}
 ctx.globalCompositeOperation='destination-out';ctx.lineWidth=85;ctx.lineCap='round';dialog.showModal();canvas.focus();
 async function rub(x,y){if(done||!online||state.paused)return;ctx.beginPath();ctx.moveTo(last?.x??x,last?.y??y);ctx.lineTo(x,y);ctx.stroke();last={x,y};if(++checks%4!==0)return;const pixels=ctx.getImageData(0,0,720,720).data;let erased=0;for(let i=3;i<pixels.length;i+=16)if(pixels[i]<128)erased++;if(erased/(pixels.length/16)<.78)return;
 done=true;drawing=false;try{await action('open',{id});dialog.close();}catch(error){done=false;$('#notice').textContent=error.message;dialog.close();}}
 function point(e){const r=canvas.getBoundingClientRect();rub((e.clientX-r.left)*720/r.width,(e.clientY-r.top)*720/r.height);}
 canvas.onpointerdown=e=>{drawing=true;last=null;canvas.setPointerCapture(e.pointerId);point(e);};canvas.onpointermove=e=>{if(drawing)point(e);};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;last=null;};
 let cursor={x:360,y:360};canvas.onkeydown=e=>{const moves={ArrowLeft:[-38,0],ArrowRight:[38,0],ArrowUp:[0,-38],ArrowDown:[0,38]};if(!moves[e.key])return;e.preventDefault();cursor.x=Math.max(0,Math.min(720,cursor.x+moves[e.key][0]));cursor.y=Math.max(0,Math.min(720,cursor.y+moves[e.key][1]));rub(cursor.x,cursor.y);};
 }catch(error){$('#notice').textContent=error.message;}
}
$('#scratch-dialog').addEventListener('click',e=>{if(e.target===$('#scratch-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
const events=new EventSource('/events');events.onmessage=e=>{online=true;$('#connection').textContent='● connessa';render(JSON.parse(e.data));};events.onerror=()=>{online=false;$('#connection').textContent='○ riconnessione…';if(state)render(state);};

$('#pause').onclick=async()=>{try{await action('pause',{paused:!state.paused});}catch(e){$('#notice').textContent=e.message;}};
$('#reset').onclick=async()=>{if(!confirm('Richiudere tutte le caselle e cancellare la coda?'))return;try{await action('reset',{});}catch(e){$('#notice').textContent=e.message;}};
