"""Build PixelOffice.exe with Node SEA. Run with Node 24.22.1 and Python 3.11+."""
import base64, gzip, hashlib, json, os, pathlib, shutil, struct, subprocess, tarfile, urllib.request, zipfile
ROOT=pathlib.Path(__file__).resolve().parent.parent
BUILD=ROOT/'.build'; PAYLOAD=BUILD/'payload'; DOWNLOADS=BUILD/'downloads'; RELEASE=ROOT/'release'
NODE='24.22.1'; CODEX='0.166.0'; GIT='2.56.0.4'
GIT_SHA='e3bf78351fe777fba47ddee5950082f8a98bb0f02604fdc7ba3ee2cb68ffa877'
CODEX_INTEGRITY='NS8Ps5oG5r19pCrMCUXwUqOui6odnUIoBlQkrjCJ+h1k6KiwCzC/+mI9d3nSZCqFoVONPBTmqyq8NYq3YaFGyA=='
def download(url,target):
 target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():
  print('Downloading '+target.name,flush=True)
  req=urllib.request.Request(url,headers={'User-Agent':'PixelOffice-build'})
  with urllib.request.urlopen(req,timeout=240) as response,open(str(target)+'.part','wb') as out:shutil.copyfileobj(response,out)
  os.replace(str(target)+'.part',target)
 return target

def sha(file,algorithm='sha256'):
 with open(file,'rb') as f:return hashlib.file_digest(f,algorithm).digest()

