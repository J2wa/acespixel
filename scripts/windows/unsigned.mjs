// A modified Node binary cannot retain Node's Authenticode signature.
import {readFileSync,writeFileSync} from 'node:fs';
const file=process.argv[2],b=readFileSync(file);if(b.toString('ascii',0,2)!=='MZ')throw new Error('Expected a Windows PE executable');
const pe=b.readUInt32LE(0x3c);if(b.toString('ascii',pe,pe+4)!=='PE\0\0'||b.readUInt16LE(pe+24)!==0x20b)throw new Error('Expected PE32+');
const certificateDirectory=pe+24+112+4*8;b.writeUInt32LE(0,certificateDirectory);b.writeUInt32LE(0,certificateDirectory+4);writeFileSync(file,b);console.log('Packaged executable is explicitly unsigned.');
