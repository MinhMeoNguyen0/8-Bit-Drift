const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8'),sandbox={module:{exports:{}}};vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);const e=sandbox.module.exports;let n=0;function test(name,f){f();n++;console.log('PASS '+name);}
test('pit station clears every course and has solid walls and open bay',()=>{const A=e.makeArena(1350,675);A.fixedMobile=true;for(const id of ['signature','oval','eight','parking']){e.setTrack(id);const l=e.layoutCourse(A),g=e.pitStopGeometry(A,l),q=(u,v)=>e.pitPoint(g,u,v);if(l.track.pts.length){assert(e.pitPoint(g,55,40).x>A.W*.8);}else{const near=e.pitPoint(g,0,97);assert(near.x>l.lot.r+e.LOT_BAND&&near.x-l.lot.r<20,'parking pit is close to the lot');}if(l.track.pts.length)for(const p of l.track.pts)for(const [u,v] of [[0,0],[110,0],[110,97],[0,97]]){const t=q(u,v);assert(Math.hypot(p[0]-t.x,p[1]-t.y)>l.track.half+4,id+' remains clear');}}e.setTrack('signature');const w=e.createWorld('compact',A),g=e.pitStopGeometry(A,w.layout),q=(u,v)=>e.pitPoint(g,u,v);w.cones=[];let t=q(24,24);Object.assign(w.car,{x:t.x,y:t.y,a:g.angle,vx:0,vy:0});assert(e.pitOverlap(w.p,w.car,g));e.carPit(w,g);assert(!e.pitOverlap(w.p,w.car,g));t=q(78,75);Object.assign(w.car,{x:t.x,y:t.y,a:g.angle});assert(!e.pitOverlap(w.p,w.car,g));assert(e.pitPosts(g).every(p=>e.boxDistance(w.p,w.car.x,w.car.y,w.car.a,p.x,p.y)>p.r));const art=e.pitArt(g),colors=new Set();for(const layer of [art.base,art.roof,art.shadow])for(let i=0;i<layer.data.length;i+=4)if(layer.data[i+3])colors.add(layer.data[i]+','+layer.data[i+1]+','+layer.data[i+2]);assert.equal(colors.size,2);assert(art.shadow.data.some((v,i)=>i%4===3&&v));assert.deepEqual(Array.from(e.pitDrawables(w),x=>x.part),['base','roof']);});
test('parking gas canopy crosses two narrower lanes',()=>{const A=e.makeArena(1350,675);A.fixedMobile=true;e.setTrack('parking');const L=e.layoutCourse(A),g=e.pitStopGeometry(A,L),b=g.bay;assert(g.gasStation);assert(Math.abs(g.angle)<1e-9);assert.equal(b.lanes,2);assert.equal(b.w/2,28);assert(b.h>=78);assert(b.y<49&&b.y+b.h>49,'parking markings extend beneath the canopy');assert(g.canopyEnd>=b.x+b.w-2,'canopy spans both lanes');assert(Math.abs((g.canopyEnd+4-47)/(178+4-47)-.75)<.02,'canopy is a quarter shorter');const posts=e.pitPosts(g);for(const f of [.25,.75]){const centre=e.pitPoint(g,b.x+b.w*f,b.y+b.h/2);for(const p of Object.values(e.PRESETS))for(const a of [Math.PI/2]){assert(p.width<b.w/2-8&&p.length<b.h-10);assert(!e.pitOverlap(p,{x:centre.x,y:centre.y,a},g));for(const q of posts)assert(e.boxDistance(p,centre.x,centre.y,a,q.x,q.y)>q.r,'each lane clears the pumps and posts');}}assert(g.x>L.lot.r+e.LOT_BAND);e.setTrack('signature');});
test('a car can enter each gas station lane',()=>{const A=e.makeArena(1350,675);A.fixedMobile=true;e.setTrack('parking');for(const f of [.25,.75]){const w=e.createWorld('coupe',A),g=e.pitStopGeometry(A,w.layout),b=g.bay,start=e.pitPoint(g,b.x+b.w*f,b.y+b.h+25),next=e.pitPoint(g,b.x+b.w*f,b.y+b.h+24);w.cones=[];Object.assign(w.car,{x:start.x,y:start.y,px:start.x,py:start.y,a:g.angle-Math.PI/2,vx:(next.x-start.x)*90,vy:(next.y-start.y)*90});for(let i=0;i<80;i++)e.step(w,{throttle:0,brake:0,steering:0});const dx=w.car.x-g.x,dy=w.car.y-g.y,u=dx*Math.cos(g.angle)+dy*Math.sin(g.angle),v=-dx*Math.sin(g.angle)+dy*Math.cos(g.angle);assert(Math.abs(u-(b.x+b.w*f))<2&&v>b.y&&v<b.y+b.h,'car drives into its lane');assert(!e.pitOverlap(w.p,w.car,g));}e.setTrack('signature');});
test('gas pump display faces right and keeps its collision centre',()=>{const center=e.gasPumpPoint([56,64,0]),front=e.gasPumpPoint([56,68,0]),side=e.gasPumpPoint([60,64,0]);assert.deepEqual(Array.from(center),[56,64,0]);assert(front[0]>center[0]&&front[1]===center[1]);assert(side[0]===center[0]&&side[1]<center[1]);});
test('parking corral is outside and parallel to the left edge, with nested carts',()=>{const A=e.makeArena(1350,675);A.fixedMobile=true;e.setTrack('parking');const L=e.layoutCourse(A),c=L.lot.corral;assert(c);assert(c.xf+e.RAIL_R+10<L.lot.l-e.LOT_BAND,'visible gap from lot');assert(c.y1>c.y0);const carts=L.props.filter(p=>p.type==='cart'&&!p.stage),extra=L.props.filter(p=>p.type==='cart'&&p.stage);assert.equal(carts.length,e.CORRAL_CARTS);const gaps=carts.slice(1).map((p,i)=>Math.round((p.y-carts[i].y)*10));assert(new Set(gaps).size>=4,'nested carts use varied gaps');assert.equal(extra.length,2);assert(extra.some(p=>p.stage==='partial'&&p.y>carts[carts.length-1].y));assert(extra.some(p=>p.stage==='entrance'&&p.y>c.y1-5&&p.a!==-Math.PI/2));assert(c.y1-c.y0>=70);assert(carts.every(p=>p.x===c.x&&p.a===-Math.PI/2&&p.y>c.y0&&p.y<c.y1));assert(L.props.some(p=>p.type==='sign'));assert(L.posts.length>10);const w=e.createWorld('compact',A);w.cones=[];Object.assign(w.car,{x:c.x,y:c.y0-60,px:c.x,py:c.y0-60,a:Math.PI/2,pa:Math.PI/2,vx:0,vy:0,omega:0});for(let i=0;i<250;i++){e.step(w,{throttle:1,brake:0,steering:0});assert(w.car.y<c.y0+3,'back rail stops the car');}e.setTrack('signature');});
test('pit front faces perpendicular toward the nearest road',()=>{const A=e.makeArena(1350,675);A.fixedMobile=true;for(const id of ['signature','oval','eight']){e.setTrack(id);const l=e.layoutCourse(A),g=e.pitStopGeometry(A,l),centre=e.pitPoint(g,55,40),pts=l.track.pts;let closest=null;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy;if(!d)continue;const t=Math.max(0,Math.min(1,((centre.x-a[0])*dx+(centre.y-a[1])*dy)/d)),x=a[0]+dx*t,y=a[1]+dy*t,dist=(x-centre.x)**2+(y-centre.y)**2;if(!closest||dist<closest.dist)closest={x,y,dx,dy,dist};}const nx=-Math.sin(g.angle),ny=Math.cos(g.angle);assert(Math.abs(nx*closest.dx+ny*closest.dy)<1e-7,'front normal is perpendicular to the road');assert(nx*(closest.x-centre.x)+ny*(closest.y-centre.y)>0,'door faces the road');}e.setTrack('signature');});
test('pit building and canopy supports stop vehicles while the bay stays driveable',()=>{const A=e.makeArena(1350,675);A.fixedMobile=true;e.setTrack('signature');const g=e.pitStopGeometry(A,e.layoutCourse(A));for(const [u,v,du,dv] of [[-25,24,1,0],[72,24,-1,0],[24,-25,0,1],[24,75,0,-1]]){const w=e.createWorld('compact',A);w.cones=[];const a=e.pitPoint(g,u,v),b=e.pitPoint(g,u+du,v+dv),dx=b.x-a.x,dy=b.y-a.y;Object.assign(w.car,{x:a.x,y:a.y,px:a.x,py:a.y,a:Math.atan2(dy,dx),vx:dx*150,vy:dy*150});for(let i=0;i<36;i++)e.step(w,{steering:0,throttle:0,brake:0});assert(!e.pitOverlap(w.p,w.car,g));const x=w.car.x-g.x,y=w.car.y-g.y,localX=x*Math.cos(g.angle)+y*Math.sin(g.angle),localY=-x*Math.sin(g.angle)+y*Math.cos(g.angle);assert(du>0?localX<0:du<0?localX>g.w:dv>0?localY<0:localY>g.d,'car remains on its approach side');}const w=e.createWorld('compact',A),post=e.pitPosts(g)[1];w.cones=[];Object.assign(w.car,{x:post.x,y:post.y,a:g.angle,vx:0,vy:0});e.carPost(w,post);assert(e.boxDistance(w.p,w.car.x,w.car.y,w.car.a,post.x,post.y)>=post.r-.01);});
test('parking props retain two-tone sprites and fit their moving-object bounds',()=>{const check=(raw,ax,ay,b)=>{let ink=0,paper=0;for(let i=0;i<raw.data.length;i+=4){if(!raw.data[i+3])continue;const x=(i/4)%raw.width-ax,y=Math.floor((i/4)/raw.width)-ay;assert(x>=b.l&&x+1<=b.r&&y>=b.t&&y+1<=b.b);const rgb=Array.from(raw.data.slice(i,i+3)).join(',');assert(['48,52,45','191,193,177'].includes(rgb));if(rgb==='48,52,45')ink++;else paper++;}assert(ink>0);return paper;};assert(check(e.coneSprite(),10,14,e.CONE_BOX)>0);for(let i=0;i<e.CART_FRAMES;i++){check(e.cartSprite(i*e.TAU/e.CART_FRAMES),16,20,e.CART_BOX);check(e.cartShadowSprite(i*e.TAU/e.CART_FRAMES),16,20,e.CART_BOX);}assert.equal(e.ACCESS_MARK.length,17);assert(e.ACCESS_MARK.every(r=>r.length===17));});
test('continuous zoom responds across the full slider',()=>{let prev=0;for(const z of [300,600,900,1200,1800,2400]){const v=e.computeView(1280,720,1,z);assert(v.H>prev);assert(Math.abs(v.H-z)<=1);prev=v.H;}});
test('tuning extremes have materially different effects',()=>{function run(v){e.resetTuning();e.setTuning(v);const w=e.createWorld('coupe',e.makeArena(4000,4000));w.layout=null;w.cones=[];w.car.vx=90;w.car.a=w.car.pa=0;for(let i=0;i<120;i++)e.step(w,{steering:1,throttle:1,brake:0});return {a:w.car.a,slip:w.car.slip};}const a=run({steerAngle:.2,grip:4}),b=run({steerAngle:3,grip:.1});assert(Math.abs(a.a-b.a)>.2);assert(Math.abs(a.slip-b.slip)>5);e.resetTuning();});
test('every tuning control accepts both endpoints without invalid simulation state',()=>{for(const spec of e.TUNING_SPEC)for(const value of [spec.min,spec.max]){e.resetTuning();e.setTuning({[spec.key]:value});assert.equal(e.TUNING[spec.key],value);const w=e.createWorld('compact',e.makeArena(1400,1000));w.layout=null;w.cones=[];for(let i=0;i<240;i++)e.step(w,{throttle:1,brake:0,steering:.8});assert(Number.isFinite(w.car.x+w.car.y+w.car.a));}e.resetTuning();});
for(const id of ['signature','oval','eight'])test(id+' track has two usable lanes on desktop and phone arenas',()=>{e.setTrack(id);for(const [w,h,d] of [[1600,800,1],[390,844,3]]){const v=e.computeView(w,h,d),A=e.makeArena(v.W,v.H);Object.assign(A,{safe:{},uiU:v.scale/d,uiW:w,uiH:h,mobile:d>1});const L=e.layoutCourse(A);assert.equal(L.track.kind,id);assert(L.track.half>=2*Math.max(...Object.values(e.PRESETS).map(p=>p.width))*.9);assert(L.track.pts.length>100);assert(L.track.length>500);assert(L.gate.width>=L.track.half*2);}});
for(const id of Object.keys(e.PRESETS))test(id+' long drive remains finite',()=>{const w=e.createWorld(id,e.makeArena(1400,1000));w.manual=id==='coupe';for(let i=0;i<7200;i++){if(w.manual&&i%1200===0)e.shiftGear(w,Math.min(5,1+i/1200));e.step(w,{throttle:1,brake:0,steering:Math.sin(i/230)*.4});assert(Number.isFinite(w.car.x+w.car.y+w.car.vx+w.car.vy));}if(w.p.flying)assert.equal(w.car.state,'driving');});
const inpOf=c=>{const s=c.sample();return {steering:s.steering,throttle:s.throttle,brake:s.brake};};
// ==== Drone flight: Mode 2 sticks (left: lift + yaw; right: pitch + roll), angle mode with altitude hold ====
function droneWorld(tuning){e.resetTuning();if(tuning)e.setTuning(tuning);const w=e.createWorld('van',e.makeArena(4000,4000));w.layout=null;w.cones=[];return w;}
function flyFor(w,steps,sticks,log){for(let i=0;i<steps;i++){e.step(w,{steering:0,throttle:0,brake:0,sticks});if(log)log.push({x:w.car.x,y:w.car.y,a:w.car.a,z:w.car.z,r:w.car.tiltR,p:w.car.tiltP,s:Math.hypot(w.car.vx,w.car.vy)});}return w;}
const droneLocal=w=>{const c=w.car,cs=Math.cos(c.a),sn=Math.sin(c.a);return {fwd:c.vx*cs+c.vy*sn,side:-c.vx*sn+c.vy*cs};};
test('drone: centred sticks hover in place, level, at the start height; pedal input never flies it',()=>{const w=droneWorld(),x=w.car.x,y=w.car.y,a=w.car.a;flyFor(w,600,{});
 assert.equal(w.car.z,w.p.flightHeight);assert.equal(w.car.x,x);assert.equal(w.car.y,y);assert.equal(w.car.a,a);assert.equal(w.car.tiltR,0);assert.equal(w.car.tiltP,0);
 for(let i=0;i<240;i++)e.step(w,{throttle:1,brake:0,steering:1});assert.equal(Math.hypot(w.car.vx,w.car.vy),0);assert.equal(w.car.a,a);assert.equal(w.car.state,'driving');});