def main():
 os.chdir(ROOT);BUILD.mkdir(exist_ok=True);RELEASE.mkdir(exist_ok=True);DOWNLOADS.mkdir(exist_ok=True)
 node=shutil.which('node');assert subprocess.check_output([node,'--version'],text=True).strip()=='v'+NODE,'Build using Node '+NODE
 win_node=download(f'https://nodejs.org/dist/v{NODE}/win-x64/node.exe',PAYLOAD/'tools/node/node.exe')
 sums=download(f'https://nodejs.org/dist/v{NODE}/SHASUMS256.txt',DOWNLOADS/'node-shasums.txt').read_text()
 expected=next(l.split()[0] for l in sums.splitlines() if l.split()[-1]=='win-x64/node.exe')
 assert sha(win_node).hex()==expected,'Node checksum mismatch'
 download(f'https://raw.githubusercontent.com/nodejs/node/v{NODE}/LICENSE',PAYLOAD/'tools/node/LICENSE')
 codex=download(f'https://registry.npmjs.org/@openai/codex/-/codex-{CODEX}-win32-x64.tgz',DOWNLOADS/f'openai-codex-{CODEX}-win32-x64.tgz')
 assert base64.b64encode(sha(codex,'sha512')).decode()==CODEX_INTEGRITY,'Codex checksum mismatch'
 codex_dir=PAYLOAD/'tools/codex';shutil.rmtree(codex_dir,ignore_errors=True);codex_dir.mkdir(parents=True)
 with tarfile.open(codex) as tar:
  tar.extractall(codex_dir,filter='data')
  for member in tar.getmembers():
   if member.isfile():
    extracted=codex_dir/member.name
    expected_bytes=tar.extractfile(member).read()
    # Verify the actual extraction, not only the downloaded archive.
    if not extracted.exists() or sha(extracted)!=hashlib.sha256(expected_bytes).digest():
     extracted.write_bytes(expected_bytes)
    assert extracted.stat().st_size==member.size and sha(extracted)==hashlib.sha256(expected_bytes).digest(),'Codex extraction failed: '+member.name
 download(f'https://raw.githubusercontent.com/openai/codex/rust-v{CODEX}/LICENSE',codex_dir/'LICENSE')
 git=download(f'https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.4/MinGit-{GIT}-64-bit.zip',DOWNLOADS/'mingit.zip')
 assert sha(git).hex()==GIT_SHA,'Git checksum mismatch'
 git_dir=PAYLOAD/'tools/git';shutil.rmtree(git_dir,ignore_errors=True);git_dir.mkdir(parents=True)
 with zipfile.ZipFile(git) as z:z.extractall(git_dir)
 app=PAYLOAD/'app';shutil.rmtree(app,ignore_errors=True);app.mkdir()
 for name in ['public','server','core']:shutil.copytree(ROOT/name,app/name)
 for name in ['package.json','.env.example','README.md']:shutil.copy2(ROOT/name,app/name)
 (app/'scripts').mkdir();shutil.copy2(ROOT/'scripts/packaged-start.mjs',app/'scripts/packaged-start.mjs')
 notice='''Bundled unmodified runtime tools\nNode.js 24.22.1: https://github.com/nodejs/node/tree/v24.22.1 (license in tools/node/LICENSE)\nCodex CLI 0.166.0: https://github.com/openai/codex/tree/rust-v0.166.0 (license in tools/codex/LICENSE)\nMinGit 2.56.0.4: https://github.com/git-for-windows/git/releases/tag/v2.56.0.windows.4\nGit source: https://github.com/git-for-windows/git/tree/v2.56.0.windows.4\nGit and component license notices are preserved in tools/git.\nCodex voice component source and license notices are preserved in tools/codex/package/vendor.\n'''
 (PAYLOAD/'THIRD-PARTY-NOTICES.txt').write_text(notice)
 files=sorted(p for p in PAYLOAD.rglob('*') if p.is_file())
 manifest=[{'path':p.relative_to(PAYLOAD).as_posix(),'size':p.stat().st_size,'sha256':sha(p).hex()} for p in files]
 header=json.dumps(manifest,separators=(',',':')).encode();archive=BUILD/'payload.gz'
 print('Compressing bundled tools…',flush=True)
 with gzip.open(archive,'wb',compresslevel=6) as out:
  out.write(struct.pack('<I',len(header)));out.write(header)
  for p in files:
   with open(p,'rb') as f:shutil.copyfileobj(f,out)
 codex_binary=next(p for p in codex_dir.rglob('codex.exe') if p.parent.name in ['bin','codex'])
 meta={'version':json.loads((ROOT/'package.json').read_text())['version'],'payloadSha256':sha(archive).hex(),'codexPath':codex_binary.relative_to(PAYLOAD).as_posix()}
 meta['id']=meta['version']+'-'+meta['payloadSha256'][:16];(BUILD/'meta.json').write_text(json.dumps(meta))
 config={'main':str(ROOT/'scripts/exe-launcher.cjs'),'output':str(BUILD/'sea.blob'),'disableExperimentalSEAWarning':True,'useSnapshot':False,'useCodeCache':False,'execArgvExtension':'none','assets':{'payload':str(archive),'meta':str(BUILD/'meta.json')}}
 (BUILD/'sea.json').write_text(json.dumps(config));subprocess.run([node,'--experimental-sea-config',str(BUILD/'sea.json')],check=True)
 output=RELEASE/'PixelOffice.exe';shutil.copy2(win_node,output)
 injector=BUILD/'injector/node_modules/postject/dist/cli.js'
 if not injector.exists():
  npm=pathlib.Path(shutil.which('npm.cmd' if os.name=='nt' else 'npm')).resolve()
  npm_cli=npm.parent/'node_modules/npm/bin/npm-cli.js' if os.name=='nt' else npm
  subprocess.run([node,str(npm_cli),'install','--prefix',str(BUILD/'injector'),'--ignore-scripts','--no-audit','--no-fund','postject@1.0.0-alpha.6'],check=True)
 subprocess.run([node,str(injector),str(output),'NODE_SEA_BLOB',str(BUILD/'sea.blob'),'--sentinel-fuse','NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'],check=True)
 (RELEASE/'PixelOffice.exe.sha256').write_text(sha(output).hex()+'  PixelOffice.exe\n')
 print(f'Built {output} ({output.stat().st_size/1048576:.1f} MiB)',flush=True)
if __name__=='__main__':main()
