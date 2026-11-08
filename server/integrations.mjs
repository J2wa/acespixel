import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join,resolve} from 'node:path';
import {Connections} from './connections.mjs';
import {mkdirSync,existsSync} from 'node:fs';
const exec=promisify(execFile);
export const command=async(bin,args,cwd)=> (await exec(bin,args,{cwd,timeout:120000,maxBuffer:4*1024*1024})).stdout.trim();
export class Integrations {
 constructor(root){this.root=root;this.connections=new Connections(root);this.repo=process.env.PIXEL_REPO?resolve(process.env.PIXEL_REPO):null;this.github=process.env.GITHUB_REPOSITORY;this.project=process.env.VERCEL_PROJECT_ID;this.sync();}
 sync(){const d=this.connections.data;this.github=d.repository||this.github;this.repo=d.repoPath||this.repo;this.project=d.project||this.project;this.team=d.team||process.env.VERCEL_TEAM_ID;this.main=d.branch||process.env.PIXEL_MAIN_BRANCH||'main';}
 async git(args,cwd){const token=this.connections.token('github');const env={...process.env,GIT_TERMINAL_PROMPT:'0'};if(token){env.GIT_CONFIG_COUNT='1';env.GIT_CONFIG_KEY_0='http.https://github.com/.extraheader';env.GIT_CONFIG_VALUE_0='Authorization: Basic '+Buffer.from('x-access-token:'+token).toString('base64');}try{return (await exec('git',args,{cwd,env,timeout:120000,maxBuffer:4*1024*1024})).stdout.trim();}catch{throw new Error('Git operation failed. Check repository access and the host Git configuration.');}}
 async selectRepo(name){if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name))throw new Error('Invalid repository');const r=await this.connections.request('github','/repos/'+name);if(!r.permissions?.push)throw new Error('Repository write access is required.');const path=join(this.root,'repositories',name.replace('/','--'));mkdirSync(join(this.root,'repositories'),{recursive:true});if(existsSync(join(path,'.git'))){const remote=await this.git(['remote','get-url','origin'],path);if(remote!==r.clone_url)throw new Error('Existing checkout has a different remote.');await this.git(['fetch','origin'],path);}else await this.git(['clone','--',r.clone_url,path],this.root);await this.git(['config','user.name','Pixel Office'],path);await this.git(['config','user.email','pixel-office@users.noreply.github.com'],path);Object.assign(this.connections.data,{repository:r.full_name,branch:r.default_branch,repoPath:path});this.connections.save();this.sync();return this.connections.status();}
 async worktree(t,prefix){if(!this.repo)throw new Error('Set PIXEL_REPO to a local Git checkout before running employee tasks.');const path=join(this.root,'workspaces',t.id);mkdirSync(join(this.root,'workspaces'),{recursive:true});if(!t.baseRef)await this.git(['fetch','origin',this.main||'main'],this.repo);await this.git(['worktree','add','-b',prefix+'/'+t.id,path,t.baseRef||'origin/'+(this.main||'main')],this.repo);return path;}
 async gh(path,method='GET',body){if(!this.github)throw new Error('Select a GitHub repository first.');return this.connections.request('github','/repos/'+this.github+path,method,body);}
 async openPR(t){
  if(!t.cwd||!t.branch)throw new Error('Task has no worktree.');
  const branch=await this.git(['branch','--show-current'],t.cwd);if(branch!==t.branch||branch==='main')throw new Error('Worktree branch mismatch.');
  await this.git(['add','--all'],t.cwd);
  const dirty=await this.git(['status','--porcelain'],t.cwd);if(dirty)await this.git(['commit','-m',t.title],t.cwd);
  // Uses host Git credential helper; configure a scoped GitHub App installation credential.
  await this.git(['push','--set-upstream','origin',t.branch],t.cwd);
  const p=await this.gh('/pulls','POST',{title:t.title,head:t.branch,base:this.main||'main',body:'Pixel Office task '+t.id+'\n\nAcceptance: '+t.acceptance});return {number:p.number,url:p.html_url,sha:p.head.sha};
 }
 async checkedPR(number){const p=await this.gh('/pulls/'+number);if(p.state!=='open'||p.base.ref!==(this.main||'main'))throw new Error('PR is not open against the configured main branch.');const [checks,status]=await Promise.all([this.gh('/commits/'+p.head.sha+'/check-runs'),this.gh('/commits/'+p.head.sha+'/status')]);const rows=checks.check_runs||[];if(!rows.length&&!status.total_count)throw new Error('No CI checks exist. Configure required QA checks first.');if(rows.some(c=>c.status!=='completed'||!['success','skipped','neutral'].includes(c.conclusion)) || (status.total_count&&status.state!=='success'))throw new Error('QA checks have not passed.');return p;}
 async merge(number,sha){const p=await this.checkedPR(number);if(p.head.sha!==sha)throw new Error('PR changed; request a fresh approval.');return this.gh('/pulls/'+number+'/merge','PUT',{sha,merge_method:'squash'});}
 async vercel(path,method='GET',body){if(!this.project)throw new Error('Select a Vercel project first.');return this.connections.request('vercel',path+(path.includes('?')?'&':'?')+(this.team?'teamId='+encodeURIComponent(this.team):''),method,body);}
 async preview(){
  if(!this.repo)throw new Error('Select a repository first.');
  const main=await this.gh('/commits/'+this.main);await this.git(['fetch','origin',this.main],this.repo);
  const list=await exec('git',['ls-tree','-r','-z',main.sha],{cwd:this.repo,maxBuffer:4*1024*1024});
  const files=[];let total=0;
  for(const entry of list.stdout.split('\0').filter(Boolean)){
   const [meta,file]=entry.split('\t');if(!meta.startsWith('100'))continue;
   if(file.split('/').some(p=>p==='.git'||p==='.runtime'||p==='node_modules'||(p.startsWith('.env')&&p!=='.env.example'))||/\.(pem|key)$/.test(file))continue;
   const result=await exec('git',['show',main.sha+':'+file],{cwd:this.repo,encoding:'buffer',maxBuffer:10*1024*1024});total+=result.stdout.length;if(total>12*1024*1024)throw new Error('Source exceeds the 12 MB inline preview limit. Remove large tracked build assets.');
   files.push({file,data:result.stdout.toString('base64'),encoding:'base64'});
  }
  return this.vercel('/v13/deployments','POST',{name:this.connections.data.projectName||this.project,project:this.project,files,meta:{githubCommitSha:main.sha}});
 }
 async deployment(id){if(!/^dpl_[a-zA-Z0-9]+$/.test(id))throw new Error('Enter a Vercel deployment ID starting with dpl_.');const d=await this.vercel('/v13/deployments/'+id);if(d.projectId!==this.project||d.readyState!=='READY')throw new Error('Deployment must be READY and belong to the configured project.');const sha=d.meta?.githubCommitSha;if(!sha)throw new Error('A GitHub-backed deployment with a commit SHA is required.');const main=await this.gh('/commits/'+(this.main||'main'));if(sha!==main.sha)throw new Error('Preview commit does not match main. Create a preview of the merged commit first.');return {id:d.id,url:'https://'+d.url,sha,project:d.projectId};}
 async promote(a){const d=await this.deployment(a.deploymentId);if(d.sha!==a.sha||d.project!==a.project)throw new Error('Release changed; approval invalid.');await this.vercel('/v10/projects/'+this.project+'/promote/'+a.deploymentId,'POST');return d.url;}
}
