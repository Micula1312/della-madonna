import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const p=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:'3099',ADMIN_TOKEN:'test-key'},stdio:'pipe'});
const base='http://127.0.0.1:3099';
try{
 await new Promise((resolve,reject)=>{p.stdout.on('data',chunk=>{if(chunk.toString().includes('Partecipazione:'))resolve();});p.once('error',reject);p.once('exit',()=>reject(Error('Server exited')));});
 const post=(path,data,key)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify(data)});
 assert.equal((await post('reset',{},'test-key')).status,200);
 assert.equal((await fetch(base+'/api/peek?id=1')).status,200);
 assert.equal((await fetch(base+'/api/peek?id=999')).status,400);
 assert.deepEqual((await(await fetch(base+'/api/state')).json()).opened,[]);
 const responses=await Promise.all([post('open',{id:1}),post('open',{id:1})]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 assert.equal((await post('reset',{})).status,401);
 assert.equal((await post('open',{id:999})).status,400);
 assert.equal((await post('open',{id:2})).status,200);
 let state=await(await fetch(base+'/api/state')).json();
 assert.equal(state.active.id,1);assert.deepEqual(state.queue,[2]);
 assert.equal(state.cards[1].text,null);
 await post('pause',{paused:true},'test-key');
 assert.equal((await post('open',{id:3})).status,409);
 await post('reset',{},'test-key');
 state=await(await fetch(base+'/api/state')).json();
 assert.deepEqual(state.opened,[]);assert.equal(state.active,null);
 for(const path of ['/','/regia','/proiezione','/app.js','/style.css'])assert.equal((await fetch(base+path)).status,200);
 console.log('PASS: simultaneous reservation, queue, hidden phrases, admin authorization, pause, reset and routes');
}finally{p.kill();}
