const images=new Map();
function asset(path){if(!images.has(path)){const i=new Image();i.src='/assets/'+path+'.png';images.set(path,i);}return images.get(path);}
export function drawOffice(canvas,employees,tasks,onSelect){
 const W=384,H=240;canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 const box=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 const sprite=(path,x,y)=>{const i=asset(path);if(i.complete&&i.naturalWidth)c.drawImage(i,x,y);};
 const text=(s,x,y,color='#d6cde5')=>{c.fillStyle=color;c.font='6px monospace';c.textAlign='center';c.fillText(s,x,y);};
 box(0,0,W,H,'#151320');box(8,10,368,222,'#30283d');
 for(let y=36;y<224;y+=16)for(let x=16;x<368;x+=16){sprite('tiles/floor_wood',x,y);box(x,y,16,16,'#20192c55');}
 box(8,10,368,32,'#3d334e');box(8,39,368,4,'#13101b');
 for(const x of [38,168,298]){box(x,16,44,24,'#17162c');box(x+3,19,38,18,'#354167');box(x+22,19,2,18,'#c1b1ce');box(x,38,44,3,'#928098');box(x+8,23,2,2,'#ddbe75');}
 box(258,142,110,82,'#28243d');text('RECHARGE LOUNGE',313,153,'#d7b274');
 sprite('furniture/bookshelf',21,47);sprite('furniture/plant',341,48);sprite('furniture/water_cooler',23,173);sprite('furniture/plant',224,188);
 const places=[[176,65],[70,104],[176,155],[70,171],[286,77],[175,110],[286,119]],hits=[];let rest=0;
 employees.filter(e=>e.active).forEach((e,i)=>{let [x,y]=places[i];const asleep=e.state==='sleeping';const frame=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.floor(Date.now()/700)%2;
 if(asleep){x=271+(rest%2)*49;y=169+Math.floor(rest/2)*23;rest++;sprite('furniture/bed',x-6,y+1);const img=asset('characters/'+e.id+'_sleep');if(img.complete&&img.naturalWidth)c.drawImage(img,frame*32,0,32,16,x-6,y,32,16);text('z z z',x+10,y-4,'#d9c4ff');text(e.name,x+10,y+31);}
 else{sprite('furniture/chair',x+7,y+20);const img=asset('characters/'+e.id);const row=e.state==='working'?4:e.state==='tired'?7:6;if(img.complete&&img.naturalWidth)c.drawImage(img,frame*16,row*32,16,32,x+7,y-6,16,32);sprite('furniture/desk',x,y+20);sprite('furniture/monitor_on_'+(frame?'b':'a'),x+8,y+9);text(e.name,x+16,y+52);if(e.state==='working')sprite('ui/bubble_dots_'+(frame+1),x+3,y-24);if(e.state==='offline')text('OFFLINE',x+15,y-10,'#b6a8bf');}
 hits.push({x:x-8,y:y-14,w:48,h:68,id:e.id});});
 text('ACES PIXEL  /  STUDIO 01',110,235,'#b4a1c2');text('BUILD • REVIEW • SHIP',301,235,'#d7b274');
 canvas.onclick=ev=>{const r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)*W/r.width,y=(ev.clientY-r.top)*H/r.height;const h=hits.find(p=>x>=p.x&&x<p.x+p.w&&y>=p.y&&y<p.y+p.h);if(h)onSelect(h.id);};canvas.style.cursor='pointer';
}