test('drone: the right stick tilts it and the tilt flies it (top speed p.max); released, it levels and drifts to a stop',()=>{
 const w=droneWorld(),log=[];flyFor(w,1,{pitch:1},log);assert(log[0].p>0&&log[0].s<1,'the tilt comes first, the speed after');
 flyFor(w,1199,{pitch:1},log);const top=log[log.length-1],f=droneLocal(w);
 assert(Math.abs(top.p-e.TILT_MAX*e.TILT_PITCH)<1e-6,'drawn nose down '+top.p);assert(top.s>w.p.max*.98&&top.s<=w.p.max,'top speed '+top.s);assert(f.fwd>w.p.max*.98&&Math.abs(f.side)<1e-6,'along its heading');
 flyFor(w,60,{});assert(Math.abs(w.car.tiltP)<.01,'levels within half a second '+w.car.tiltP);const s1=Math.hypot(w.car.vx,w.car.vy);assert(s1>w.p.max*.4,'but keeps drifting '+s1);
 flyFor(w,540,{});const s2=Math.hypot(w.car.vx,w.car.vy);assert(s2<w.p.max*.02,'drifts to a stop '+s2);
 const b=flyFor(droneWorld(),600,{pitch:-1});assert(b.car.tiltP<0&&droneLocal(b).fwd<-w.p.max*.9,'pulled back: nose up, flies backwards');});
