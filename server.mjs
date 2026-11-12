import http from 'node:http';
import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {networkInterfaces} from 'node:os';
const port=Number(process.env.PORT||3000), token=process.env.ADMIN_TOKEN||randomBytes(18).toString('hex');
const phrases=JSON.parse(readFileSync(new URL('./phrases.json',import.meta.url)));
mkdirSync(new URL('./data/',import.meta.url),{recursive:true});
const file=new URL('./data/state.json',import.meta.url);
let state={opened:[],queue:[],active:null,paused:false};
try{state=JSON.parse(readFileSync(file));}catch{}
const clients=new Set();
function save(){writeFileSync(new URL('./data/state.tmp',import.meta.url),JSON.stringify(state));renameSync(new URL('./data/state.tmp',import.meta.url),file);}
function snapshot(){return {...state,total:phrases.length,cards:phrases.map((text,i)=>({id:i+1,text:state.opened.includes(i+1)?text:null}))};}
function publish(){save();const event=`data: ${JSON.stringify(snapshot())}\n\n`;for(const c of clients)c.write(event);}
let timer;
function advance(){if(state.paused||state.active||!state.queue.length)return;const id=state.queue.shift();state.opened.push(id);state.active={id,text:phrases[id-1],until:Date.now()+8500};publish();schedule();}
function schedule(){clearTimeout(timer);if(state.active)timer=setTimeout(()=>{state.active=null;publish();advance();},Math.max(0,state.active.until-Date.now()));}
if(state.active)schedule();else advance();
function authorized(req){const provided=Buffer.from(req.headers.authorization||'');const expected=Buffer.from(`Bearer ${token}`);return provided.length===expected.length&&timingSafeEqual(provided,expected);}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
if(req.method==='GET'&&url.pathname==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(`data: ${JSON.stringify(snapshot())}\n\n`);clients.add(res);req.on('close',()=>clients.delete(res));return;}
if(req.method==='GET'&&url.pathname==='/api/state')return reply(200,snapshot());
if(req.method==='POST'&&url.pathname.startsWith('/api/')){try{let body='';for await(const chunk of req){body+=chunk;if(body.length>2048)return reply(413,{error:'Richiesta troppo grande'});}const data=JSON.parse(body||'{}');
if(url.pathname==='/api/open'){const id=data.id;if(!Number.isInteger(id)||id<1||id>phrases.length)return reply(400,{error:'Casella non valida'});if(state.paused)return reply(409,{error:'Un momento: gli scarti sono in pausa.'});if(state.opened.includes(id)||state.queue.includes(id))return reply(409,{error:'Questa casella è già stata scelta.'});state.queue.push(id);publish();advance();return reply(200,{ok:true});}
if(!authorized(req))return reply(401,{error:'Chiave regia non valida'});
if(url.pathname==='/api/pause')state.paused=Boolean(data.paused);
else if(url.pathname==='/api/reset'){clearTimeout(timer);state={opened:[],queue:[],active:null,paused:false};}
else return reply(404,{error:'Percorso non trovato'});
publish();advance();return reply(200,{ok:true});}catch{return reply(400,{error:'Richiesta non valida'});}}
if(req.method!=='GET')return reply(405,{error:'Metodo non consentito'});
if(url.pathname.startsWith('/media/')){const name=url.pathname.slice(7);if(!/^[a-zA-Z0-9_.-]+$/.test(name))return reply(400,{error:'Nome file non valido'});const ext=name.split('.').pop().toLowerCase(),types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',avif:'image/avif'};if(!types[ext])return reply(404,{error:'Formato non supportato'});try{const bytes=readFileSync(new URL('./public/media/'+name,import.meta.url));res.writeHead(200,{'Content-Type':types[ext]});return res.end(bytes);}catch{return reply(404,{error:'Immagine non trovata'});}}
const paths={'/':'index.html','/proiezione':'index.html','/regia':'index.html','/style.css':'style.css','/app.js':'app.js'};const name=paths[url.pathname];if(!name)return reply(404,{error:'Pagina non trovata'});res.writeHead(200,{'Content-Type':name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(readFileSync(new URL(`./public/${name}`,import.meta.url)));
});
const heartbeat=setInterval(()=>{for(const c of clients)c.write(': heartbeat\n\n');},15000);heartbeat.unref();
server.listen(port,'0.0.0.0',()=>{console.log(`Partecipazione: http://localhost:${port}\nProiezione: http://localhost:${port}/proiezione\nRegia: http://localhost:${port}/regia\nChiave regia: ${token}`);let interfaces={};try{interfaces=networkInterfaces();}catch{console.log("Indirizzo di rete non rilevabile: consultare le impostazioni Wi-Fi del computer.");}for(const entries of Object.values(interfaces))for(const n of entries||[])if(n.family==='IPv4'&&!n.internal)console.log(`Rete locale: http://${n.address}:${port}`);});
