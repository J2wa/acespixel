import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,symlinkSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.mjs';
import {markdown} from '../public/markdown.js';
function setup(t){const dir=mkdtempSync(join(tmpdir(),'pixel-knowledge-'));let store=new Store(dir);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});return {dir,store,k:store.knowledge};}
test('notes survive restart, reject stale edits, and retain restorable revisions',t=>{
 const {dir,store,k}=setup(t);let n=k.write('Research/Idea.md','# Original',{expected:null});
 k.write('Research/Idea.md','# Edited',{expected:n.version});
 assert.throws(()=>k.write('Research/Idea.md','stale',{expected:n.version}),/changed/);
 assert.equal(k.read('Research/Idea.md').content,'# Edited');
 const rev=k.history('Research/Idea.md')[0];assert.equal(k.revision('Research/Idea.md',rev.id),'# Original');
 n=k.read('Research/Idea.md');k.write(n.path,k.revision(n.path,rev.id),{expected:n.version});
 const reopened=new Store(dir);assert.equal(reopened.knowledge.read(n.path).content,'# Original');reopened.close();
 assert.equal(k.list('original').notes.some(n=>n.path==='Research/Idea.md'),true);
});
test('task metadata, path traversal, symlinks and excessive imports are protected',t=>{
 const {dir,k,store}=setup(t);const task=store.createTask({title:'Test',owner:'developer'});const path='Projects/office/Tasks/'+task.id+'.md';
 assert.throws(()=>k.write(path,'replace',{expected:k.read(path).version}),/task board/);
 for(const path of ['../secret.md','/tmp/secret.md','Research/../../a.md','Research\\a.md','CON.md','Research/a.md/..','Research/a.md '])assert.throws(()=>k.write(path,'x',{expected:null}));
 symlinkSync(join(dir,'missing-target'),join(k.root,'link'));
 assert.throws(()=>k.write('link/a.md','escape',{expected:null}),/Symbolic/);
 assert.throws(()=>k.write('Big.md','x'.repeat(48001),{expected:null}),/48 KB/);
 assert.throws(()=>k.revision('Other.md','missing'),/not found/);
});
test('backlinks and prompt context include relevant notes without account data',t=>{
 const {k}=setup(t);k.write('Research/Ideas.md','Useful oranges',{expected:null});k.write('Research/Links.md','See [[Research/Ideas|ideas]]',{expected:null});
 assert.deepEqual(k.read('Research/Ideas.md').backlinks,['Research/Links.md']);
 const context=k.context({instructions:'Work on oranges'},'developer');assert.match(context,/Useful oranges/);assert.match(context,/Company\/Charter/);
});
test('Markdown preview escapes HTML and rejects executable links',()=>{
 const html=markdown('# Hello\n<script>alert(1)</script>\n[x](javascript:alert(1))\n[[A" onclick="alert(1)|Note]]\n```\n<img src=x onerror=alert(1)>\n```');
 assert.match(html,/<h1>Hello<\/h1>/);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('href="javascript:'));assert.ok(!html.includes('data-wiki="A"'));assert.match(html,/&lt;img/);
 assert.match(markdown('[OpenAI](https://openai.com)'),/rel="noopener noreferrer"/);
});
