const allowed=new Set(['knowledge/list','knowledge/read','knowledge/save','knowledge/folder','knowledge/history','knowledge/revision','knowledge/restore','tasks/edit','accounts/manual','accounts/connect','accounts/cancel','accounts/logout','state','events','login','accounts/add','accounts/refresh','accounts/energy','employees/update','employees/hire','commands','tasks/retry','tasks/accept','tasks/pr','tasks/merge-request','releases/request','approvals/resolve']);
const reply=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request){
 const url=new URL(request.url),route=url.searchParams.get('route')||url.pathname.replace(/^\/api\//,'');
 if(!allowed.has(route))return reply({error:'Not found'},404);
 if(request.method==='POST'&&request.headers.get('origin')){
  const origin=new URL(request.headers.get('origin'));if(origin.host!==(request.headers.get('host')||url.host))return reply({error:'Cross-origin request denied'},403);
 }
 if(!process.env.PIXEL_RUNTIME_URL)return reply({code:'RUNTIME_NOT_CONFIGURED',error:'Connect a persistent Codex host to activate the live office.'},503);
 try{
  const runtime=new URL(process.env.PIXEL_RUNTIME_URL);if(runtime.protocol!=='https:'||runtime.username||runtime.password)throw new Error('Invalid runtime configuration');
  const destination=new URL('/api/'+route,runtime.origin);
  const headers=new Headers({'Accept':route==='events'?'text/event-stream':'application/json'});
  for(const key of ['cookie','content-type'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
  if(request.method==='POST')headers.set('Origin',runtime.origin);
  if(process.env.PIXEL_GATEWAY_SECRET)headers.set('X-Pixel-Gateway',process.env.PIXEL_GATEWAY_SECRET);
  const body=request.method==='POST'?await request.text():undefined;
  if(body&&body.length>256000)return reply({error:'Request too large'},413);
  const upstream=await fetch(destination,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.any([request.signal,AbortSignal.timeout(route==='events'?240000:120000)])});
  if(upstream.status>=300&&upstream.status<400)return reply({error:'Runtime redirected the request. Check the host configuration.'},502);
  const output=new Headers({'Content-Type':upstream.headers.get('content-type')||'application/json','Cache-Control':'no-store'});
  for(const cookie of upstream.headers.getSetCookie())output.append('Set-Cookie',cookie.replace(/;\s*Domain=[^;]+/ig,'')+(cookie.includes('; Secure')?'':'; Secure'));
  return new Response(upstream.body,{status:upstream.status,headers:output});
 }catch(error){console.error('Pixel runtime gateway unavailable',error.name);return reply({error:'The Codex host is offline or unreachable. Keep the host running and check its HTTPS connection.'},502);}
}
export const GET=handle;
export const POST=handle;

