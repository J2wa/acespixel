import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
export class Connections {
 constructor(root){mkdirSync(root,{recursive:true,mode:0o700});this.file=join(root,'connections.enc');const key=join(root,'connections.key');if(!existsSync(key))writeFileSync(key,randomBytes(32),{mode:0o600});this.key=readFileSync(key);this.data={};if(existsSync(this.file)){const b=readFileSync(this.file);const d=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));this.data=JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]));}}
 save(){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',this.key,iv);const data=Buffer.concat([c.update(JSON.stringify(this.data)),c.final()]);writeFileSync(this.file,Buffer.concat([iv,c.getAuthTag(),data]),{mode:0o600});}
 token(service){return this.data[service]?.token||process.env[service.toUpperCase()+'_TOKEN'];}
 async request(service,path,method='GET',body,token=this.token(service)){
 if(!token)throw new Error('Connect '+service+' first.');const r=await fetch((service==='github'?'https://api.github.com':'https://api.vercel.com')+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});const data=await r.json();if(!r.ok)throw new Error(service+' request failed ('+r.status+'). Check token permissions and selection.');return data;}
 async connect(service,token){if(!['github','vercel'].includes(service)||typeof token!=='string'||token.length<10)throw new Error('Enter a valid connection token.');const user=await this.request(service,service==='github'?'/user':'/v2/user','GET',undefined,token);this.data[service]={token,label:user.login||user.user?.username||user.user?.email||'Connected'};this.save();return this.status();}
 status(){return {github:!!this.token('github'),vercel:!!this.token('vercel'),githubAccount:this.data.github?.label||null,vercelAccount:this.data.vercel?.label||null,repository:this.data.repository||process.env.GITHUB_REPOSITORY||null,project:this.data.project||process.env.VERCEL_PROJECT_ID||null,team:this.data.team||process.env.VERCEL_TEAM_ID||null};}
 async repositories(){const rows=await this.request('github','/user/repos?per_page=100&sort=updated');return rows.filter(x=>x.permissions?.push).map(x=>({name:x.full_name,branch:x.default_branch,private:x.private}));}
 async teams(){const r=await this.request('vercel','/v2/teams');return (r.teams||[]).map(x=>({id:x.id,name:x.name}));}
 async projects(team=''){if(team&&!/^team_[a-zA-Z0-9]+$/.test(team))throw new Error('Invalid team');const r=await this.request('vercel','/v9/projects?limit=100'+(team?'&teamId='+team:''));return r.projects.map(x=>({id:x.id,name:x.name}));}
}
