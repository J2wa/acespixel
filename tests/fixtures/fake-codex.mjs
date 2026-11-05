#!/usr/bin/env node
import {createInterface} from 'node:readline';
const send=x=>process.stdout.write(JSON.stringify(x)+'\n');
createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(!m.id)return;
 if(m.method==='initialize')return send({id:m.id,result:{userAgent:'fixture'}});
 if(m.method==='account/rateLimits/read')return send({id:m.id,result:{rateLimits:{primary:{usedPercent:25,windowDurationMins:300}}}});
 if(m.method==='thread/start')return send({id:m.id,result:{thread:{id:'thread-test'}}});
 if(m.method==='turn/start'){send({id:m.id,result:{turn:{id:'turn-test'}}});send({method:'item/agentMessage/delta',params:{threadId:'thread-test',delta:'Working…'}});send({method:'item/completed',params:{threadId:'thread-test',item:{type:'agentMessage',text:'Final verified output'}}});send({method:'turn/completed',params:{threadId:'thread-test',turn:{id:'turn-test',status:'completed'}}});return;}
 send({id:m.id,error:{code:-32601,message:'Unsupported fixture method'}});
});