test('drone: roll slides it toward its own right or left; yaw only turns it on the spot; forward follows the new heading',()=>{
 for(const dir of [1,-1]){const w=flyFor(droneWorld(),360,{roll:dir}),f=droneLocal(w);assert(dir*f.side>w.p.max*.9&&Math.abs(f.fwd)<1e-6,'slides '+dir);assert(dir*w.car.tiltR>e.TILT_MAX*.99,'banks that way '+dir);}
 const w=droneWorld(),a=w.car.a,x=w.car.x,y=w.car.y;flyFor(w,120,{yaw:1});const turned=e.angleDelta(a,w.car.a);
 assert(turned>e.FLY.yawRate*.8&&turned<e.FLY.yawRate,'turns right at about yawRate '+turned);assert.equal(w.car.x,x);assert.equal(w.car.y,y);
 flyFor(w,120,{});const held=w.car.a;flyFor(w,120,{});assert(Math.abs(e.angleDelta(held,w.car.a))<1e-4,'holds the heading once centred');
 flyFor(w,600,{pitch:1});const f=droneLocal(w);assert(f.fwd>w.p.max*.97&&Math.abs(f.side)<1e-6,'flies along the new heading');});
test('drone: the left stick climbs and descends, stops at the ceiling, and lands on the floor; dead zone and expo',()=>{
 const w=droneWorld();flyFor(w,60,{lift:1});assert(w.car.z>w.p.flightHeight+5,'climbs');flyFor(w,600,{lift:1});assert.equal(w.car.z,e.FLY.ceiling);
 flyFor(w,120,{});assert.equal(w.car.z,e.FLY.ceiling,'centred holds the height');
 flyFor(w,900,{lift:-1});assert.equal(w.car.z,e.FLY.floor);assert(w.car.landed);
 const x=w.car.x,a=w.car.a;flyFor(w,240,{pitch:1,roll:1,yaw:1});assert.equal(w.car.x,x);assert.equal(w.car.a,a);assert.equal(w.car.tiltP,0,'landed: the other sticks wait for lift-off');
 flyFor(w,120,{lift:1,pitch:1});assert(w.car.z>e.FLY.floor+5&&droneLocal(w).fwd>0&&!w.car.landed,'takes off and flies');
 const n=e.normalizeSticks({lift:e.FLY.dead*.9,yaw:1,pitch:-1,roll:'x'});assert.equal(n.lift,0,'inside the dead zone');assert(Math.abs(n.yaw-1)<1e-12&&Math.abs(n.pitch+1)<1e-12,'full deflection stays full');assert.equal(n.roll,0);
 const half=e.normalizeSticks({yaw:.5}).yaw;assert(half>0&&half<.5,'expo softens the centre '+half);assert.equal(Object.values(e.normalizeSticks()).join(),'0,0,0,0');});
test('drone: the drawn tilt is cosmetic (droneTilt 0 draws it level, the flight is identical); cars never tilt; deterministic',()=>{
 const run=g=>{const w=droneWorld({droneTilt:g}),log=[];flyFor(w,200,{pitch:.7,roll:-.5,yaw:.3,lift:.4},log);e.resetTuning();return log;};
 const on=run(1),off=run(0),big=run(2),path=l=>JSON.stringify(l.map(q=>[q.x,q.y,q.a,q.z,q.s]));
 assert(off.every(q=>q.r===0&&q.p===0),'level when off');assert(on.some(q=>q.r<0)&&on.some(q=>q.p>0),'banks left, nose down');
 assert.equal(path(on),path(off),'same flight');assert.equal(path(on),path(big));assert.equal(JSON.stringify(on),JSON.stringify(run(1)),'deterministic');
 for(const q of big)assert(Math.abs(q.r)<=e.TILT_MAX&&Math.abs(q.p)<=e.TILT_MAX);
 for(const id of ['compact','coupe']){const w=e.createWorld(id,e.makeArena(4000,4000));w.layout=null;w.cones=[];for(let i=0;i<200;i++)e.step(w,{throttle:1,brake:0,steering:1,sticks:{pitch:1,roll:1}});assert.equal(w.car.tiltR||0,0);assert.equal(w.car.tiltP||0,0);assert.equal(w.car.z,undefined,'cars have no flight height');}});
test('drone: gate posts stop it low down; above FLY.clear it flies over them',()=>{
 const make=z=>{e.resetTuning();const w=e.createWorld('van');w.cones=[];const post=w.layout.gate.posts[0];Object.assign(w.car,{x:post.x-w.p.length/2-post.r-6,y:post.y,a:0,pa:0,vx:120,vy:0,omega:0,z,pz:z});flyFor(w,60,{});return {w,post};};
 const low=make(20),high=make(e.FLY.clear+2);
 assert(low.w.car.x<low.post.x-low.w.p.length/2-low.post.r+1,'low: stopped by the post '+(low.w.car.x-low.post.x));assert(high.w.car.x>high.post.x,'high: over the post '+(high.w.car.x-high.post.x));});
test('drone: its height raises the sprite, pushes the shadow and grows the box to cover both',()=>{
 const w=droneWorld();for(const z of [e.FLY.floor,w.p.flightHeight,e.FLY.ceiling]){w.car.z=w.car.pz=z;const d=e.carDrawable(w,1),dz=z-w.p.flightHeight,base=e.carScreenBounds(w.p,w.car.a,0);
  if(!dz){assert.equal(d.lift,null);assert.equal(JSON.stringify(d.box),JSON.stringify(base));continue;}
  assert.equal(d.lift.y,-Math.round(e.Z*dz));assert.equal(d.lift.sx,Math.round(e.LIGHT.x*dz));assert.equal(d.lift.sy,Math.round(e.LIGHT.y*dz));
  const b=d.box;for(const [ox,oy] of [[0,d.lift.y],[d.lift.sx,d.lift.sy]])assert(b.l<=base.l+ox&&b.r>=base.r+ox&&b.t<=base.t+oy&&b.b>=base.b+oy,'covers the moved layer at z '+z);
  assert.equal(JSON.stringify(e.carBox(w)),JSON.stringify(b),'culling, wrapping and recovery use the same box');}
 w.car.z=w.car.pz=e.FLY.ceiling;assert(e.carDrawable(w,1).key>e.GATE_FRONT,'high up it draws over the arch');
 w.car.z=w.car.pz=w.p.flightHeight;assert.equal(e.carDrawable(w,1).key,Math.round(w.car.y*e.K),'at flight height it sorts by its ground line');
 w.car.pz=20;w.car.z=30;assert.equal(e.liftOf(w,.5),5,'interpolated between steps');for(const id of ['compact','coupe'])assert.equal(e.liftOf(e.createWorld(id),1),0);});
