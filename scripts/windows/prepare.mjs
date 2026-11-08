import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {gzipSync} from 'node:zlib';
const root=resolve('.'),out=resolve(process.argv[2]||'windows-build');mkdirSync(out,{recursive:true});
const files=[];function collect(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory())collect(p);else if(entry.isFile())files.push({path:relative(root,p).replaceAll('\\','/'),data:readFileSync(p).toString('base64')});}}
for(const dir of ['core','server','public','vault-template'])collect(join(root,dir));
files.push({path:'package.json',data:readFileSync('package.json').toString('base64')});
writeFileSync(join(out,'application.gz'),gzipSync(JSON.stringify(files)));
writeFileSync(join(out,'sea-config.json'),JSON.stringify({main:join(root,'scripts/windows/launcher.cjs'),output:join(out,'sea.blob'),disableExperimentalSEAWarning:true,useSnapshot:false,useCodeCache:false,assets:{application:join(out,'application.gz')}}));
console.log('Prepared '+files.length+' application files. No credentials or runtime data included.');
