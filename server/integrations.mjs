import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join,resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
const exec=promisify(execFile);
export const command=async(bin,args,cwd)=> (await exec(bin,args,{cwd,timeout:120000,maxBuffer:4*1024*1024})).stdout.trim();
export class Integrations {
 constructor(root){this.root=root;this.repo=process.env.PIXEL_REPO?resolve(process.env.PIXEL_REPO):null;this.github=process.env.GITHUB_REPOSITORY;this.project=process.env.VERCEL_PROJECT_ID;}
 async worktree(t,prefix){if(!this.repo)throw new Error('Set PIXEL_REPO to a local Git checkout before running employee tasks.');const path=join(this.root,'workspaces',t.id);mkdirSync(join(this.root,'workspaces'),{recursive:true});if(!t.baseRef)await command('git',['fetch','origin',process.env.PIXEL_MAIN_BRANCH||'main'],this.repo);await command('git',['worktree','add','-b',prefix+'/'+t.id,path,t.baseRef||'origin/'+(process.env.PIXEL_MAIN_BRANCH||'main')],this.repo);return path;}
 async gh(path,method='GET',body){if(!process.env.GITHUB_TOKEN||!this.github)throw new Error('Configure GITHUB_TOKEN and GITHUB_REPOSITORY on the host.');const r=await fetch('https://api.github.com/repos/'+this.github+path,{method,headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw new Error(data.message||'GitHub request failed');return data;}
 async openPR(t){
  if(!t.cwd||!t.branch)throw new Error('Task has no worktree.');
  const branch=await command('git',['branch','--show-current'],t.cwd);if(branch!==t.branch||branch==='main')throw new Error('Worktree branch mismatch.');
  await command('git',['add','--all'],t.cwd);
  const dirty=await command('git',['status','--porcelain'],t.cwd);if(dirty)await command('git',['commit','-m',t.title],t.cwd);
  // Uses host Git credential helper; configure a scoped GitHub App installation credential.
  await command('git',['push','--set-upstream','origin',t.branch],t.cwd);
  const p=await this.gh('/pulls','POST',{title:t.title,head:t.branch,base:process.env.PIXEL_MAIN_BRANCH||'main',body:'Pixel Office task '+t.id+'\n\nAcceptance: '+t.acceptance});return {number:p.number,url:p.html_url,sha:p.head.sha};
 }
 async checkedPR(number){const p=await this.gh('/pulls/'+number);if(p.state!=='open'||p.base.ref!==(process.env.PIXEL_MAIN_BRANCH||'main'))throw new Error('PR is not open against the configured main branch.');const [checks,status]=await Promise.all([this.gh('/commits/'+p.head.sha+'/check-runs'),this.gh('/commits/'+p.head.sha+'/status')]);const rows=checks.check_runs||[];if(!rows.length&&!status.total_count)throw new Error('No CI checks exist. Configure required QA checks first.');if(rows.some(c=>c.status!=='completed'||!['success','skipped','neutral'].includes(c.conclusion)) || (status.total_count&&status.state!=='success'))throw new Error('QA checks have not passed.');return p;}
 async merge(number,sha){const p=await this.checkedPR(number);if(p.head.sha!==sha)throw new Error('PR changed; request a fresh approval.');return this.gh('/pulls/'+number+'/merge','PUT',{sha,merge_method:'squash'});}
 async vercel(path){if(!process.env.VERCEL_TOKEN||!this.project)throw new Error('Configure VERCEL_TOKEN and VERCEL_PROJECT_ID on the host.');const suffix=process.env.VERCEL_TEAM_ID?'?teamId='+encodeURIComponent(process.env.VERCEL_TEAM_ID):'';const r=await fetch('https://api.vercel.com'+path+suffix,{headers:{Authorization:'Bearer '+process.env.VERCEL_TOKEN}});const data=await r.json();if(!r.ok)throw new Error(data.error?.message||'Vercel request failed');return data;}
 async deployment(id){if(!/^dpl_[a-zA-Z0-9]+$/.test(id))throw new Error('Enter a Vercel deployment ID starting with dpl_.');const d=await this.vercel('/v13/deployments/'+id);if(d.projectId!==this.project||d.readyState!=='READY')throw new Error('Deployment must be READY and belong to the configured project.');const sha=d.meta?.githubCommitSha;if(!sha)throw new Error('A GitHub-backed deployment with a commit SHA is required.');const main=await this.gh('/commits/'+(process.env.PIXEL_MAIN_BRANCH||'main'));if(sha!==main.sha)throw new Error('Preview commit does not match main. Create a preview of the merged commit first.');return {id:d.id,url:'https://'+d.url,sha,project:d.projectId};}
 async promote(a){const d=await this.deployment(a.deploymentId);if(d.sha!==a.sha||d.project!==a.project)throw new Error('Release changed; approval invalid.');const args=['promote',a.deploymentId,'--yes'];if(process.env.VERCEL_TEAM_ID)args.push('--scope',process.env.VERCEL_TEAM_ID);await exec('vercel',args,{cwd:this.repo||this.root,timeout:240000,maxBuffer:4*1024*1024});return d.url;}
}