test('controls: Mode 2 keys and thumb sticks fly the Drone; the arrows still drive the cars',()=>{
 const c=e.createControls(),st=()=>{const s=c.sticks();return [s.lift,s.yaw,s.pitch,s.roll].join();};
 assert.equal(st(),'0,0,0,0');c.keyDown('w');c.keyDown('d');c.keyDown('up');c.keyDown('left');assert.equal(st(),'1,1,1,-1','W climbs, D turns right, up flies forward, left slides left');
 c.keyDown('back');c.keyDown('a');c.keyDown('down');c.keyDown('right');assert.equal(st(),'0,0,0,0','opposite keys cancel');
 c.releaseAll();c.keyDown('back');assert.equal(st(),'-1,0,0,0','S descends');c.releaseAll();
 c.keyDown('w');c.keyDown('up');assert(c.bindPointer('stickL',3));assert(c.setStick('stickL',.4,-.6,3));assert.equal(st(),'-0.6,0.4,1,0','a held stick owns both its axes');
 assert.equal(c.setStick('stickL',1,1,9),false,'another pointer cannot move it');assert.equal(c.setStick('stickR',1,1,3),false,'an unheld stick cannot move');assert.equal(c.setStick('wheel',1,1,3),false);
 c.setStick('stickL',5,-5,3);assert.equal(st(),'-1,1,1,0','clamped');
 assert(c.bindPointer('stickR',4));c.setStick('stickR',-.5,.25,4);assert.equal(st(),'-1,1,0.25,-0.5','two thumbs at once');
 const v=c.visual();assert(v.owned.stickL&&v.owned.stickR);assert.equal([v.sticks.lift,v.sticks.yaw,v.sticks.pitch,v.sticks.roll].join(),st());
 c.releasePointer(3);assert.equal(st(),'1,0,0.25,-0.5','a released stick springs back to its keys');
 c.releaseAll();assert.equal(st(),'0,0,0,0');assert.equal(c.owner('stickR'),null);
 const k=e.createControls();k.keyDown('up');k.keyDown('left');assert.deepEqual(inpOf(k),{steering:-1,throttle:1,brake:0},'up and left drive like W and A');
 k.releaseAll();k.keyDown('down');assert.equal(k.sample().brake,1,'down brakes like S');const r=e.createControls({reverse:()=>true});r.keyDown('down');assert.deepEqual(inpOf(r),{steering:0,throttle:1,brake:0},'down reverses in R like S');});
test('drone: the painted guide shows W S CLIMB, A D TURN and ARROWS FLY (no gas, shift or brake)',()=>{
 for(const [zw,zh] of [[270,220],[240,120],[350,300]]){const L=e.paintLayout(zw,zh,{shift:true,fly:true}),keys=L.items.filter(i=>i.t==='key').map(i=>i.ch).join(' '),text=L.items.filter(i=>i.t==='text').map(i=>i.s).join('|');
  assert.equal(keys,'R W S A D ARROWS',zw+'x'+zh);assert(L.w<=zw&&L.h<=zh);if(L.mode==='side')assert.equal(text,'NEW RACE|CLIMB|TURN|FLY');
  const X=L.items.find(i=>i.ch==='ARROWS');assert(X.m.w<=X.w,'ARROWS fits its key');}
 const car=e.paintLayout(270,220,{shift:true});assert(car.items.some(i=>i.ch==='BRAKE')&&car.items.some(i=>i.ch==='Q'),'cars keep their guide');});
test('drone: the thumb sticks are equal squares in the bottom corners, clear of each other and the top controls, thumb-sized',()=>{
 for(const [W,H,dpr,mobile] of [[1600,800,1,false],[1920,1080,1,false],[1366,768,1,false],[844,390,3,true],[390,844,3,true],[320,568,2,true]]){
  const v=e.computeView(W,H,dpr),u=v.scale/dpr,zs=e.controlZones({...v,u,cssW:W,cssH:H,mobile}),pads=e.flyPadZones(zs,e.UI_MARGIN*1.4/u),px=q=>({l:q.l*u,t:q.t*u,r:q.r*u,b:q.b*u}),name=W+'x'+H;
  assert.equal(pads.length,2);const [L,R]=pads.map(px),s=L.r-L.l;
  assert(Math.abs((L.b-L.t)-s)<1e-6&&Math.abs((R.r-R.l)-s)<1e-6&&Math.abs((R.b-R.t)-s)<1e-6,name+' equal squares');
  assert(s>=88,name+' thumb-sized '+s);assert(L.l>=0&&L.t>=0&&R.r<=W+1e-6&&L.b<=H+1e-6&&R.b<=H+1e-6,name+' on screen');assert(R.l-L.r>=e.UI_GAP*u-1e-6,name+' apart');assert(Math.abs((W-R.r)-L.l)<1e-6,name+' same margin on both sides '+(W-R.r)+' / '+L.l);
  for(const id of ['hud','speed','restart','race'])for(const P of [L,R]){const q=px(zs.find(z=>z.id===id));assert(!(P.l<q.r&&q.l<P.r&&P.t<q.b&&q.t<P.b),name+' clear of '+id);}}});
test('tilted drone frames are two-tone and stay inside carScreenBounds; the level frame is unchanged',()=>{const p=e.PRESETS.van,S=e.TILT_STEPS;
 for(let i=0;i<e.FRAMES;i+=4){const a=i*e.TAU/e.FRAMES,b=e.carScreenBounds(p,a);assert.deepEqual(e.droneSprite(p,a).data,e.carSprite(p,a).data);
  for(const r of [-S,0,S])for(const q of [-S,0,S])for(const img of [e.droneSprite(p,a,p.sprite,r*e.TILT_STEP,q*e.TILT_STEP),e.droneShadow(p,a,r*e.TILT_STEP,q*e.TILT_STEP)]){let lit=0;
   for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){const k=(y*img.width+x)*4;if(!img.data[k+3])continue;lit++;assert(x-p.sprite.ax>=b.l&&x-p.sprite.ax<b.r&&y-p.sprite.ay>=b.t&&y-p.sprite.ay<b.b,'pixel inside bounds');assert(img.data[k]===48||img.data[k]===191);}
   assert(lit>20);}}
 const lvl=e.droneSprite(p,0),tilted=e.droneSprite(p,0,p.sprite,e.TILT_MAX,0);assert.notDeepEqual(lvl.data,tilted.data,'a full bank looks different');});
