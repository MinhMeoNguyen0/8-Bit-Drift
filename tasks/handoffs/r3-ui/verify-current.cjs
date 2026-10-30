const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8'),sandbox={module:{exports:{}}};vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);const e=sandbox.module.exports;let n=0;function test(name,f){f();n++;console.log('PASS '+name);}
test('continuous zoom responds across the full slider',()=>{let prev=0;for(const z of [300,600,900,1200,1800,2400]){const v=e.computeView(1280,720,1,z);assert(v.H>prev);assert(Math.abs(v.H-z)<=1);prev=v.H;}});
test('tuning extremes have materially different effects',()=>{function run(v){e.resetTuning();e.setTuning(v);const w=e.createWorld('coupe',e.makeArena(4000,4000));w.layout=null;w.cones=[];w.car.vx=90;w.car.a=w.car.pa=0;for(let i=0;i<120;i++)e.step(w,{steering:1,throttle:1,brake:0});return {a:w.car.a,slip:w.car.slip};}const a=run({steerAngle:.2,grip:4}),b=run({steerAngle:3,grip:.1});assert(Math.abs(a.a-b.a)>.2);assert(Math.abs(a.slip-b.slip)>5);e.resetTuning();});
test('every tuning control accepts both endpoints without invalid simulation state',()=>{for(const spec of e.TUNING_SPEC)for(const value of [spec.min,spec.max]){e.resetTuning();e.setTuning({[spec.key]:value});assert.equal(e.TUNING[spec.key],value);const w=e.createWorld('compact',e.makeArena(1400,1000));w.layout=null;w.cones=[];for(let i=0;i<240;i++)e.step(w,{throttle:1,brake:0,steering:.8});assert(Number.isFinite(w.car.x+w.car.y+w.car.a));}e.resetTuning();});
for(const id of ['signature','oval','eight'])test(id+' circuit has two usable lanes and mobile clearance',()=>{e.setTrack(id);for(const mobile of [false,true]){const A=e.makeArena(mobile?650:1600,mobile?1400:1000);Object.assign(A,{mobile,uiU:.6,uiW:390,uiH:844});const L=e.layoutCourse(A);assert(L.track.half>=2*Math.max(...Object.values(e.PRESETS).map(p=>p.width))*.9);assert(L.track.pts.length>100);assert(L.track.length>500);assert(L.gate.width>=L.track.half*2);if(mobile)assert(Math.max(...L.track.pts.map(p=>p[1]*e.K))<A.H-250/.6);}});
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
e.setTrack('signature');console.log(n+' current-feature checks passed.');
