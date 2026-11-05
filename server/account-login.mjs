// Uses the official Codex app-server device-code flow. Codes live only in memory.
export class AccountLogin {
 constructor(client,{changed=()=>{},verified=async()=>{},timeoutMs=600000}={}){
  this.client=client;this.changed=changed;this.verified=verified;this.timeoutMs=timeoutMs;this.state={status:'idle'};this.generation=0;
  this.listener=m=>{if(m.method==='account/login/completed'){
   if(this.state.status==='starting')this.early=m.params;
   else this.complete(m.params);
  }};
  client.on('notification',this.listener);
  client.on('offline',()=>{if(this.busy){this.generation++;this.set({status:'failed',error:'Codex stopped. Start a new login.'});}});
 }
 get busy(){return ['starting','pending','verifying'].includes(this.state.status);}
 set(state){clearTimeout(this.timer);this.state=state;this.changed();}
 async start(){
  if(this.busy)throw new Error('A login is already in progress.');
  const generation=++this.generation;this.early=null;this.set({status:'starting'});
  try{
   await this.client.start();
   await this.client.request('account/logout');
   const r=await this.client.request('account/login/start',{type:'chatgptDeviceCode'});
   if(generation!==this.generation)return;
   const url=new URL(r.verificationUrl);
   if(url.origin!=='https://auth.openai.com'||url.username||url.password||typeof r.loginId!=='string'||typeof r.userCode!=='string')throw new Error('Unexpected login response');
   this.set({status:'pending',loginId:r.loginId,url:url.href,code:r.userCode,expiresAt:Date.now()+this.timeoutMs});
   this.timer=setTimeout(()=>this.cancel('expired').catch(()=>{}),this.timeoutMs);this.timer.unref?.();
   if(this.early){const early=this.early;this.early=null;await this.complete(early);}
  }catch{
   if(generation===this.generation)this.set({status:'failed',error:'Device login could not start. Update Codex CLI, enable device-code login in ChatGPT settings, or use the manual CLI command.'});
  }
 }
 async complete(p){
  if(this.state.status!=='pending'||p.loginId!==this.state.loginId)return;
  const generation=this.generation;
  if(!p.success){this.set({status:'failed',error:'Sign-in was cancelled, expired, or rejected. Start a new login.'});return;}
  this.set({status:'verifying'});
  try{await this.verified();if(generation===this.generation)this.set({status:'connected'});}
  catch{if(generation===this.generation)this.set({status:'failed',error:'Could not verify the connected account. Check usage or reconnect.'});}
 }
 async cancel(status='cancelled'){
  const id=this.state.loginId;++this.generation;this.early=null;this.set({status});
  if(id)try{await this.client.request('account/login/cancel',{loginId:id});await this.client.request('account/logout');}catch{this.client.stop();}
  else this.client.stop();
 }
 async logout(){await this.cancel('idle');await this.client.start();await this.client.request('account/logout');this.set({status:'signed-out'});}
 close(){clearTimeout(this.timer);this.generation++;this.client.off('notification',this.listener);}
}