// ==== Round 3 tests: r3-ui ====
const r3Screens=[[1600,800,1,false],[1920,1080,1,false],[1366,768,1,false],[844,390,3,true],[390,844,3,true]];
function r3Zones(cssW,cssH,dpr,mobile,zoom=750){const v=e.computeView(cssW,cssH,dpr,zoom),u=v.scale/dpr,zs=e.controlZones({...v,u,cssW,cssH,mobile});const z=id=>{const q=zs.find(q=>q.id===id);return {...q,w:(q.r-q.l)*u,h:(q.b-q.t)*u};};return {u,z,zs};}
const r3Overlap=(a,b)=>a.l<b.r&&b.l<a.r&&a.t<b.b&&b.t<a.b;
test('r3-ui: speed readout is big and fits its zone on desktop and phones at every zoom',()=>{
 for(const [W,H,dpr,mobile] of r3Screens)for(const zoom of [300,750,1000]){const s=r3Zones(W,H,dpr,mobile,zoom).z('speed');
  for(const manual of [false,true]){const f=e.speedFit(s.w,s.h,manual);assert(f.size>=Math.min(36,s.h*.6),W+'x'+H+' zoom '+zoom+' manual '+manual+': '+f.size+'px');
   assert(f.size<=s.h*.82+1e-9,'one row tall at most');assert(f.size*(manual&&!f.stack?e.SPEED_EM.manual:e.SPEED_EM.auto)<=s.w+1,'fits the zone width');
   if(!manual)assert(!f.stack);}
  assert.deepEqual(e.speedFit(s.w,s.h,true),e.speedFit(s.w,s.h,true),'deterministic');}
 // the decorative unit follows the screen, never the zoom
 assert.equal(e.uiPx(1600,800),2);assert.equal(e.uiPx(390,844),1);assert.equal(e.uiPx(3840,2160),2.5);assert.equal(e.speedFit(0,0,true).size,10);});
test('r3-ui: shift keycaps sit beside the stick inside the gear zone, never on the stick, pedals or wheel',()=>{
 for(const [W,H,dpr,mobile] of r3Screens){const {z}=r3Zones(W,H,dpr,mobile),g=z('gear'),p=z('pedals'),wh=z('wheel'),k=e.shiftKeyLayout(g.w,g.h);
  assert(k.kw>=14&&k.kh>=8&&k.kd>=2,W+'x'+H);assert(k.fl>=k.kw+1,'gap between keys and stick face');assert(k.fw+k.fl<=g.w+1e-9,'face inside the zone');
  assert(k.pt>=-1e-9&&k.pt+k.ph<=g.h+1e-9,'key column inside the zone');assert(2*(k.kh+k.kd)+k.gap<=k.ph+1e-9,'E and Q caps do not touch');
  assert(Math.min(k.fw/110,g.h/100)*100>=55,W+'x'+H+' stick plate stays usable: '+Math.min(k.fw/110,g.h/100)*100);
  assert(!r3Overlap(g,p)&&!r3Overlap(g,wh),'gear zone clear of pedals and wheel');
  if(mobile)assert(g.l>=p.l-1e-9&&g.r<=p.r+1e-9,'phone: the widened gear zone stays above the pedals');}});
test('r3-ui: gear cues follow gearTelemetry and the shiftGear rules',()=>{
 const w=e.createWorld('coupe',e.makeArena(4000,4000));w.layout=null;w.cones=[];w.manual=true;
 let c=e.gearCues(w);assert.deepEqual({...c.up},{hot:false,ok:true});assert.deepEqual({...c.down},{hot:false,ok:false});
 for(let i=0;i<600&&!e.gearTelemetry(w).shiftUp;i++)e.step(w,{throttle:1,brake:0,steering:0});
 assert(e.gearTelemetry(w).shiftUp,'reaches the shift-up point');assert(e.gearCues(w).up.hot,'up key pulses');
 for(const g of [2,3,4,5]){w.car.vx=w.car.vy=0;assert(e.shiftGear(w,g));}assert.equal(e.gearCues(w).up.ok,false,'no gear above 5');assert(e.gearCues(w).down.ok);
 w.car.vx=w.p.max;c=e.gearCues(w);assert.equal(c.down.ok,false,'too fast to shift down');assert.equal(e.shiftGear(w,4),false,'shiftGear agrees');
 w.car.vx=w.p.max*e.GEARS[4]*.5;assert(e.gearCues(w).down.ok);assert(e.shiftGear(w,4),'shiftGear agrees');
 const auto=e.createWorld('compact',e.makeArena(4000,4000));for(const k of ['up','down'])assert.deepEqual({...e.gearCues(auto)[k]},{hot:false,ok:false});});
test('r3-ui: track thumbnails are 1-bit, padded, cover the whole lane line and differ per track',()=>{
 assert.deepEqual({...e.trackThumbSize(1500,750)},{w:64,h:32});assert.deepEqual({...e.trackThumbSize(390,844)},{w:30,h:64});assert.deepEqual({...e.trackThumbSize(4000,400)},{w:64,h:28});
 assert(new Set(e.TRACKS.map(t=>t.id)).size===e.TRACKS.length&&e.TRACKS.every(t=>typeof t.name==='string'&&t.name));
 for(const [cssW,cssH,dpr,mobile] of r3Screens){const v=e.computeView(cssW,cssH,dpr,750),W=v.W,H=v.H,A=e.makeArena(W,H),seen=new Set();Object.assign(A,{mobile,uiU:v.scale/dpr,uiW:cssW,uiH:cssH});
  for(const {id} of e.TRACKS){const L=e.buildCourse({...A,E:e.edgeClear(A)},[],id),pts=L.track.pts.map(p=>[p[0],p[1]*e.K]),sz=e.trackThumbSize(W,H),m=e.trackThumb(pts,sz.w,sz.h);
   assert.equal(m.bits.length,m.w*m.h);let ink=0;for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){const v=m.bits[y*m.w+x];assert(v===0||v===1);if(v){ink++;assert(x>=2&&y>=2&&x<m.w-2&&y<m.h-2,id+' padded');}}
   assert(ink>40,id+' has a visible line');assert.deepEqual(m,e.trackThumb(pts,sz.w,sz.h),'deterministic');
   // every lane point lands on (or next to) an ink pixel: the line is continuous
   let l=1e9,t=1e9,r=-1e9,b=-1e9;for(const [x,y] of pts){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}const s=Math.min((m.w-6.2)/(r-l),(m.h-6.2)/(b-t)),ox=(m.w-(r-l)*s)/2-l*s,oy=(m.h-(b-t)*s)/2-t*s;
   for(const [x,y] of pts){const px=Math.floor(x*s+ox),py=Math.floor(y*s+oy);let hit=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)hit=hit||!!m.bits[(py+dy)*m.w+px+dx];assert(hit,id+' line continuous');}
   seen.add(Buffer.from(m.bits).toString('base64'));}
  assert.equal(seen.size,e.TRACKS.length,'each track has its own picture');}
 assert.equal(e.trackThumb([],10,10).bits.reduce((a,b)=>a+b,0),0);});
// ==== Round 3 tests: r3-paint ====
// Round 2's keycapRuns (1 px outline), kept here to check the round 3 default is unchanged.
function keycapRunsR2(x,y,w,h,d,out=[]){for(let r=0;r<h+d;r++){const yy=y+r,lo=Math.max(0,r-h+1),hi=Math.min(d,r);if(r===0)out.push([x+1,yy,w-2]);else if(r<h-1){out.push([x,yy,1]);out.push([x+w-1,yy,1+hi]);}
 else{const last=r===h+d-1,a=x+lo+(r===h-1||last?1:0),b=x+w-1+hi-(last?1:0);out.push([a,yy,b-a+1]);}}return out;}
