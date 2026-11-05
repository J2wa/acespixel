import {existsSync} from 'node:fs';
import {delimiter,dirname,join,extname} from 'node:path';

// npm installs codex.cmd on Windows. Invoke its JS entry point directly; never use a shell.
export function launchSpec(bin='codex',platform=process.platform,searchPath=process.env.PATH||''){
 if(/\.(mjs|cjs|js)$/i.test(bin))return {command:process.execPath,args:[bin]};
 if(platform!=='win32')return {command:bin,args:[]};
 const dirs=bin==='codex'?searchPath.split(delimiter):[dirname(bin)];
 for(const dir of dirs){
  const js=join(dir,'node_modules','@openai','codex','bin','codex.js');
  if(existsSync(js))return {command:process.execPath,args:[js]};
  const exe=join(dir,'codex.exe');if(bin==='codex'&&existsSync(exe))return {command:exe,args:[]};
 }
 if(extname(bin).toLowerCase()==='.cmd'||bin==='codex')throw new Error('Codex CLI not found. Install it with npm install -g @openai/codex, then reopen the terminal.');
 return {command:bin,args:[]};
}
