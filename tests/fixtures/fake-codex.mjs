#!/usr/bin/env node
import {createInterface} from 'node:readline';
import {existsSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,basename} from 'node:path';
const home=process.env.CODEX_HOME,auth=join(home,'fixture-login.json');let loginTimer;
const send=x=>process.stdout.write(JSON.stringify(x)+'\n');
createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(!m.id)return;
 if(m.method==='initialize')return send({id:m.id,result:{userAgent:'fixture'}});
 if(m.method==='account/read')return send({id:m.id,result:{account:existsSync(auth)?{type:'chatgpt',email:basename(home)+'@example.test',planType:'plus'}:null}});
 if(m.method==='account/logout'){clearTimeout(loginTimer);rmSync(auth,{force:true});return send({id:m.id,result:{}});}
 if(m.method==='account/login/start'){
  send({id:m.id,result:{type:'chatgptDeviceCode',loginId:'fixture-login',verificationUrl:'https://auth.openai.com/codex/device',userCode:'TEST-ONLY'}});
  loginTimer=setTimeout(()=>{mkdirSync(home,{recursive:true});writeFileSync(auth,'{}');send({method:'account/login/completed',params:{loginId:'fixture-login',success:true}});},500);return;
 }
 if(m.method==='account/login/cancel'){clearTimeout(loginTimer);return send({id:m.id,result:{}});}
 if(m.method==='account/rateLimits/read')return send({id:m.id,result:{rateLimits:{primary:{usedPercent:25,windowDurationMins:300}}}});
 if(m.method==='thread/start')return send({id:m.id,result:{thread:{id:'thread-test'}}});
 if(m.method==='turn/start'){send({id:m.id,result:{turn:{id:'turn-test'}}});send({method:'item/agentMessage/delta',params:{threadId:'thread-test',delta:'Working…'}});send({method:'item/completed',params:{threadId:'thread-test',item:{type:'agentMessage',text:'Final verified output'}}});send({method:'turn/completed',params:{threadId:'thread-test',turn:{id:'turn-test',status:'completed'}}});return;}
 send({id:m.id,error:{code:-32601,message:'Unsupported fixture method'}});
});

