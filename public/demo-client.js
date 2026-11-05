// Browser-only demonstration. Never sends commands or approvals to a live runtime.
export function createDemo(onChange){
 const definitions=[['ceo','Alex','CEO','#c5a5ff'],['developer','Kai','Developer','#7cb5ff'],['qa','Sam','QA tester','#7be0b4'],['designer','Mia','UI/UX designer','#f3a6c8'],['deploy','Leo','Deployment manager','#f3ca83'],['analyst','Jules','Business analyst','#8bdddf'],['database','Noah','Database operator','#ada8ff']];
 const now=Date.now(),employees=definitions.map(([id,name,role,color],i)=>({id,name,role,color,active:i<5,optional:i>=5,accountId:i<5?'demo-'+id:null,state:i===2?'sleeping':'idle',sleeping:i===2,autoWake:false,paused:false}));
 let state={demo:true,project:'Pixel Office · browser demo',employees,accounts:employees.filter(e=>e.active).map((e,i)=>({id:e.accountId,label:e.name+' · Plus',connected:true,usage:{primary:{remaining:[78,44,0,62,91][i],minutes:300,resetsAt:now+(i===2?-1000:7200000)},secondary:{remaining:[64,35,23,81,88][i],minutes:10080,resetsAt:now+172800000},checkedAt:now,credits:i===2?1:0,source:'browser demo'}})),tasks:[],approvals:[],events:[{id:1,time:now,text:'Browser demo opened. No live accounts, commands or deployments.'}],connections:{codex:false,github:false,vercel:false,vault:false,repository:null}};
 const log=text=>state.events.unshift({id:crypto.randomUUID(),time:Date.now(),text});
 const notify=()=>queueMicrotask(()=>onChange(structuredClone(state)));
 function refresh(){for(const e of state.employees){const a=state.accounts.find(a=>a.id===e.accountId);e.state=e.paused?'paused':e.sleeping?'sleeping':!a?'offline':'idle';}}
 return {async call(path,data={}){
  const e=state.employees.find(e=>e.id===data.id),a=state.accounts.find(a=>a.id===data.id);
  if(path==='state')return structuredClone(state);
  if(path==='commands'){const id=crypto.randomUUID();state.tasks.push({id,owner:'ceo',kind:'plan',title:data.text.slice(0,100),instructions:data.text,status:'done',acceptance:'Demo plan generated',output:'Simulated planning output. A connected Codex host creates the actual plan.',createdAt:Date.now()});state.tasks.push({id:crypto.randomUUID(),owner:data.target==='ceo'?'developer':data.target||'developer',title:data.text.slice(0,100),instructions:data.text,status:'todo',acceptance:'Demo task only',output:'',createdAt:Date.now()});log('Demo command routed through CEO. No Codex usage consumed.');}
  else if(path==='accounts/refresh'||path==='accounts/energy'){if(!a)throw new Error('Account not found');a.usage.checkedAt=Date.now();for(const w of [a.usage.primary,a.usage.secondary])if(w.resetsAt<=Date.now())w.remaining=100;if(data.consume&&a.usage.credits){a.usage.credits--;a.usage.primary.remaining=100;}if(path.endsWith('energy')&&a.usage.primary.remaining>0&&a.usage.secondary.remaining>0)state.employees.filter(e=>e.accountId===a.id).forEach(e=>e.sleeping=false);log('Demo usage refreshed.');}
  else if(path==='employees/update'){if(!e)throw new Error('Employee not found');if(data.accountId){if(state.employees.some(x=>x.id!==e.id&&x.accountId===data.accountId))throw new Error('Account already assigned');e.accountId=data.accountId;}if(typeof data.paused==='boolean')e.paused=data.paused;if(typeof data.autoWake==='boolean')e.autoWake=data.autoWake;}
  else if(path==='releases/request'){state.approvals.push({id:crypto.randomUUID(),type:'production',status:'pending',title:'Demo production approval',sha:'demo-8b34e2a',createdAt:Date.now(),expiresAt:Date.now()+900000});log('Demo approval prepared. This cannot deploy.');}
  else if(path==='approvals/resolve'){const approval=state.approvals.find(a=>a.id===data.id);if(!approval||approval.status!=='pending'||approval.expiresAt<Date.now())throw new Error('Approval expired or already handled');approval.status=data.approve?'demo-approved':'rejected';log('Demo approval '+approval.status+'. No deployment occurred.');}
  else if(path==='accounts/add'||path==='employees/hire')throw new Error('Connect the live runtime to add real employee accounts.');
  else throw new Error('This action requires the live Codex runtime.');
  refresh();notify();return {ok:true};
 }};
}
