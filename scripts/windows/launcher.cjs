// ACES Pixel portable host. All application files are embedded in the SEA.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,execFileSync}=require('node:child_process');
const {randomBytes,createHash}=require('node:crypto');
const {createRequire}=require('node:module');
const {gunzipSync}=require('node:zlib');
const sea=require('node:sea');
async function main(){
 const payload=Buffer.from(sea.getAsset('application'));
 const release=createHash('sha256').update(payload).digest('hex').slice(0,16);
 const home=process.env.PIXEL_DESKTOP_HOME||path.join(process.env.LOCALAPPDATA||os.homedir(),'ACESPixel');
 const app=path.join(home,'versions',release);fs.mkdirSync(app,{recursive:true});
 for(const entry of JSON.parse(gunzipSync(payload))){const target=path.resolve(app,entry.path);if(!target.startsWith(app+path.sep))throw new Error('Invalid package path');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,Buffer.from(entry.data,'base64'));}
 const data=path.join(home,'data');fs.mkdirSync(data,{recursive:true,mode:0o700});
 const tokenFile=path.join(data,'owner-token.txt');if(!fs.existsSync(tokenFile))fs.writeFileSync(tokenFile,randomBytes(24).toString('hex'),{mode:0o600});
 process.env.PIXEL_OWNER_TOKEN=fs.readFileSync(tokenFile,'utf8').trim();process.env.PIXEL_DATA_DIR=data;
 // Only the local machine can reach the desktop host by default.
 process.env.HOST='127.0.0.1';process.env.PORT=process.env.PIXEL_DESKTOP_PORT||'4317';
 const url='http://127.0.0.1:'+process.env.PORT;
 try{const response=await fetch(url+'/api/state',{signal:AbortSignal.timeout(800)});if(response.ok||response.status===401){console.log('An office is already listening at '+url+'. Stop it before launching another copy.');open(url);return;}}catch{}
 if(process.platform==='win32'&&!process.env.PIXEL_CODEX_BIN){
  const candidates=[];try{candidates.push(...execFileSync('where.exe',['codex.exe'],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/));}catch{}
  const roots=[path.join(process.env.APPDATA||home,'npm','node_modules','@openai'),path.join(process.env.ProgramFiles||'C:\\Program Files','nodejs','node_modules','@openai')];
  function find(dir,depth=0){if(depth>8||!fs.existsSync(dir))return;for(const f of fs.readdirSync(dir,{withFileTypes:true})){if(f.isSymbolicLink())continue;const full=path.join(dir,f.name);if(f.isDirectory())find(full,depth+1);else if(f.name.toLowerCase()==='codex.exe')candidates.push(full);}}
  roots.forEach(r=>find(r));const binary=candidates.find(p=>fs.existsSync(p));if(binary)process.env.PIXEL_CODEX_BIN=binary;
 }
 console.log('\nACES PIXEL — Windows portable office\n');
 console.log('Open: '+url+'\nOwner sign-in token: '+process.env.PIXEL_OWNER_TOKEN+'\n');
 console.log('Data and account logins: '+data+'\nKeep this window open while your employees work. Ctrl+C stops the office.\n');
 try{execFileSync('git',['--version'],{stdio:'ignore',windowsHide:true});}catch{console.log('Git is not installed or not on PATH. Install Git for Windows before connecting a repository.');}
 if(process.platform==='win32'&&!process.env.PIXEL_CODEX_BIN)console.log('Install Codex CLI, then restart this EXE. The interface works before Codex is connected.');
 let attempts=0;const timer=setInterval(async()=>{try{const r=await fetch(url+'/api/state',{signal:AbortSignal.timeout(1000)});if(r.status===401||r.ok){clearInterval(timer);open(url);}}catch{}if(++attempts>30)clearInterval(timer);},500);
 createRequire(path.join(app,'package.json'))(path.join(app,'server','index.mjs'));
}
function open(url){if(process.env.PIXEL_DESKTOP_NO_BROWSER==='1')return;if(process.platform==='win32'){const child=spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{detached:true,stdio:'ignore',windowsHide:true});child.on('error',()=>console.log('Open '+url+' in your browser.'));child.unref();}}
main().catch(error=>{console.error('Could not start ACES Pixel:',error.message);console.error('Close any existing copy, then try again. Your saved data has not been deleted.');setTimeout(()=>process.exit(1),30000);});
