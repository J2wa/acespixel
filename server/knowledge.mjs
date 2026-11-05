import {mkdirSync,readFileSync,writeFileSync,renameSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,join,relative,sep,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const hash=text=>createHash('sha256').update(text).digest('hex');
const maxBytes=48000;
export class Knowledge {
 constructor(root,db){
  this.root=resolve(root);this.db=db;
  db.exec('CREATE TABLE IF NOT EXISTS note_revisions (id TEXT PRIMARY KEY, path TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS note_revision_path ON note_revisions(path,created_at)');
 }
 path(name,{folder=false}={}){
  if(typeof name!=='string'||name.length>240||!name||name.includes('\\')||name.split('/').some(p=>!p||p==='.'||p==='..'||! /^[A-Za-z0-9_ .-]+$/.test(p)||/[. ]$/.test(p)||/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(p)))throw new Error('Use a relative folder/note path with letters, numbers, spaces, dots, underscores or hyphens.');
  if(!folder&&!name.endsWith('.md'))throw new Error('Notes must end in .md');
  const file=resolve(this.root,name);if(!file.startsWith(this.root+sep))throw new Error('Invalid note path');
  let parent=this.root;
  for(const part of relative(this.root,file).split(sep)){parent=join(parent,part);let stat;try{stat=lstatSync(parent);}catch(error){if(error.code!=='ENOENT')throw error;}if(stat?.isSymbolicLink())throw new Error('Symbolic links are not supported in the workspace');}
  return file;
 }
 protected(name){return name.toLowerCase().startsWith('projects/office/tasks/');}
 list(query=''){
  const notes=[],folders=[];const walk=(dir,prefix='')=>{for(const entry of readdirSync(dir,{withFileTypes:true})){
   if(entry.isSymbolicLink())continue;const name=prefix+entry.name;
   if(entry.isDirectory()){folders.push(name);walk(join(dir,entry.name),name+'/');}
   else if(entry.isFile()&&name.endsWith('.md')){const text=readFileSync(join(dir,entry.name),'utf8');if(!query|| (name+'\n'+text).toLowerCase().includes(query.toLowerCase()))notes.push({path:name,version:hash(text),readOnly:this.protected(name)});}
  }};walk(this.root);return {notes:notes.sort((a,b)=>a.path.localeCompare(b.path)),folders:folders.sort()};
 }
 read(name){const content=readFileSync(this.path(name),'utf8');return {path:name,content,version:hash(content),readOnly:this.protected(name),backlinks:this.backlinks(name)};}
 backlinks(name){const stem=name.slice(0,-3),short=stem.split('/').at(-1);return this.list().notes.filter(n=>n.path!==name&&[...readFileSync(this.path(n.path),'utf8').matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].some(m=>[stem,name,short].includes(m[1].trim()))).map(n=>n.path);}
 write(name,content,{expected,internal=false}={}){
  const file=this.path(name);if(!internal&&this.protected(name))throw new Error('Task notes are managed by the task board. Edit their structured fields there.');
  if(typeof content!=='string'||(!internal&&Buffer.byteLength(content)>maxBytes))throw new Error('Note must be text, up to 48 KB.');
  const previous=existsSync(file)?readFileSync(file,'utf8'):null;
  if(!internal&&expected!==(previous===null?null:hash(previous)))throw new Error('This note changed. Reload it before saving; your draft has been kept.');
  if(previous===content)return {path:name,version:hash(content)};
  if(previous!==null)this.db.prepare('INSERT INTO note_revisions VALUES (?,?,?,?)').run(randomUUID(),name,previous,Date.now());
  mkdirSync(dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';writeFileSync(temp,content,{mode:0o600});renameSync(temp,file);
  // Keep a bounded local history, including the version immediately before each edit.
  this.db.prepare('DELETE FROM note_revisions WHERE path=? AND id NOT IN (SELECT id FROM note_revisions WHERE path=? ORDER BY created_at DESC,rowid DESC LIMIT 40)').run(name,name);
  return {path:name,version:hash(content)};
 }
 history(name){this.path(name);return this.db.prepare('SELECT id,created_at AS createdAt FROM note_revisions WHERE path=? ORDER BY created_at DESC,rowid DESC').all(name);}
 revision(name,id){this.path(name);const r=this.db.prepare('SELECT content FROM note_revisions WHERE path=? AND id=?').get(name,id);if(!r)throw new Error('Revision not found');return r.content;}
 folder(name){mkdirSync(this.path(name,{folder:true}),{recursive:true});}
 context(task,employee){
  const terms=(task.instructions||'').toLowerCase().match(/[a-z0-9]{4,}/g)||[];
  return this.list().notes.filter(n=>!this.protected(n.path)).map(n=>{const content=readFileSync(this.path(n.path),'utf8');const score=['Company/Charter.md','Projects/office/Brief.md','Employees/'+employee+'.md'].includes(n.path)?100:terms.reduce((s,w)=>s+(content+' '+n.path).toLowerCase().includes(w),0);return {...n,content,score};}).filter(n=>n.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(n=>'### '+n.path+'\n'+n.content.slice(0,4000)).join('\n\n').slice(0,14000);
 }
}
