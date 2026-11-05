import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,renameSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Knowledge} from './knowledge.mjs';
import {roles,idValid} from '../core/model.mjs';
export class Store {
 constructor(dir,{demo=false,vault}={}) {
  mkdirSync(dir,{recursive:true,mode:0o700});this.dir=dir;this.vault=vault||join(dir,'vault');
  for(const p of ['Company','Employees','Projects/office/Tasks','Inbox','Daily']) mkdirSync(join(this.vault,p),{recursive:true});
  this.db=new DatabaseSync(join(dir,'office.sqlite'));this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, value TEXT); CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, time INTEGER, text TEXT)');
  this.knowledge=new Knowledge(this.vault,this.db);
  this.state=this.get('state')||{employees:roles.map(r=>({...r,active:!r.optional,accountId:null,autoWake:false,paused:false})),accounts:[],approvals:[],settings:{project:'My first project'},demo};
  if(!this.get('state')&&demo) {
   this.state.settings.project='Studio / Launch website';
   this.state.accounts=roles.filter(r=>!r.optional).map((r,i)=>({id:'seat-'+r.id,label:r.name+' · Plus',connected:true,usage:{primary:{remaining:[78,44,0,62,91][i],minutes:300,resetsAt:Date.now()+(i===2?-1000:7200000)},secondary:{remaining:[64,35,23,81,88][i],minutes:10080,resetsAt:Date.now()+172800000},checkedAt:Date.now(),credits:i===2?1:0,source:'demo'}}));
   this.state.employees.forEach(e=>{if(!e.optional){e.accountId='seat-'+e.id;e.sleeping=e.id==='qa';}});
   for(const [i,r] of roles.slice(1,5).entries())this.task({id:'demo-'+r.id,owner:r.id,title:['Build the landing page','Test the mobile experience','Polish the design system','Prepare preview deployment'][i],instructions:'Example task in demo mode.',acceptance:'Demonstration only',status:['review','todo','done','todo'][i],branch:r.prefix+'/landing-page',createdAt:Date.now(),updatedAt:Date.now()});
   this.event('Office opened. Five employees are ready to meet you.');
  }
  this.save();
  const charter=join(this.vault,'Company/Charter.md');if(!existsSync(charter))writeFileSync(charter,'# Pixel Office\n\nThe CEO coordinates all commands. Production requires owner approval for an exact deployment and commit.\n');
 }
 get(id){const r=this.db.prepare('SELECT value FROM records WHERE id=?').get(id);return r?JSON.parse(r.value):null;}
 save(){this.db.prepare('INSERT OR REPLACE INTO records VALUES (?,?)').run('state',JSON.stringify(this.state));}
 event(text){this.db.prepare('INSERT INTO events(time,text) VALUES (?,?)').run(Date.now(),text);}
 events(){return this.db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT 50').all();}
 note(path,text){return this.knowledge.write(path,text,{internal:true});}
 task(t){if(!idValid(t.id))throw new Error('Invalid task id');const {output='',...meta}=t;this.note('Projects/office/Tasks/'+t.id+'.md','---\n'+Object.entries(meta).filter(([,v])=>v!==undefined).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n')+'\n---\n'+output);return t;}
 tasks(){return readdirSync(join(this.vault,'Projects/office/Tasks')).filter(f=>f.endsWith('.md')).map(f=>{try {const raw=readFileSync(join(this.vault,'Projects/office/Tasks',f),'utf8');const [,head,body]=raw.split(/^---\s*$/m);const task=Object.fromEntries(head.trim().split('\n').map(line=>{const i=line.indexOf(':');return [line.slice(0,i),JSON.parse(line.slice(i+1))];}));return {...task,output:body?.trim()||''};}catch{return null;}}).filter(Boolean).sort((a,b)=>a.createdAt-b.createdAt);}
 createTask(t){return this.task({id:randomUUID(),createdAt:Date.now(),updatedAt:Date.now(),status:'todo',...t});}
 close(){this.db.close();}
}

