import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {AccountLogin} from '../server/account-login.mjs';
class Client extends EventEmitter{
 calls=[];async start(){}stop(){this.emit('offline');}
 async request(method,params){this.calls.push({method,params});if(method==='account/login/start')return {loginId:'attempt',verificationUrl:'https://auth.openai.com/codex/device',userCode:'ABCD-1234'};return {};}
}
test('device login verifies only its own completion and clears temporary code',async t=>{
 const c=new Client();let verified=0;const login=new AccountLogin(c,{verified:async()=>verified++});t.after(()=>login.close());
 await login.start();assert.equal(login.state.status,'pending');await assert.rejects(()=>login.start(),/already/);
 await login.complete({loginId:'other',success:true});assert.equal(verified,0);
 await login.complete({loginId:'attempt',success:true});assert.equal(verified,1);assert.deepEqual(login.state,{status:'connected'});
 await login.logout();assert.equal(login.state.status,'signed-out');assert.equal(c.calls.at(-1).method,'account/logout');
});
test('cancelled and expired logins cannot become connected from late notifications',async t=>{
 const c=new Client();let verified=0;const login=new AccountLogin(c,{verified:async()=>verified++,timeoutMs:15});t.after(()=>login.close());
 await login.start();await login.cancel();await login.complete({loginId:'attempt',success:true});assert.equal(verified,0);assert.equal(login.state.status,'cancelled');
 await login.start();await new Promise(r=>setTimeout(r,40));assert.equal(login.state.status,'expired');assert.equal(login.state.code,undefined);
});
test('unsupported device auth fails visibly without returning raw provider errors',async t=>{
 const c=new Client();c.request=async()=>{throw new Error('SECRET raw error');};const login=new AccountLogin(c);t.after(()=>login.close());await login.start();assert.equal(login.state.status,'failed');assert.ok(!login.state.error.includes('SECRET'));
});
test('unexpected verification origins are rejected',async t=>{
 const c=new Client();c.request=async m=>m==='account/login/start'?{loginId:'id',verificationUrl:'https://evil.example',userCode:'CODE'}:{};
 const login=new AccountLogin(c);t.after(()=>login.close());await login.start();assert.equal(login.state.status,'failed');assert.equal(login.state.url,undefined);
});
