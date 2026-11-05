import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
async function server(t,demo=false,extraEnv={}){const dir=mkdtempSync(join(tmpdir(),'pixel-api-'));const child=spawn(process.execPath,['server/index.mjs',...(demo?['--demo']:[])],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0',PIXEL_DATA_DIR:dir,PIXEL_OWNER_TOKEN:'integration-test-owner',...extraEnv}});let base;let stderr='';child.stderr.on('data',d=>stderr+=d);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(stderr||'startup timeout')),5000);child.stdout.on('data',d=>{const match=d.toString().match(/http:\/\/[^\s]+/);if(match){base=match[0];clearTimeout(timer);resolve();}});child.on('error',reject);});t.after(async()=>{child.kill();await new Promise(r=>child.on('exit',r));rmSync(dir,{recursive:true,force:true});});let cookie='';return async(path,data,headers={})=>{const r=await fetch(base+'/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',cookie,...headers},body:data?JSON.stringify(data):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,body:await r.json()};};}
test('live APIs require owner login and block cross-origin writes',async t=>{const call=await server(t);assert.equal((await call('state')).status,401);assert.equal((await call('knowledge/list',{})).status,401);assert.equal((await call('accounts/connect',{id:'missing'})).status,401);assert.equal((await call('login',{token:'wrong'})).status,401);assert.equal((await call('login',{token:'integration-test-owner'})).status,200);assert.equal((await call('state')).body.demo,false);assert.equal((await call('commands',{text:'build'},{origin:'https://evil.example'})).status,403);const r=await call('commands',{text:'Build a site',target:'developer'});assert.equal(r.status,200);const s=(await call('state')).body;assert.equal(s.tasks[0].owner,'ceo');assert.equal(s.tasks[0].status,'todo');assert.equal(s.accounts.length,0);});

test('knowledge API preserves revisions and protects task records with optimistic edits',async t=>{
 const call=await server(t);await call('login',{token:'integration-test-owner'});
 assert.equal((await call('knowledge/save',{path:'Research/Plan.md',content:'# Plan',version:null})).status,200);
 const first=(await call('knowledge/read',{path:'Research/Plan.md'})).body;
 assert.equal((await call('knowledge/save',{path:first.path,content:'# New plan',version:first.version})).status,200);
 assert.equal((await call('knowledge/save',{path:first.path,content:'stale',version:first.version})).status,400);
 const history=(await call('knowledge/history',{path:first.path})).body;
 const latest=(await call('knowledge/read',{path:first.path})).body;
 assert.equal((await call('knowledge/restore',{path:first.path,revisionId:history.revisions[0].id,version:latest.version})).status,200);
 assert.equal((await call('knowledge/read',{path:first.path})).body.content,'# Plan');
 assert.equal((await call('knowledge/read',{path:'../../.env'})).status,400);
 await call('commands',{text:'Original task'});const task=(await call('state')).body.tasks[0];
 const path='Projects/office/Tasks/'+task.id+'.md';const note=(await call('knowledge/read',{path})).body;
 assert.equal((await call('knowledge/save',{path,version:note.version,content:'broken'})).status,400);
 assert.equal((await call('tasks/edit',{id:task.id,version:note.version,title:'Revised task',instructions:'New instructions',acceptance:'Must pass',status:'done',owner:'deploy'})).status,200);
 const updated=(await call('state')).body.tasks[0];assert.equal(updated.status,'todo');assert.equal(updated.owner,'ceo');assert.equal(updated.title,'Revised task');
 assert.equal((await call('tasks/edit',{id:task.id,version:note.version,title:'Stale edit',instructions:'x',acceptance:'x'})).status,400);
 const a=(await call('accounts/add',{label:'Separate account'})).body;const commands=(await call('accounts/manual',{id:a.id})).body;
 assert.match(commands.powershell,/\$env:CODEX_HOME/);assert.match(commands.posix,/CODEX_HOME=/);assert.equal((await call('state')).body.accounts[0].home,undefined);
});
test('demo reset, account assignment and exact one-use approval gates',async t=>{const call=await server(t,true);let s=(await call('state')).body;assert.equal(s.employees.find(e=>e.id==='qa').state,'sleeping');await call('accounts/energy',{id:'seat-qa',consume:false,attemptId:'test'});s=(await call('state')).body;assert.equal(s.accounts.find(a=>a.id==='seat-qa').usage.primary.remaining,100);assert.equal((await call('employees/update',{id:'qa',accountId:'seat-developer'})).status,400);const a=(await call('releases/request',{deploymentId:'demo'})).body;assert.equal(a.status,'pending');assert.equal((await call('approvals/resolve',{id:a.id,approve:true})).status,200);assert.equal((await call('approvals/resolve',{id:a.id,approve:true})).status,400);s=(await call('state')).body;assert.equal(s.approvals[0].status,'demo-approved');assert.equal((await call('tasks/pr',{id:'demo-developer'})).status,400);});


test('account login API keeps account identities isolated and supports cancel/logout',async t=>{
 const call=await server(t,false,{PIXEL_CODEX_BIN:fileURLToPath(new URL('./fixtures/fake-codex.mjs',import.meta.url))});
 await call('login',{token:'integration-test-owner'});
 const a=(await call('accounts/add',{label:'First'})).body,b=(await call('accounts/add',{label:'Second'})).body;
 assert.equal((await call('accounts/connect',{id:a.id})).body.login.status,'pending');
 assert.equal((await call('accounts/connect',{id:b.id})).body.login.status,'pending');
 assert.equal((await call('accounts/refresh',{id:b.id})).status,400);
 await call('accounts/cancel',{id:b.id});
 let s;for(let i=0;i<30;i++){s=(await call('state')).body;if(s.accounts[0].login.status==='connected')break;await new Promise(r=>setTimeout(r,50));}
 assert.equal(s.accounts[0].connected,true);assert.equal(s.accounts[0].identity.email,a.id+'@example.test');assert.equal(s.accounts[0].login.code,undefined);
 assert.equal(s.accounts[1].connected,false);assert.equal(s.accounts[1].login.status,'cancelled');
 assert.equal((await call('accounts/logout',{id:a.id})).status,200);
 s=(await call('state')).body;assert.equal(s.accounts[0].connected,false);assert.equal(s.accounts[0].usage,null);assert.equal(s.accounts[0].login.status,'signed-out');
});
