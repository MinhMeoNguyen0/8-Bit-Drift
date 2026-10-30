const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8'),sandbox={module:{exports:{}}};vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);const e=sandbox.module.exports;let n=0;function test(name,f){f();n++;console.log('PASS '+name);}
test('continuous zoom responds across the full slider',()=>{let prev=0;for(const z of [300,600,900,1200,1800,2400]){const v=e.computeView(1280,720,1,z);assert(v.H>prev);assert(Math.abs(v.H-z)<=1);prev=v.H;}});
test('tuning extremes have materially different effects',()=>{function run(v){e.resetTuning();e.setTuning(v);const w=e.createWorld('coupe',e.makeArena(4000,4000));w.layout=null;w.cones=[];w.car.vx=90;w.car.a=w.car.pa=0;for(let i=0;i<120;i++)e.step(w,{steering:1,throttle:1,brake:0});return {a:w.car.a,slip:w.car.slip};}const a=run({steerAngle:.2,grip:4}),b=run({steerAngle:3,grip:.1});assert(Math.abs(a.a-b.a)>.2);assert(Math.abs(a.slip-b.slip)>5);e.resetTuning();});
test('every tuning control accepts both endpoints without invalid simulation state',()=>{for(const spec of e.TUNING_SPEC)for(const value of [spec.min,spec.max]){e.resetTuning();e.setTuning({[spec.key]:value});assert.equal(e.TUNING[spec.key],value);const w=e.createWorld('compact',e.makeArena(1400,1000));w.layout=null;w.cones=[];for(let i=0;i<240;i++)e.step(w,{throttle:1,brake:0,steering:.8});assert(Number.isFinite(w.car.x+w.car.y+w.car.a));}e.resetTuning();});
for(const id of ['signature','oval','eight'])test(id+' track has two usable lanes on desktop and phone arenas',()=>{e.setTrack(id);for(const [w,h,d] of [[1600,800,1],[390,844,3]]){const v=e.computeView(w,h,d),A=e.makeArena(v.W,v.H);Object.assign(A,{safe:{},uiU:v.scale/d,uiW:w,uiH:h,mobile:d>1});const L=e.layoutCourse(A);assert.equal(L.track.kind,id);assert(L.track.half>=2*Math.max(...Object.values(e.PRESETS).map(p=>p.width))*.9);assert(L.track.pts.length>100);assert(L.track.length>500);assert(L.gate.width>=L.track.half*2);}});
for(const id of Object.keys(e.PRESETS))test(id+' long drive remains finite',()=>{const w=e.createWorld(id,e.makeArena(1400,1000));w.manual=id==='coupe';for(let i=0;i<7200;i++){if(w.manual&&i%1200===0)e.shiftGear(w,Math.min(5,1+i/1200));e.step(w,{throttle:1,brake:0,steering:Math.sin(i/230)*.4});assert(Number.isFinite(w.car.x+w.car.y+w.car.vx+w.car.vy));}if(w.p.flying)assert.equal(w.car.state,'driving');});
function droneRun(inputs,tilt){e.resetTuning();if(tilt!==undefined)e.setTuning({droneTilt:tilt});const w=e.createWorld('van',e.makeArena(4000,4000));w.layout=null;w.cones=[];const log=[];for(const [steps,input] of inputs)for(let i=0;i<steps;i++){e.step(w,input);log.push({r:w.car.tiltR,p:w.car.tiltP,s:Math.hypot(w.car.vx,w.car.vy)});}e.resetTuning();return {w,log};}
test('drone banks into turns: right side down turning right, left side down turning left',()=>{const right=droneRun([[240,{throttle:1,brake:0,steering:0}],[60,{throttle:1,brake:0,steering:1}]]),left=droneRun([[240,{throttle:1,brake:0,steering:0}],[60,{throttle:1,brake:0,steering:-1}]]);
 assert(right.w.car.tiltR>e.TILT_MAX*.5,'banks right '+right.w.car.tiltR);assert(left.w.car.tiltR<-e.TILT_MAX*.5,'banks left '+left.w.car.tiltR);assert(Math.abs(right.w.car.tiltR+left.w.car.tiltR)<1e-9,'mirror image');
 for(const {r,p} of [...right.log,...left.log])assert(Math.abs(r)<=e.TILT_MAX&&Math.abs(p)<=e.TILT_MAX);});
test('drone pitches nose down speeding up, nose up braking, and levels out at steady speed',()=>{const {log}=droneRun([[30,{throttle:1,brake:0,steering:0}],[1200,{throttle:1,brake:0,steering:0}],[40,{throttle:0,brake:1,steering:0}]]);
 assert(log[29].p>e.TILT_MAX*.2,'nose down while accelerating '+log[29].p);assert(Math.abs(log[1229].p)<.03&&Math.abs(log[1229].r)<1e-9,'level at top speed');assert(log[1269].p<-e.TILT_MAX*.2,'nose up braking '+log[1269].p);});
test('drone tilt setting scales it (0 = never tilts); cars never tilt; deterministic',()=>{const off=droneRun([[240,{throttle:1,brake:0,steering:0}],[60,{throttle:1,brake:0,steering:1}]],0);assert(off.log.every(t=>t.r===0&&t.p===0));
 const a=droneRun([[200,{throttle:1,brake:0,steering:.6}]]),b=droneRun([[200,{throttle:1,brake:0,steering:.6}]]);assert.deepEqual(a.log,b.log);
 for(const id of ['compact','coupe']){const w=e.createWorld(id,e.makeArena(4000,4000));w.layout=null;w.cones=[];for(let i=0;i<200;i++)e.step(w,{throttle:1,brake:0,steering:1});assert.equal(w.car.tiltR||0,0);assert.equal(w.car.tiltP||0,0);assert.deepEqual({...e.tiltIndex(w.car)},{r:0,p:0});}});
test('tilted drone frames are two-tone and stay inside carScreenBounds; the level frame is unchanged',()=>{const p=e.PRESETS.van,S=e.TILT_STEPS;
 for(let i=0;i<e.FRAMES;i+=4){const a=i*e.TAU/e.FRAMES,b=e.carScreenBounds(p,a);assert.deepEqual(e.droneSprite(p,a).data,e.carSprite(p,a).data);
  for(const r of [-S,0,S])for(const q of [-S,0,S])for(const img of [e.droneSprite(p,a,p.sprite,r*e.TILT_STEP,q*e.TILT_STEP),e.droneShadow(p,a,r*e.TILT_STEP,q*e.TILT_STEP)]){let lit=0;
   for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){const k=(y*img.width+x)*4;if(!img.data[k+3])continue;lit++;assert(x-p.sprite.ax>=b.l&&x-p.sprite.ax<b.r&&y-p.sprite.ay>=b.t&&y-p.sprite.ay<b.b,'pixel inside bounds');assert(img.data[k]===48||img.data[k]===191);}
   assert(lit>20);}}
 const lvl=e.droneSprite(p,0),tilted=e.droneSprite(p,0,p.sprite,e.TILT_MAX,0);assert.notDeepEqual(lvl.data,tilted.data,'a full bank looks different');});
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
