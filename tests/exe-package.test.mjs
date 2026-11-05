import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
const {unpack,digest}=createRequire(import.meta.url)('../scripts/exe-launcher.cjs');
function archive(entries){const files=entries.map(e=>Buffer.from(e.content));const header=Buffer.from(JSON.stringify(entries.map((e,i)=>({path:e.path,size:files[i].length,sha256:digest(files[i])}))));const size=Buffer.alloc(4);size.writeUInt32LE(header.length);return gzipSync(Buffer.concat([size,header,...files]));}
test('executable payload extracts exact bytes without touching persistent data',()=>{const dir=mkdtempSync(join(tmpdir(),'pixel-unpack-'));try{const files=unpack(archive([{path:'app/server.mjs',content:'export const ok=true;'}, {path:'tools/example.exe',content:'MZ-test'}]),dir);assert.equal(files.length,2);assert.equal(readFileSync(join(dir,'tools/example.exe'),'utf8'),'MZ-test');}finally{rmSync(dir,{recursive:true,force:true});}});
test('executable payload refuses unsafe paths and corrupted bytes',()=>{const dir=mkdtempSync(join(tmpdir(),'pixel-unpack-'));try{for(const path of ['../escape','C:/escape','/escape','a/../escape','a\\escape'])assert.throws(()=>unpack(archive([{path,content:'x'}]),dir),/Invalid packaged/);const bad=archive([{path:'ok',content:'x'}]);bad[bad.length-8]^=1;assert.throws(()=>unpack(bad,dir));}finally{rmSync(dir,{recursive:true,force:true});}});