function paintArena(cw,ch,dpr,mobile,short=750){const v=e.computeView(cw,ch,dpr,short),u=v.scale/dpr,A=e.makeArena(v.W,v.H);Object.assign(A,{mobile,uiU:u,uiW:cw,uiH:ch});return {A,u};}
const PAINT_SCREENS=[[1600,800,1,false],[1920,1080,1,false],[1366,768,1,false],[1600,800,1,false,400],[844,390,3,true],[390,844,3,true]];
// World distance from screen point (x, sy) to the lane band edge (centreline: closed polyline, world units; screen y = world y × K).
function laneGap(L,x,sy){const P=L.track.pts,wy=sy/e.K;let m=Infinity;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy,t=l2?Math.max(0,Math.min(1,((x-a[0])*dx+(wy-a[1])*dy)/l2)):0;m=Math.min(m,Math.hypot(a[0]+t*dx-x,a[1]+t*dy-wy));}return m-L.track.half;}
test('paint pixel size: ground px on desktop at the 750 view, 2 ground px on dense phones; always a whole px >= 1',()=>{
 assert.equal(e.paintPx(e.computeView(1600,800,1,750).scale),1);assert.equal(e.paintPx(e.computeView(1600,800,1,400).scale),1);
 assert.equal(e.paintPx(e.computeView(844,390,3,750).scale/3),2);for(const u of [0,-1,NaN,Infinity,.05,.3,1,5])assert(Number.isInteger(e.paintPx(u))&&e.paintPx(u)>=1);});
test('stripes are 2 ink rows / 1 paper row from each item top; stripe heights keep the top and bottom rows inked',()=>{
 const m={w:3,h:14,bits:new Uint8Array(42).fill(1)},rows=[...new Set(e.maskRuns(m,5,7,[],e.PAINT_STRIPE).map(r=>r[1]-7))];
 assert.equal(e.PAINT_STRIPE,3);assert.deepEqual(rows,[0,1,3,4,6,7,9,10,12,13]);assert.equal(e.maskRuns(m,0,1,[],1).length,14);
 for(let v=1;v<60;v++){const h=e.stripeH(v);assert(h<=Math.max(1,v));if(h>=3)assert.equal(h%3,2);}});
test('keycap: 1 px outline unchanged from round 2; 2 px outline is a thicker ring with the same extruded side',()=>{
 for(const [w,h,d] of [[6,5,2],[18,16,3],[40,36,7]])assert.equal(JSON.stringify(e.keycapRuns(3,4,w,h,d)),JSON.stringify(keycapRunsR2(3,4,w,h,d)));
 const cells=runs=>{const s=new Set();for(const [x,y,n] of runs)for(let i=0;i<n;i++)s.add(x+i+','+y);return s;},one=cells(e.keycapRuns(0,0,40,36,7)),two=cells(e.keycapRuns(0,0,40,36,7,[],2));
 for(const c of one)assert(two.has(c));assert(two.has('1,10')&&!one.has('1,10')&&two.has('38,10')&&!two.has('2,10')&&!two.has('20,20'));
 for(let y=10;y<30;y++)assert.equal(two.has('46,'+y),one.has('46,'+y));});
test('desktop keycaps at the 750 view: big W above S, A S D in a row, GAS right of W, LEFT left of A, RIGHT right of D, BRAKE under S',()=>{
 for(const [cw,ch] of [[1600,800],[1920,1080],[1366,768]]){const {A}=paintArena(cw,ch,1,false),z=e.keepOuts(A).find(q=>q.id==='instructions'),zw=Math.floor(z.r-z.l),zh=Math.floor(z.b-z.t);
  const L=e.paintLayout(zw,zh,{}),it=Object.fromEntries(L.items.map(i=>[i.ch||i.s,i]));assert.equal(L.mode,'side');assert(L.w<=zw&&L.h<=zh);
  const {W,A:a,S,D,GAS,LEFT,RIGHT,BRAKE}=it;assert(W&&a&&S&&D&&GAS&&LEFT&&RIGHT&&BRAKE,'all items');assert(S.w>=30,'keys are big: '+S.w);
  assert(W.y+W.h<=a.y&&a.y===S.y&&S.y===D.y&&a.x<S.x&&S.x<D.x&&W.x>a.x&&W.x<D.x,'keyboard layout');
  assert(GAS.x>=W.x+W.w+W.d&&GAS.y<a.y,'GAS right of W');assert(LEFT.x+LEFT.w<=a.x&&LEFT.y>=a.y&&LEFT.y<a.y+a.h,'LEFT left of A');
  assert(RIGHT.x>=D.x+D.w+D.d&&RIGHT.y>=D.y&&RIGHT.y<D.y+D.h,'RIGHT right of D');assert(BRAKE.y>=S.y+S.h+S.d&&BRAKE.x<S.x+S.w&&BRAKE.x+BRAKE.w>S.x,'BRAKE under S');
  assert(S.lt>=e.PAINT_KEY_SOLID_BELOW&&LEFT.h>=e.PAINT_SOLID_BELOW,'key letters and labels are striped');assert(LEFT.h<S.lt,'labels smaller than key letters');
  const Q=e.paintLayout(zw,zh,{shift:true});assert(Q.items.some(i=>i.ch==='Q')&&Q.items.some(i=>i.ch==='E')&&Q.w<=zw&&Q.h<=zh);}});
test('paint on a px grid: runs are 1 row tall, px-aligned blocks inside the zone; empty or tiny zones paint nothing',()=>{
 const A=e.makeArena(1624,750),zone={l:5,t:66,r:346,b:250};
 for(const px of [1,2,3]){const runs=e.paintRuns(A,zone,{px});assert(runs.length>50);const t0=Math.min(...runs.map(r=>r[1])),rows=new Map();
  for(const [x,y,n] of runs){assert(x>=zone.l&&x+n<=zone.r&&y>=zone.t&&y<zone.b);assert.equal((x-zone.l)%px,0);assert.equal(n%px,0);assert.equal((y-t0)%1,0);
   const k=Math.floor((y-t0)/px),key=x+':'+n;if(!rows.has(k))rows.set(k,new Map());const m=rows.get(k);m.set(key,(m.get(key)||0)+1);}
  for(const m of rows.values())for(const c of m.values())assert.equal(c,px,'each paint row repeats px times');}
 assert.equal(e.paintRuns(A,{l:5,t:66,r:5,b:66},{px:2}).length,0);assert.equal(e.paintRuns(A,{l:5,t:66,r:12,b:200},{px:2}).length,0);});
test('title fit: biggest stripe height <= TITLE_MAX that fits the box; null when too small',()=>{
 const m=e.titleFit(400,60);assert(m&&m.w<=400&&m.h<=60&&m.h%3===2&&m.h>=e.TITLE_MIN);assert.equal(e.titleFit(4000,400).h,e.TITLE_MAX);
 assert.equal(e.titleFit(40,60),null);assert.equal(e.titleFit(400,e.TITLE_MIN-1),null);});
