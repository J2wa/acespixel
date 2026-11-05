// Built into PixelOffice.exe using Node's Single Executable Application support.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {spawn,spawnSync}=require('node:child_process');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function unpack(bytes,destination){
 const raw=zlib.gunzipSync(bytes),headerSize=raw.readUInt32LE(0);
 if(headerSize<2||headerSize>10000000||headerSize+4>raw.length)throw new Error('Invalid application archive');
 const manifest=JSON.parse(raw.subarray(4,4+headerSize).toString('utf8'));let cursor=4+headerSize;
 for(const item of manifest){
  if(typeof item.path!=='string'||item.path.includes('\\')||item.path.includes(':')||item.path.split('/').some(p=>!p||p==='.'||p==='..')||!Number.isSafeInteger(item.size)||item.size<0)throw new Error('Invalid packaged file');
  const file=path.resolve(destination,item.path);if(!file.startsWith(path.resolve(destination)+path.sep))throw new Error('Invalid packaged path');
  const content=raw.subarray(cursor,cursor+item.size);cursor+=item.size;
  if(content.length!==item.size||digest(content)!==item.sha256)throw new Error('Packaged file checksum mismatch: '+item.path);
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);
 }
 if(cursor!==raw.length)throw new Error('Unexpected archive data');
 return manifest;
}
function checked(command,args,options={}){const r=spawnSync(command,args,{encoding:'utf8',windowsHide:true,...options});if(r.error||r.status!==0)throw new Error(r.error?.message||r.stderr||'Bundled tool failed');return r.stdout.trim();}
async function main(){
 if(process.platform!=='win32')throw new Error('This executable is for Windows x64.');
 const sea=require('node:sea');const meta=JSON.parse(sea.getAsset('meta','utf8'));
 const root=path.join(process.env.LOCALAPPDATA||path.join(require('node:os').homedir(),'AppData','Local'),'PixelOffice');
 const app=path.join(root,'versions',meta.id),data=path.join(root,'data'),config=path.join(root,'config');
 fs.mkdirSync(root,{recursive:true});fs.mkdirSync(config,{recursive:true});
 const lock=path.join(root,'runtime.lock');let owned=false;
 try{const pid=Number(fs.readFileSync(lock,'utf8'));if(pid){try{process.kill(pid,0);throw new Error('Pixel Office is already running. Use its existing browser window or stop that runtime first.');}catch(e){if(e.code!=='ESRCH')throw e;}}fs.unlinkSync(lock);}catch(e){if(e.code!=='ENOENT')throw e;}
 const fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));fs.closeSync(fd);owned=true;
 const release=()=>{if(owned){owned=false;try{fs.unlinkSync(lock);}catch{}}};process.on('exit',release);
 try{
  const marker=path.join(app,'installed.json');
  let valid=false;try{const manifest=JSON.parse(fs.readFileSync(marker,'utf8'));valid=manifest.length>0&&manifest.every(f=>digest(fs.readFileSync(path.join(app,f.path)))===f.sha256);}catch{}
  if(!valid){
   console.log('Preparing bundled tools for this Windows account…');
   const bytes=Buffer.from(sea.getAsset('payload'));if(digest(bytes)!==meta.payloadSha256)throw new Error('Application payload is damaged. Download a fresh copy.');
   const stage=app+'.stage-'+process.pid;fs.rmSync(stage,{recursive:true,force:true});
   const manifest=unpack(bytes,stage);fs.writeFileSync(path.join(stage,'installed.json'),JSON.stringify(manifest));
   fs.rmSync(app,{recursive:true,force:true});fs.renameSync(stage,app);
  }
  const node=path.join(app,'tools/node/node.exe'),gitDir=path.join(app,'tools/git/cmd'),codex=path.join(app,meta.codexPath);
  const env={...process.env};for(const key of Object.keys(env))if(key.toUpperCase()==='PATH')delete env[key];
  env.PATH=[path.dirname(node),path.dirname(codex),path.join(path.dirname(codex),'../codex-path'),gitDir,path.join(app,'tools/git/usr/bin'),process.env.PATH||process.env.Path||''].join(';');
  // These defaults do not overwrite the user's editable config file.
  const envFile=path.join(config,'.env');if(!fs.existsSync(envFile))fs.copyFileSync(path.join(app,'app/.env.example'),envFile);
  console.log('Pixel Office '+meta.version+' · manual startup');
  console.log('Configuration: '+envFile);console.log('Saved accounts and notes: '+data);
  if(process.argv.includes('--self-test')){
   console.log(checked(node,['-e',"const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(':memory:');d.exec('SELECT 1');d.close();console.log('Node and SQLite OK')"],{env}));
   console.log(checked(path.join(gitDir,'git.exe'),['--version'],{env}));console.log(checked(codex,['--version'],{env}));
   const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'pixel-exe-test-'));
   const smoke=spawn(node,[path.join(app,'app/server/index.mjs')],{cwd:temp,env:{...env,HOST:'127.0.0.1',PORT:'0',PIXEL_OWNER_TOKEN:'packaging-test',PIXEL_DATA_DIR:temp,PIXEL_CODEX_BIN:codex},stdio:['ignore','pipe','pipe'],windowsHide:true});
   try{
    const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Packaged server did not start')),15000);smoke.on('error',reject);smoke.stdout.on('data',chunk=>{const match=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});});
    if(!(await fetch(url)).ok||!(await fetch(url+'/knowledge.js')).ok)throw new Error('Packaged UI failed');
    const r=await fetch(url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'packaging-test'})});
    const s=await fetch(url+'/api/state',{headers:{cookie:r.headers.get('set-cookie').split(';')[0]}});if(!s.ok)throw new Error('Packaged API failed');
    console.log('Packaged UI, owner login, and persistent API OK');
   }finally{smoke.kill();if(smoke.exitCode===null&&smoke.signalCode===null)await new Promise(r=>smoke.once('exit',r));fs.rmSync(temp,{recursive:true,force:true});}
   return;
  }
  // Use a bootstrap so .env overrides defaults, while bundled executable paths stay authoritative.
  env.PIXEL_PACKAGED_DATA=data;env.PIXEL_PACKAGED_CODEX=codex;
  const child=spawn(node,[path.join(app,'app/scripts/packaged-start.mjs')],{cwd:config,env,stdio:['inherit','pipe','inherit'],windowsHide:false});
  child.on('spawn',()=>fs.writeFileSync(lock,String(child.pid)));
  let opened=false,pending='';child.stdout.on('data',chunk=>{process.stdout.write(chunk);pending=(pending+chunk.toString()).slice(-4096);const m=pending.match(/http:\/\/(?:127\.0\.0\.1|0\.0\.0\.0|localhost):(\d+)/);if(!opened&&m){opened=true;const url='http://127.0.0.1:'+m[1];const browser=spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','rundll32.exe'),['url.dll,FileProtocolHandler',url],{stdio:'ignore',windowsHide:true});browser.on('error',()=>console.log('Open '+url+' in your browser.'));browser.unref();}});
  console.log('Keep this window open and your PC awake. Press Ctrl+C to stop.');
  for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.on(signal,()=>child.kill(signal));
  await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code?reject(new Error('Runtime exited with code '+code)):resolve());});
 }finally{release();}
}
if(require('node:sea').isSea())main().catch(error=>{console.error('\nPixel Office: '+error.message);process.exitCode=1;if(process.stdin.isTTY){console.log('Press Enter to close.');process.stdin.resume();process.stdin.once('data',()=>process.stdin.pause());}});
else module.exports={unpack,digest};
