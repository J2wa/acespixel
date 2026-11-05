import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {EventEmitter} from 'node:events';
// One process and private CODEX_HOME per employee-owned account. No shell interpolation.
export class Codex extends EventEmitter {
 constructor(home,bin='codex'){super();this.home=home;this.bin=bin;this.pending=new Map();this.seq=0;}
 async start(){
  if(this.ready)return this.ready;
  this.ready=(async()=>{
   const env={};for(const k of ['PATH','HOME','USER','TMPDIR','TEMP','SystemRoot'])if(process.env[k])env[k]=process.env[k];env.CODEX_HOME=this.home;
   this.proc=spawn(this.bin,['app-server'],{env,stdio:['pipe','pipe','pipe']});
   this.proc.stdin.on('error',()=>{});this.proc.stderr.on('data',()=>{});
   const fail=error=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();this.ready=null;this.emit('offline',error);};
   this.proc.on('error',fail);this.proc.on('exit',()=>fail(new Error('Codex process stopped')));
   createInterface({input:this.proc.stdout}).on('line',line=>{let m;try{m=JSON.parse(line);}catch{return;}
    if(m.id!==undefined && m.method){ // Never silently approve tool escalation.
     this.proc.stdin.write(JSON.stringify({id:m.id,error:{code:-32601,message:'Interactive escalation is disabled in Pixel Office. Revise the task within its sandbox.'}})+'\n');return;
    }
    if(m.id!==undefined){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}
    else this.emit('notification',m);
   });
   await this.request('initialize',{clientInfo:{name:'pixel_office',title:'Pixel Office',version:'0.1.0'}});
   this.proc.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');
  })();return this.ready;
 }
 request(method,params={}){return new Promise((resolve,reject)=>{const id=++this.seq;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Codex request timed out: '+method));},30000);this.pending.set(id,{resolve,reject,timer});this.proc.stdin.write(JSON.stringify({id,method,params})+'\n');});}
 async run(text,cwd,{readOnly=false,onText=()=>{}}={}){
  await this.start();let threadId;let timer;
  const thread=await this.request('thread/start',{cwd,approvalPolicy:'never',sandbox:readOnly?'read-only':'workspace-write',ephemeral:true});threadId=thread.thread.id;
  return await new Promise((resolve,reject)=>{
   let output='';const cleanup=()=>{clearTimeout(timer);this.off('notification',listener);this.off('offline',offline);};
   const offline=e=>{cleanup();reject(e);};
   const listener=m=>{if(m.params?.threadId!==threadId)return;
    if(m.method==='item/agentMessage/delta'){output+=m.params.delta;onText(output);}
    if(m.method==='item/completed'&&m.params.item?.type==='agentMessage'){output=m.params.item.text;onText(output);}
    if(m.method==='turn/completed'){cleanup();m.params.turn.status==='completed'?resolve(output):reject(new Error(m.params.turn.error?.message||'Codex turn '+m.params.turn.status));}
   };
   this.on('notification',listener);this.on('offline',offline);
   timer=setTimeout(()=>{cleanup();this.stop();reject(new Error('Task exceeded 30 minutes. Worktree retained.'));},1800000);
   this.request('turn/start',{threadId,input:[{type:'text',text}]}).catch(e=>{cleanup();reject(e);});
  });
 }
 stop(){this.proc?.kill();this.ready=null;}
}