for(const id of ['signature','oval','eight'])test(id+': painted title sits off the lane, the control zones and the edges, bigger than the labels, on every screen',()=>{e.setTrack(id);
 for(const [cw,ch,dpr,mobile,short] of PAINT_SCREENS){const {A,u}=paintArena(cw,ch,dpr,mobile,short),L=e.layoutCourse(A),zones=e.keepOuts(A),px=e.paintPx(u),tag=id+' '+cw+'x'+ch+'@'+dpr+'/'+(short||750);
  const spot=()=>e.titleFallbackSpot(L,A,zones,10,(e.TITLE_MAX+4)*px,(e.TITLE_MIN+2)*px),r=spot();assert(r,'a spot fits '+tag);assert.deepEqual(spot(),r,'deterministic');
  assert(r.l>=0&&r.t>=0&&r.r<=A.W&&r.b<=A.H&&r.r-r.l>=150&&r.b-r.t>=24,'inside the arena, at least 150 × 24 '+tag);
  for(const z of zones)assert(r.r+e.TITLE_GAP<=z.l||r.l>=z.r+e.TITLE_GAP||r.b+e.TITLE_GAP<=z.t||r.t>=z.b+e.TITLE_GAP,'clear of '+z.id+' '+tag);
  for(let y=r.t;y<=r.b;y+=2)for(let x=r.l;x<=r.r;x+=4)assert(laneGap(L,x,y)>=e.TITLE_GAP-.5,'off the lane '+tag+' at '+x+','+y);
  for(const c of L.cones){const cx=c.x,cy=c.y*e.K;assert(cx+e.CONE_R<=r.l||cx-e.CONE_R>=r.r||cy+e.CONE_R<=r.t||cy-e.CONE_H>=r.b,'clear of cones '+tag);}
  const rect=e.titleRect(L,A,{px}),runs=e.titleRuns(A,rect,{px});assert(runs.length>20,'title painted '+tag);
  for(const [x,y,n] of runs){assert(x>=rect.l&&x+n<=rect.r&&y>=rect.t&&y<rect.b,'inside its rect');assert(laneGap(L,x,y)>0&&laneGap(L,x+n-1,y)>0,'title ink off the lane '+tag);}
  const z=zones.find(q=>q.id==='instructions');if(z.r-z.l>40){const P=e.paintLayout(Math.floor((z.r-z.l)/px),Math.floor((z.b-z.t)/px),{}),lab=Math.max(...P.items.filter(i=>i.t==='text').map(i=>i.h));
   assert(Math.max(...runs.map(q=>q[1]))-Math.min(...runs.map(q=>q[1]))+1>lab*px,'title taller than the labels '+tag);}}});
test('title is skipped when no spot fits; the ground no longer draws monospace text; paint and title use INK only',()=>{
 const A=e.makeArena(1500,750),wall={track:{half:800,pts:[[750,0],[750,1136]]},cones:[]};assert.equal(e.titleFallbackSpot(wall,A,[]),null);assert.equal(e.titleRuns(A,null).length,0);
 assert.equal(e.titleFallbackSpot(null,e.makeArena(120,90),[]),null);
 const styles=new Set();let texts=0;const gc={fillRect(){},fillText(){texts++;},strokeText(){texts++;},save(){},restore(){},set fillStyle(v){styles.add(v);},get fillStyle(){return '';},set font(v){},set globalAlpha(v){},set textAlign(v){}};
 e.setTrack('signature');const {A:B}=paintArena(1600,800,1,false),L=e.layoutCourse(B);e.drawGround(gc,B,L);assert.equal(texts,0,'no fillText on the ground');
 styles.clear();assert(e.drawTitle(gc,B,L,{px:1})>0);assert(e.drawPaint(gc,B,e.keepOuts(B).find(q=>q.id==='instructions'),{})>0);assert.deepEqual([...styles],['#30342d']);});
// ==== Round 3 tests: r3-course ====
// Arenas as the page builds them (computeView + the safe/uiU/uiW/uiH/mobile flags), at the zoom levels the slider offers.
const R3_VIEWS=[['desktop 1600x800',1600,800,1],['desktop 1920x1080',1920,1080,1],['desktop 1366x768',1366,768,1],['phone 844x390',844,390,3],['phone 390x844',390,844,3]];
const r3Arena=(w,h,d,short)=>{const v=e.computeView(w,h,d,short),A=e.makeArena(v.W,v.H);return Object.assign(A,{safe:{},uiU:v.scale/d,uiW:w,uiH:h,mobile:d>1||w<700});};
const r3Layouts=new Map();
function r3Layout(id,w,h,d,short){const k=[id,w,h,d,short].join();if(!r3Layouts.has(k)){e.setTrack(id);const A=r3Arena(w,h,d,short);r3Layouts.set(k,{A,L:e.layoutCourse(A)});}return r3Layouts.get(k);}
const r3Each=(shorts,f)=>{for(const short of shorts)for(const [name,w,h,d] of R3_VIEWS)for(const id of ['signature','oval','eight']){const {A,L}=r3Layout(id,w,h,d,short);f(id,A,L,name+' @'+short);}};
// Smallest gap (screen px) between the lane band (centreline ± half, world units) and the edge strip / every control zone.
function r3LaneGap(A,L){const z=e.keepOuts(A),E=e.edgeClear(A),h=L.track.half;let edge=Infinity,zone=Infinity,who='';
 for(const p of L.track.pts)for(let k=0;k<16;k++){const x=p[0]+h*Math.cos(k*Math.PI/8),y=(p[1]+h*Math.sin(k*Math.PI/8))*e.K;edge=Math.min(edge,x-E,y-E,A.W-E-x,A.H-E-y);
  for(const q of z){const dx=Math.max(q.l-x,0,x-q.r),dy=Math.max(q.t-y,0,y-q.b),g=dx||dy?Math.hypot(dx,dy):-Math.min(x-q.l,q.r-x,y-q.t,q.b-y);if(g<zone){zone=g;who=q.id;}}}
 return {edge,zone,who};}
const r3Seg=(a,b,c,d)=>{const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);const d1=o(c,d,a),d2=o(c,d,b),d3=o(a,b,c),d4=o(a,b,d);return ((d1*d2<0&&d3*d4<=0)||(d1*d2<=0&&d3*d4<0))?[a[0]+(b[0]-a[0])*d1/(d1-d2),a[1]+(b[1]-a[1])*d1/(d1-d2)]:null;};
// Points where the centreline crosses itself (a crossing exactly at a vertex shows as two coincident vertices, or may be counted by both of its segments).
function r3Crossings(P){const n=P.length,out=[];for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;const x=r3Seg(P[i],P[(i+1)%n],P[j],P[(j+1)%n]);if(x)out.push(x);else if(Math.hypot(P[i][0]-P[j][0],P[i][1]-P[j][1])<1e-6)out.push(P[i]);}return out;}
test('r3-course: at the 750 default every track is the one chosen and its lane clears the edge strip and every control zone (instructions, wheel, gear included)',()=>{
 assert.equal(e.TUNING_DEFAULTS.viewShort,750);
 r3Each([750],(id,A,L,where)=>{assert.equal(L.track.kind,id,where);const g=r3LaneGap(A,L);assert(g.edge>=0,id+' edge '+where+' '+g.edge);assert(g.zone>=8,id+' '+g.who+' '+where+' '+g.zone);});});
test('r3-course: lanes clear the edge strip and every zone at other zooms too (a shape that does not fit gives way to the oval)',()=>{
 r3Each([400,1000],(id,A,L,where)=>{assert(L.track.kind===id||L.track.kind==='oval',where);const g=r3LaneGap(A,L);assert(g.edge>=0,id+' edge '+where);assert(g.zone>=4,id+' '+g.who+' '+where+' '+g.zone);});
 r3Each([1000],(id,A,L,where)=>assert.equal(L.track.kind,id,where));});
