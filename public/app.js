const $=s=>document.querySelector(s), projection=location.pathname==='/proiezione', admin=location.pathname==='/regia';
document.body.classList.toggle('projection',projection);document.body.classList.toggle('admin',admin);$('#mode').textContent=projection?'PROIEZIONE':admin?'REGIA':'PARTECIPA';$('#controls').hidden=!admin;$('#editor').hidden=!admin;
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

function render(s){if(state&&s.epoch!==state.epoch){scratchSession++;scratches.clear();$('#scratch-dialog').close();cancelReveal();activeKey=null;$('#notice').textContent='';}state=s;$('#count').textContent=`${s.opened.length} / ${s.total} possibilità aperte`;$('#queue').textContent=s.paused?'SCARTI IN PAUSA':s.queue.length?`${s.queue.length} IN ATTESA`:'GRATTA UNA POSSIBILITÀ';$('#pause').textContent=s.paused?'Riprendi':'Metti in pausa';const grid=$('#grid');grid.replaceChildren();const cells=Math.max(144,s.total*6),positions=s.total<=24?slots:Array.from({length:s.total},(_,i)=>Math.floor(i*cells/s.total));let index=0;
for(let i=0;i<cells;i++){if(!positions.slice(0,s.total).includes(i)){const empty=document.createElement('div');empty.className='empty';empty.setAttribute('aria-hidden','true');grid.append(empty);continue;}const card=s.cards[index++];let b=document.createElement('button');const queued=s.queue.includes(card.id),opened=card.text!==null;if(!opened&&!queued&&scratches.has(card.id)){b=scratches.get(card.id).button;b.disabled=projection||s.paused||!online;grid.append(b);continue;}
b.dataset.id=card.id;b.className='card'+(opened?' opened':'')+(queued?' queued':'');b.disabled=projection||opened||queued||s.paused||!online;b.setAttribute('aria-label',opened?`Casella ${card.id} aperta`:`Gratta casella ${card.id}`);if(opened){fill(b,card.text);}else{const num=document.createElement('span');num.className='number';num.textContent=String(card.id).padStart(2,'0');b.append(num);}if(!projection&&!opened&&!queued)attachScratch(b,card.id);grid.append(b);}
if(admin)refreshLocks(s);const key=s.active?`${s.active.id}:${s.active.until}`:null;if(key!==activeKey){activeKey=key;if(s.active&&!admin)reveal(s.active);else cancelReveal();}}
let scratchSession=0;
function attachScratch(button,id){button.onclick=()=>openScratch(id);}
async function openScratch(id){
 const epoch=state.epoch,session=++scratchSession,dialog=$('#scratch-dialog'),canvas=$('#scratch'),ctx=canvas.getContext('2d');let drawing=false,last=null,checks=0,done=false,scratchPromise=null;
 try{const response=await fetch(`/api/peek?id=${id}`);if(!response.ok)throw Error('Contenuto non disponibile');const data=await response.json();if(session!==scratchSession||state.epoch!==epoch)return;
 fill($('#scratch-under'),data.content);canvas.width=720;canvas.height=720;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#7394c4';ctx.fillRect(0,0,720,720);
 // Light paper grain, with the same scattered snow marks as the calendar.
 for(let i=0;i<9000;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(25,40,75,.025)';ctx.fillRect(Math.random()*720,Math.random()*720,1,1);}
 ctx.fillStyle='#f6eedb';ctx.font='900 200px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(id),360,370);
 for(const [x,y] of [[65,80],[580,130],[140,580],[630,625],[480,65]]){ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();}
 ctx.globalCompositeOperation='destination-out';ctx.lineWidth=85;ctx.lineCap='round';dialog.showModal();canvas.focus();
 const source=document.querySelector(`[data-id="${id}"]`).getBoundingClientRect(),dest=dialog.getBoundingClientRect();
 dialog.classList.remove('teletext-opening');void dialog.offsetWidth;dialog.classList.add('teletext-opening');
 if(!reduced)dialog.animate([
 {transform:`translate(${source.left+source.width/2-dest.left-dest.width/2}px,${source.top+source.height/2-dest.top-dest.height/2}px) scale(${source.width/dest.width},${source.height/dest.height})`,filter:'saturate(2)'},
 {transform:'translate(-12px,6px) scale(1.05,.91)',offset:.65,filter:'saturate(2)'},
 {transform:'translate(7px,-3px) scale(.98,1.02)',offset:.85,filter:'saturate(1.4)'},
 {transform:'translate(0,0) scale(1)',filter:'saturate(1)'}
 ],{duration:650,easing:'steps(7,end)'});
 setTimeout(()=>{if(session===scratchSession)dialog.classList.remove('teletext-opening');},700);
 async function rub(x,y){if(done||!online||state.paused||state.epoch!==epoch||session!==scratchSession)return;ctx.beginPath();ctx.moveTo(last?.x??x,last?.y??y);ctx.lineTo(x,y);ctx.stroke();last={x,y};
 if(!scratchPromise){scratchPromise=action('scratch',{id,epoch}).catch(error=>{scratchPromise=null;$('#notice').textContent=error.message;throw error;});scratchPromise.catch(()=>{});}
 if(++checks%4!==0)return;const pixels=ctx.getImageData(0,0,720,720).data;let erased=0;for(let i=3;i<pixels.length;i+=16)if(pixels[i]<128)erased++;if(erased/(pixels.length/16)<.78)return;
 done=true;drawing=false;try{await scratchPromise;if(session!==scratchSession||state.epoch!==epoch)return;await action('open',{id,epoch});if(session===scratchSession)dialog.close();}catch(error){done=false;$('#notice').textContent=error.message;dialog.close();}}
 function point(e){const r=canvas.getBoundingClientRect();rub((e.clientX-r.left)*720/r.width,(e.clientY-r.top)*720/r.height);}
 canvas.onpointerdown=e=>{drawing=true;last=null;canvas.setPointerCapture(e.pointerId);point(e);};canvas.onpointermove=e=>{if(drawing)point(e);};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;last=null;};
 let cursor={x:360,y:360};canvas.onkeydown=e=>{const moves={ArrowLeft:[-38,0],ArrowRight:[38,0],ArrowUp:[0,-38],ArrowDown:[0,38]};if(!moves[e.key])return;e.preventDefault();cursor.x=Math.max(0,Math.min(720,cursor.x+moves[e.key][0]));cursor.y=Math.max(0,Math.min(720,cursor.y+moves[e.key][1]));rub(cursor.x,cursor.y);};
 }catch(error){$('#notice').textContent=error.message;}
}
$('#scratch-dialog').addEventListener('click',e=>{if(e.target===$('#scratch-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
const events=new EventSource('/events');events.onmessage=e=>{online=true;$('#connection').textContent='● connessa';render(JSON.parse(e.data));};events.onerror=()=>{online=false;$('#connection').textContent='○ riconnessione…';if(state)render(state);};

$('#pause').onclick=async()=>{try{await action('pause',{paused:!state.paused});}catch(e){$('#notice').textContent=e.message;}};
$('#reset').onclick=async()=>{if(!confirm('Richiudere tutte le caselle e cancellare la coda?'))return;try{await action('reset',{});}catch(e){$('#notice').textContent=e.message;}};

const entryForms=new Map();
function refreshLocks(s){for(const [id,form] of entryForms){const locked=s.opened.includes(id)||s.queue.includes(id);for(const el of form.elements)el.disabled=locked;form.querySelector('.entry-state').textContent=locked?'Scartata / in coda — reset per modificare':'Da scartare';}}
async function loadCatalog(){try{const result=await action('catalog',{});const entries=$('#entries');entries.replaceChildren();entryForms.clear();for(const item of result.cards){const c=content(item.content),form=document.createElement('form');form.className='entry';form.innerHTML='<h2></h2><span class="entry-state"></span><label>Contenuto<select name="type"><option value="text">Frase</option><option value="image">Immagine</option><option value="gif">GIF</option></select></label><label class="text-field">Testo<textarea name="text" maxlength="1200" rows="3"></textarea></label><label class="media-field">URL immagine o GIF<input name="src" placeholder="https://… oppure /media/nome.gif"></label><label class="media-field">Descrizione<input name="alt" maxlength="300"></label><button type="submit">Salva casella</button><span class="save-state" role="status"></span>';
form.querySelector('h2').textContent=String(item.id).padStart(2,'0');form.elements.type.value=c.type;form.elements.text.value=c.text||'';form.elements.src.value=c.src||'';form.elements.alt.value=c.alt||'';
const fields=()=>{for(const el of form.querySelectorAll('.text-field'))el.hidden=form.elements.type.value!=='text';for(const el of form.querySelectorAll('.media-field'))el.hidden=form.elements.type.value==='text';};form.elements.type.onchange=fields;fields();
form.onsubmit=async e=>{e.preventDefault();const status=form.querySelector('.save-state');status.textContent='Salvataggio…';const payload={type:form.elements.type.value,text:form.elements.text.value,src:form.elements.src.value,alt:form.elements.alt.value};try{await action('content',{id:item.id,content:payload});status.textContent='Salvata';}catch(error){status.textContent=error.message;}};entries.append(form);entryForms.set(item.id,form);}
refreshLocks(state);$('#editor-status').textContent='Contenuti caricati';}catch(error){$('#editor-status').textContent=error.message;}}
$('#load-catalog').onclick=loadCatalog;
