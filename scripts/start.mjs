import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
if(Number(process.versions.node.split('.')[0])<24){console.error('Pixel Office needs Node.js 24 or newer.');process.exit(1);}
console.log('Starting Pixel Office manually. Keep this terminal open and your PC awake.');
console.log('Open the address below in your browser. Press Ctrl+C to stop. Nothing is installed at system startup.');
const child=spawn(process.execPath,['--env-file-if-exists=.env','server/index.mjs'],{cwd:root,stdio:'inherit',env:process.env});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code||0;});
process.on('SIGINT',()=>child.kill('SIGINT'));
process.on('SIGTERM',()=>child.kill('SIGTERM'));