test('r3-course: no track overlaps itself; the figure-eight crosses itself exactly once, in the middle',()=>{
 r3Each([400,750,1000],(id,A,L,where)=>{const P=L.track.pts,n=P.length,h=L.track.half,D=2*h+12,cum=[0];for(let i=0;i<n;i++)cum.push(cum[i]+Math.hypot(P[(i+1)%n][0]-P[i][0],P[(i+1)%n][1]-P[i][1]));
  const len=cum[n],cr=L.track.cross,near=p=>cr&&Math.hypot(p[0]-cr.x,p[1]-cr.y)<1.5*D;
  // Lane bands of parts more than two lane widths apart along the lane keep a clear gap (8 world units) between them.
  for(let i=0;i<n;i+=2)for(let j=i+2;j<n;j+=2){const s=cum[j]-cum[i];if(s<2*D||len-s<2*D||(near(P[i])&&near(P[j])))continue;assert(Math.hypot(P[i][0]-P[j][0],P[i][1]-P[j][1])>=2*h+8,id+' overlaps itself '+where);}
  // Every bend is wider than the half lane, so the inner lane edge never folds back over itself.
  assert(e.trackRadiusOk(P,h),id+' bend tighter than the lane '+where);
  const xs=r3Crossings(P);
  if(L.track.kind==='eight'){assert(xs.length>=1&&xs.length<=4,'one crossing '+where+' '+xs.length);for(const x of xs)assert(Math.hypot(x[0]-cr.x,x[1]-cr.y)<6);
   const b=L.track.box;assert(Math.abs(cr.x-(b.x+b.w/2))<2&&Math.abs(cr.y-(b.y+b.h/2))<2,'crossing in the middle '+where);
   // Two loops: points well inside each half of the figure lie in their own loop's infield.
   const ax=b.w>=b.h?0:1,span=ax?b.h:b.w;for(const sgn of [-1,1]){const q=[cr.x,cr.y];q[ax]+=sgn*span/4;assert(e.insideLoop(P,q[0],q[1]),'loop '+sgn+' '+where);}}
  else{assert.equal(L.track.cross,null);assert.equal(xs.length,0,id+' crosses itself '+where);}});});
test('r3-course: gate on a straight-ish part (on the eight, away from the crossing); spawn before it facing through it; posts off the lane',()=>{
 r3Each([750],(id,A,L,where)=>{const P=L.track.pts,n=P.length,g=L.gate,s=L.spawn,h=L.track.half;let gi=0;P.forEach((p,i)=>{if(Math.hypot(p[0]-g.x,p[1]-g.y)<Math.hypot(P[gi][0]-g.x,P[gi][1]-g.y))gi=i;});
  assert(Math.hypot(P[gi][0]-g.x,P[gi][1]-g.y)<1,'gate on the centreline '+where);
  const head=i=>{const a=P[(i+n-2)%n],b=P[(i+2)%n];return Math.atan2(b[1]-a[1],b[0]-a[0]);};let turn=0;for(let k=-15;k<15;k++)turn+=Math.abs(e.angleDelta(head((gi+k+n)%n),head((gi+k+1+n)%n)));
  assert(turn<.5,id+' gate on a bend '+where+' '+turn);
  if(id==='eight')assert(Math.hypot(g.x-L.track.cross.x,g.y-L.track.cross.y)>=2*(2*h+12),'gate away from the crossing '+where);
  for(const q of g.posts)assert(P.every(p=>Math.hypot(p[0]-q.x,p[1]-q.y)>=h+q.r),'post on the lane '+where);
  const d=Math.hypot(g.x-s.x,g.y-s.y);assert(d>50&&d<80,'spawn distance '+where+' '+d);
  assert(Math.abs(e.angleDelta(s.a,Math.atan2(g.y-s.y,g.x-s.x)))<.01,'spawn faces the gate '+where);
  assert(Math.cos(s.a-g.a)>.9,'drives through it in lane direction '+where);
  assert(P.some(p=>Math.hypot(p[0]-s.x,p[1]-s.y)<1),'spawn on the centreline '+where);});});
test('r3-course: cones sit off every part of the lane, off the zones, and only outside the figure-eight\'s loops',()=>{
 r3Each([750],(id,A,L,where)=>{const z=e.keepOuts(A),P=L.track.pts,h=L.track.half;assert(L.cones.length>=12,id+' cones '+where+' '+L.cones.length);
  for(const c of L.cones){assert(P.every(p=>Math.hypot(p[0]-c.x,p[1]-c.y)>=h+e.CONE_R),'cone on the lane '+where);
   assert(z.every(q=>!(c.x>q.l&&c.x<q.r&&c.y*e.K>q.t&&c.y*e.K<q.b)),'cone in a zone '+where);
   if(id==='eight')assert(!e.insideLoop(P,c.x,c.y),'cone inside a loop '+where);}});});
test('r3-course: layouts are deterministic and setTrack only accepts the three ids',()=>{
 assert.deepEqual([...e.TRACKS.map(t=>t.id)],['signature','oval','eight']);assert.equal(e.setTrack('club'),false);
 for(const id of ['signature','oval','eight']){const A={...r3Arena(844,390,3,750),E:40},z=e.keepOuts(A);assert.equal(JSON.stringify(e.buildCourse(A,z,id)),JSON.stringify(e.buildCourse(A,z,id)));}
 // The settings thumbnails call buildCourse on the arena without zones: each id still gets its own shape.
 for(const id of ['signature','oval','eight']){const A=r3Arena(390,844,3,750);assert.equal(e.buildCourse({...A,E:e.edgeClear(A)},[],id).track.kind,id);}});
test('r3-course: titleSpot gives a 150x30+ rect, in a loop\'s infield on desktop, that no lane, gate, cone, edge strip or zone touches',()=>{
 assert.equal(e.titleSpot(null,r3Arena(1600,800,1,750)),null);
 r3Each([750],(id,A,L,where)=>{const t=e.titleSpot(L,A),E=e.edgeClear(A),h=L.track.half;assert(t,'title spot '+where);
  assert(t.r-t.l>=150&&t.b-t.t>=30,'size '+where+' '+(t.r-t.l)+'x'+(t.b-t.t));assert(t.l>=E&&t.t>=E&&t.r<=A.W-E&&t.b<=A.H-E,'edge '+where);
  assert(e.keepOuts(A).every(q=>!(t.r>q.l&&t.l<q.r&&t.b>q.t&&t.t<q.b)),'zone '+where);
  // Distance in world units from each centreline point to the rect is more than the half lane.
  for(const p of L.track.pts){const dx=Math.max(t.l-p[0],0,p[0]-t.r),dy=Math.max(t.t-p[1]*e.K,0,p[1]*e.K-t.b)/e.K;assert(Math.hypot(dx,dy)>h,'lane '+where);}
  for(const o of [...L.cones,...L.gate.posts])assert(!(o.x>t.l-3&&o.x<t.r+3&&o.y*e.K>t.t-3&&o.y*e.K<t.b+3),'cone/post '+where);
  const s=L.spawn;assert(!(s.x>t.l-8&&s.x<t.r+8&&s.y*e.K>t.t-8&&s.y*e.K<t.b+8),'spawn '+where);
  if(!A.mobile)assert(e.insideLoop(L.track.pts,(t.l+t.r)/2,(t.t+t.b)/2/e.K),'infield '+where);});});
e.setTrack('signature');console.log(n+' current-feature checks passed.');
