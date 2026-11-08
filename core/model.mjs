export const roles = [
 {id:'ceo',name:'Founder',role:'CEO / Founder',color:'#c5a5ff',prefix:'plan'},
 {id:'developer',name:'Engineer',role:'Staff Engineer',color:'#7cb5ff',prefix:'feat'},
 {id:'qa',name:'QA',role:'QA Lead',color:'#7be0b4',prefix:'qa'},
 {id:'designer',name:'Designer',role:'Senior Designer',color:'#f3a6c8',prefix:'design'},
 {id:'deploy',name:'Release',role:'Release Engineer',color:'#f3ca83',prefix:'deploy'},
 {id:'analyst',name:'Advisor',role:'YC Office Hours',color:'#8bdddf',prefix:'analysis',optional:true},
 {id:'database',name:'Manager',role:'Eng Manager',color:'#ada8ff',prefix:'db',optional:true}
];
export const idValid = id => typeof id==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
export function normalizeUsage(raw, now=Date.now()) {
 const r=raw.rateLimitsByLimitId?.codex ?? raw.rateLimits;
 if(!r) throw new Error('Codex did not report a usage snapshot.');
 const window = w => w && Number.isFinite(w.usedPercent) ? {remaining:Math.max(0,Math.min(100,100-w.usedPercent)),minutes:w.windowDurationMins ?? null,resetsAt:w.resetsAt? w.resetsAt*1000:null}:null;
 return {primary:window(r.primary),secondary:window(r.secondary),blocked:!!r.rateLimitReachedType,credits:raw.rateLimitResetCredits?.availableCount ?? 0,creditDetails:raw.rateLimitResetCredits?.credits ?? [],checkedAt:now,source:'codex'};
}
export function available(a,now=Date.now()) {
 return !!a?.connected && !!a.usage && now-a.usage.checkedAt<180000 && !a.usage.blocked && !!a.usage.primary && [a.usage.primary,a.usage.secondary].filter(Boolean).every(w=>w.remaining>0);
}
export function employeeState(e,a,running=false) {
 if(running) return 'working';
 if(e.paused) return 'paused';
 if(!a?.connected) return 'offline';
 if(a.usage?.blocked || [a.usage?.primary,a.usage?.secondary].some(w=>w?.remaining===0)) return 'sleeping';
 if(!available(a)) return 'unknown';
 if(e.sleeping) return 'sleeping';
 return Math.min(...[a.usage.primary,a.usage.secondary].filter(Boolean).map(w=>w.remaining))<15?'tired':'idle';
}
export function validatePlan(plan) {
 if(!Array.isArray(plan.tasks)||!plan.tasks.length||plan.tasks.length>12) throw new Error('CEO plan must contain 1–12 tasks.');
 return plan.tasks.map(t=>{
 if(!roles.some(r=>r.id===t.owner && r.id!=='ceo')) throw new Error('Invalid task owner');
 if(typeof t.title!=='string'||!t.title.trim()||typeof t.instructions!=='string') throw new Error('Invalid task instructions');
 return {owner:t.owner,title:t.title.slice(0,140),instructions:t.instructions.slice(0,16000),acceptance:String(t.acceptance||'Review task output').slice(0,4000)};
 });
}
export function canApprove(a,now=Date.now()) {return a?.status==='pending' && a.expiresAt>now;}
