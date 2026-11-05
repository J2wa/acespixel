const W=720,H=460;
export function drawOffice(canvas,employees,tasks,onSelect){
 canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const box=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
 const text=(s,x,y,c='#374c3a',size=9)=>{ctx.font=`${size}px monospace`;ctx.fillStyle=c;ctx.textAlign='center';ctx.fillText(s,x,y);};
 box(0,0,W,H,'#72866a');box(8,8,704,444,'#c1c5a2');
 // Parquet, paneled walls, and cast shadows are drawn at integer pixel coordinates.
 for(let y=65;y<445;y+=18)for(let x=12;x<710;x+=48){box(x+(y%36?0:24),y,46,17,(x+y)%3?'#bdc19d':'#b8bd98');box(x,y+17,48,1,'#aeb48f');}
 box(8,8,704,62,'#8c9a7b');box(8,67,704,8,'#647456');
 for(let x=25;x<710;x+=50){box(x,14,2,48,'#7c8e6a');}
 function window(x){box(x,15,100,44,'#536d5b');box(x+4,19,92,36,'#b7d5c2');box(x+8,23,38,28,'#a9c9bc');box(x+51,23,39,28,'#a9c9bc');box(x+46,19,4,36,'#617c66');box(x-4,59,108,5,'#d8d8b5');}
 window(60);window(292);window(535);
 function plant(x,y){box(x+2,y+24,22,7,'#7c8565');box(x+5,y+17,16,13,'#ba9770');box(x+8,y+20,10,12,'#c9ab7e');box(x+11,y,4,22,'#466243');box(x,y+3,13,11,'#567d4e');box(x+15,y-3,11,14,'#63885a');box(x+5,y-7,14,11,'#496e43');}
 plant(28,100);plant(659,98);plant(32,374);plant(658,374);
 // Rest room with privacy wall and soft rug.
 box(503,265,185,150,'#8b927b');box(508,270,175,140,'#a6ab98');
 for(let y=275;y<410;y+=8)box(513,y,165,2,'#9da58d');
 box(496,249,196,9,'#5c7158');box(496,258,9,165,'#738468');
 text('THE RECHARGE ROOM',594,289,'#4d614f',10);
 function bed(x,y){box(x+4,y+6,62,62,'#78816d');box(x,y,62,60,'#74675f');box(x+4,y+4,54,16,'#e1dbc6');box(x+4,y+23,54,32,'#aea2c3');box(x+8,y+28,46,3,'#c7bbda');box(x,y+58,7,8,'#635a51');box(x+55,y+58,7,8,'#635a51');}
 bed(520,316);bed(605,316);
 // Green carpet in central work area.
 box(59,270,398,138,'#9da681');box(65,276,386,126,'#a7ae8c');box(71,282,374,114,'#aeb596');
 function desk(x,y){box(x+5,y+10,115,57,'#8b926f');box(x,y,115,50,'#8e7858');box(x+3,y+3,109,42,'#d3bd8c');box(x+5,y+43,105,6,'#b49a6c');box(x+7,y+49,8,15,'#6c6f51');box(x+99,y+49,8,15,'#6c6f51');box(x+35,y+7,40,24,'#434f43');box(x+38,y+10,34,17,'#9bb8aa');box(x+42,y+13,22,2,'#d2e1bc');box(x+42,y+18,15,2,'#c8dac3');box(x+53,y+31,5,6,'#52634f');box(x+45,y+36,22,3,'#737e63');box(x+35,y+40,39,4,'#e1d8b7');box(x+88,y+18,9,10,'#e6d5a9');box(x+89,y+17,7,3,'#756248');}
 const positions=[{x:302,y:112},{x:90,y:205},{x:300,y:298},{x:90,y:325},{x:519,y:139},{x:300,y:205},{x:519,y:208}];
 const hit=[];
 employees.filter(e=>e.active).forEach((e,i)=>{
  let p=positions[i%positions.length];const sleeping=e.state==='sleeping';if(!sleeping)desk(p.x,p.y);
  let x=p.x+53,y=p.y+65+(e.state==='working'?Math.floor(Date.now()/600)%2:0);if(sleeping){x=550+(i%2)*83;y=345;}
  // Pixel character silhouette, hair, skin, shirt, arms and shoes.
  if(!sleeping){box(x-12,y+14,27,6,'#939c7a');box(x-7,y+2,15,15,'#3b4c42');box(x-10,y-9,22,17,e.color);box(x-14,y-6,5,12,'#d8b58c');box(x+12,y-6,5,12,'#d8b58c');box(x-9,y-26,19,18,'#e0bf97');box(x-11,y-29,23,8,'#51524a');box(x-11,y-22,4,8,'#51524a');box(x-5,y-17,2,3,'#34483b');box(x+4,y-17,2,3,'#34483b');box(x-8,y+14,7,4,'#324139');box(x+4,y+14,7,4,'#324139');}else{box(x-12,y-22,19,15,'#e0bf97');box(x-12,y-24,19,5,'#51524a');box(x-8,y-15,4,1,'#34483b');box(x+1,y-15,4,1,'#34483b');box(x-24,y-5,48,29,'#aea2c3');box(x-20,y-3,40,3,'#cabedb');}
  if(sleeping){text('z Z z',x+5,y-41+(Math.floor(Date.now()/800)%2)*2,'#645277',12);}else if(e.state==='working'){box(x-15,y-48,34,13,'#e4e9cd');text('• • •',x+2,y-38,'#52725c',10);}
  text(e.name+' · '+(e.id==='deploy'?'Deploy':e.id==='qa'?'QA':e.role.split(' ')[0]),x,y+33,'#3d553f',9);
  hit.push({x:x-35,y:y-45,w:75,h:85,id:e.id});
 });
 // Notice board, bookcase, coffee bar and small details.
 box(190,93,54,39,'#76634e');box(194,97,46,31,'#ad966d');box(200,102,13,12,'#e1d3a1');box(220,109,13,13,'#bac9aa');
 box(390,90,80,38,'#6e7657');box(395,95,70,27,'#b5a27b');for(let x=398;x<462;x+=8)box(x,98,5,19,['#a9bc9c','#c6b19b','#8f9e99'][x%3]);
 box(225,364,38,38,'#a8a382');box(220,356,44,37,'#d8cda5');box(231,363,21,15,'#b9c296');
 text('PIXEL OFFICE / FLOOR 01',167,434,'#536b50',9);text('CLICK A TEAMMATE TO CHECK IN',549,434,'#536b50',8);
 canvas.onclick=ev=>{const r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)*W/r.width,y=(ev.clientY-r.top)*H/r.height;const h=hit.find(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h);if(h)onSelect(h.id);};
 canvas.style.cursor='pointer';
}
