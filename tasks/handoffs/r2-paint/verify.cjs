const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname + '/dist/index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'One inline script');
assert(!/<(?:script|img|link|audio|video)\b[^>]*(?:src|href)=/i.test(html), 'No external assets');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(scripts[0][1], sandbox, { filename: 'index.html', timeout: 1000 });
const e = sandbox.module.exports;
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }

test('manual Supercar gears control speed and protect downshifts', () => {
 function driveGear(gear){const w=e.createWorld('coupe',e.makeArena(100000,100000));w.manual=true;w.gear=gear;w.cones=[];w.layout=null;for(let i=0;i<3600;i++)e.step(w,{throttle:1,steering:0,brake:0});return w;}
 const first=driveGear(1),fifth=driveGear(5);
 assert(Math.hypot(first.car.vx,first.car.vy)<70,'first gear has a lower engine limit');
 assert(Math.hypot(fifth.car.vx,fifth.car.vy)>190,'fifth gear unlocks high speed');
 assert(e.gearTelemetry(fifth).speed>e.gearTelemetry(first).speed);assert(!e.shiftGear(fifth,1),'unsafe high-speed downshift refused');
 assert(e.shiftGear(first,2));assert.equal(first.shiftTime,.12);assert.equal(first.gear,2);assert(!e.shiftGear(first,9));
 for(let i=0;i<30;i++)e.step(first,{throttle:1,steering:0,brake:0});assert.equal(first.shiftTime,0,'automatic clutch completes');
 assert(!e.shiftGear(e.createWorld('compact'),2),'other vehicles keep their normal controls');
});

// Preserve the former roll-prone Van only as a physics regression fixture. The real third preset is a flying drone.
const actualDrone=e.PRESETS.van;
test('drone flies at fixed height over cones with no skid marks or rollover', () => {
 const p=actualDrone;assert.equal(p.name,'Drone');assert(p.flying&&p.flightHeight>0);
 const w=e.createWorld('van');w.cones=[{x:w.car.x,y:w.car.y,hx:w.car.x,hy:w.car.y,vx:0,vy:0,a:0,pa:0,omega:0}];
 assert.equal(e.carCone(w,w.cones[0]),0);for(let i=0;i<150;i++)e.step(w,{throttle:1,brake:0,steering:.8});
 assert.equal(w.cones[0].vx,0);assert.equal(w.cones[0].vy,0);assert.equal(w.car.state,'driving');assert.equal(w.p.flightHeight,20);
 const rec=e.createTrackRecorder();let n=0;for(let i=0;i<100;i++){e.step(w,{throttle:1,brake:0,steering:1});e.recordTracks(w,rec,()=>n++);}assert.equal(n,0);
 const gate=e.createWorld('van');gate.cones=[];const post=gate.layout.gate.posts[0];Object.assign(gate.car,{x:post.x-gate.p.length/2-post.r+1,y:post.y,a:0,vx:30,vy:0});assert(e.carPost(gate,post)>0,'gate posts still collide');
 for(let i=0;i<e.FRAMES;i++){const a=i*e.TAU/e.FRAMES,b=e.carScreenBounds(p,a);for(const img of [e.carSprite(p,a),e.carShadow(p,a)])for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(img.data[(y*img.width+x)*4+3])assert(x-p.sprite.ax>=b.l&&x-p.sprite.ax<b.r&&y-p.sprite.ay>=b.t&&y-p.sprite.ay<b.b,'drone sprite and shadow stay inside bounds');}
});
test('drone shadow follows four rotors and body instead of a rectangle', () => {
 const p=actualDrone,polys=e.carShadowPolys(p,0);assert.equal(polys.length,10);
 assert.equal(polys.filter(poly=>poly.length===16).length,4,'four circular rotor silhouettes');
});
const legacyVan={name:'Van',artId:'van',length:36,width:18,height:9.4,roof:18,wheelbase:24.5,trackWidth:15.4,mass:1.65,accel:54,brake:110,max:114,reverse:33,grip:142,steer:.54,drag:.17,comHeight:7.6,rollThreshold:1};
let legacyBox={l:0,t:0,r:0,b:0};for(let i=0;i<e.FRAMES;i++){const b=e.carScreenBounds(legacyVan,i*e.TAU/e.FRAMES);for(const k of ['l','t'])legacyBox[k]=Math.min(legacyBox[k],b[k]);for(const k of ['r','b'])legacyBox[k]=Math.max(legacyBox[k],b[k]);}
legacyVan.sprite={size:Math.max(legacyBox.r-legacyBox.l,legacyBox.b-legacyBox.t),ax:-legacyBox.l,ay:-legacyBox.t};e.PRESETS.van=legacyVan;

// Tests describe input as keys; physics takes the shared {steering, throttle, brake} contract input.
const input = (w=false,s=false,a=false,d=false) => e.keysToInput({w,s,a,d});
const empty = id => { const w=e.createWorld(id); w.cones=[]; return w; };
const run = (w,seconds,keys) => { for(let i=0;i<Math.round(seconds/e.STEP);i++)e.step(w,keys); };
const forward = w => w.car.vx*Math.cos(w.car.a)+w.car.vy*Math.sin(w.car.a);
// ---- Task 05 (Agent 2): the car fully exits before it reappears. Rules re-stated from CONTRACT.md §5 + §11.
const TM=2; // TRANSFER_MARGIN (§11)
const CARS=Object.keys(e.PRESETS);
const bounds = w => e.carScreenBounds(w.p,w.car.a,w.car.roll||0);
// The car's box on screen at its real position, and whether any of it overlaps the arena.
const sbox = w => {const b=bounds(w),x=w.car.x,y=w.car.y*e.K;return {l:x+b.l,r:x+b.r,t:y+b.t,b:y+b.b};};
const visible = w => {const q=sbox(w),A=w.arena;return q.r>0&&q.l<A.W&&q.b>0&&q.t<A.H;};
// Outward headings per edge: [name, base heading, axis, sign of motion].
const EDGES=[['right',0,'x',1],['left',Math.PI,'x',-1],['bottom',Math.PI/2,'y',1],['top',-Math.PI/2,'y',-1]];
// Same car, same state, in a huge arena far from every edge: it never transfers, so it is the "no transfer" reference.
const FAR={dx:20000,dy:15000};
function twin(w){const t=empty(w.id);t.arena=e.makeArena(80000,48000);Object.assign(t.car,{...w.car,x:w.car.x+FAR.dx,px:w.car.x+FAR.dx,y:w.car.y+FAR.dy,py:w.car.y+FAR.dy});return t;}
test('positive modulo still preserves overshoot (wrap helper, used for headings)', () => {
 assert.equal(e.wrap(-3,400),397); assert.equal(e.wrap(803,400),3);
});
test('edge transfer on all four sides, 3 cars x 5 headings: fully gone first, overshoot, speed and heading kept', () => {
 const A=e.DEFAULT_ARENA;
 for(const id of CARS)for(const [edge,base,axis,sign] of EDGES)for(const off of [-.6,-.3,0,.3,.6]){
  const name=id+' '+edge+' '+off,w=empty(id),a=base+off;Object.assign(w.car,{a,pa:a,vx:Math.cos(a)*60,vy:Math.sin(a)*60,omega:0,steer:0});
  // Start with the box 6 px inside the departing edge (visible), the other axis mid-screen.
  const b=bounds(w);
  if(axis==='x'){w.car.x=sign>0?A.W-b.l-6:-b.r+6;w.car.y=A.WH/2;}else{w.car.x=A.W/2;w.car.y=(sign>0?A.H-b.t-6:-b.b+6)/e.K;}
  w.car.px=w.car.x;w.car.py=w.car.y;assert(visible(w),name);
  const ref=twin(w);let wasVisible=true,steps=0;
  while(w.wraps===0&&steps<600){wasVisible=visible(w);e.step(w,input(true));e.step(ref,input(true));steps++;
   if(w.wraps===0){const q=sbox(w);if(axis==='x')assert(sign>0?q.l<A.W+TM+2:q.r>-TM-2,name+': still on the departing side');}}
  assert.equal(w.wraps,1,name+': one transfer');assert(w.trackBreak,name+': transfer breaks tracks');
  assert(!wasVisible,name+': the car was completely offscreen in the step before it reappeared');
  // Velocity, heading, spin and steering are exactly those of the never-transferred twin.
  for(const k of ['vx','vy','a','omega','steer'])assert(Math.abs(w.car[k]-ref.car[k])<1e-9,name+': '+k+' preserved');
  // The position moved by exactly W + box width (or H + box height): the overshoot is kept.
  const bb=bounds(w),ox=ref.car.x-FAR.dx-w.car.x,oy=(ref.car.y-FAR.dy-w.car.y)*e.K;
  if(axis==='x'){assert(Math.abs(ox-sign*(A.W+bb.r-bb.l))<1e-6&&Math.abs(oy)<1e-6,name+': offset '+ox);}
  else{assert(Math.abs(oy-sign*(A.H+bb.b-bb.t))<1e-6&&Math.abs(ox)<1e-6,name+': offset '+oy);}
  // The near edge re-enters at the overshoot, which is at least TRANSFER_MARGIN and at most one step of motion more.
  const q=sbox(w),near=axis==='x'?(sign>0?q.r:A.W-q.l):(sign>0?q.b:A.H-q.t);
  assert(near>=TM-1e-9&&near<TM+2,name+': re-enters at the overshoot ('+near+')');assert(visible(w),name);
  // Interpolation was shifted with the transfer: it never sweeps across the arena.
  for(const al of [0,.25,.5,.75,1]){const p=e.position(w.car,al);assert(Math.hypot(p.x-w.car.x,p.y-w.car.y)<=Math.hypot(w.car.vx,w.car.vy)*e.STEP+1e-6,name+': interpolation jump');}
 }
});
test('corner exits: X then Y in one substep is one event, for 3 cars x 64 headings', () => {
 const A=e.DEFAULT_ARENA,corners=[[1,1],[1,-1],[-1,1],[-1,-1]];
 for(const id of CARS)for(let i=0;i<64;i++)for(const [sx,sy] of corners){
  const w=empty(id),a=i*e.TAU/64;w.car.a=w.car.pa=a;const b=bounds(w);
  // Box fully past both edges (by the margin + 0.5 px): one call moves both axes and counts once.
  const x=sx>0?A.W+TM+.5-b.l:-TM-.5-b.r,ys=sy>0?A.H+TM+.5-b.t:-TM-.5-b.b;Object.assign(w.car,{x,px:x,y:ys/e.K,py:ys/e.K});
  const t=e.transferEdges(w);assert.equal(w.wraps,1,id+' '+i);assert(w.trackBreak);
  assert(Math.abs(t.dx+sx*(A.W+b.r-b.l))<1e-9&&Math.abs(t.dy*e.K+sy*(A.H+b.b-b.t))<1e-6,id+' '+i+' corner offsets');
  const q=sbox(w);assert(Math.abs((sx>0?q.r:A.W-q.l)-(TM+.5))<1e-6&&Math.abs((sy>0?q.b:A.H-q.t)-(TM+.5))<1e-6,'overshoot kept on both axes');
  assert.equal(w.car.px,w.car.x);assert.equal(w.car.py,w.car.y);
  // Just inside the margin on both axes: nothing happens.
  const v=empty(id);v.car.a=a;const x2=sx>0?A.W+TM-.01-b.l:-TM+.01-b.r,y2=sy>0?A.H+TM-.01-b.t:-TM+.01-b.b;Object.assign(v.car,{x:x2,px:x2,y:y2/e.K,py:y2/e.K});
  e.transferEdges(v);assert.equal(v.wraps,0);assert.equal(v.car.x,x2);
 }
 // Through step(): a diagonal exit placed just before both thresholds transfers both axes in the same step, once.
 for(const id of CARS){const w=empty(id),a=Math.PI/4;Object.assign(w.car,{a,pa:a,vx:Math.cos(a)*40,vy:Math.sin(a)*40});const b=bounds(w);
  const x=A.W+TM-.05-b.l,y=(A.H+TM-.05-b.t)/e.K;Object.assign(w.car,{x,px:x,y,py:y});assert(!visible(w));
  e.step(w,input(true));assert.equal(w.wraps,1,id);assert(w.car.x<A.W/2&&w.car.y<A.WH/2,id+': both axes moved');}
});
test('angle interpolation uses the short path; position interpolation is a plain lerp', () => {
 const p=e.position({px:399,x:1,py:e.WORLD_H-1,y:1,pa:359*Math.PI/180,a:Math.PI/180},.5);
 assert(Math.abs(e.delta(p.a,e.TAU||Math.PI*2))<1e-8);
 // No seam maths any more: positions never jump across the arena by themselves (transfers shift px/py instead).
 assert(Math.abs(p.x-200)<1e-9&&Math.abs(p.y-e.WORLD_H/2)<1e-9);
 const q=e.position({px:10,x:12,py:5,y:4,pa:0,a:0},.25);assert(Math.abs(q.x-10.5)<1e-12&&Math.abs(q.y-4.75)<1e-12);
});
test('tracks are clipped to the arena, never wrapped; wheel points are not wrapped', () => {
 const right=[];e.plotLine(395,100,410,100,(x,y)=>right.push([x,y]),400,240);assert.deepEqual(right.map(p=>p[0]),[395,396,397,398,399]);
 const corner=[];e.plotLine(-3,-3,2,2,(x,y)=>corner.push([x,y]),400,240);assert.deepEqual(corner,[[0,0],[1,1],[2,2]]);
 const off=[];e.plotLine(401,10,450,30,(x,y)=>off.push([x,y]),400,240);assert.equal(off.length,0,'a segment fully offscreen draws nothing');
 assert.equal(e.wrappedLine,undefined,'the wrapping line helper is gone');
 // A car hanging over the right edge has its tyre points beyond W (track drawing clips them), not at x ≈ 0.
 const w=empty();Object.assign(w.car,{x:e.WIDTH+4,y:100,a:0});for(const p of e.wheelPoints(w))assert(p.x>e.WIDTH-20&&p.x<e.WIDTH+10);
 Object.assign(w.car,{x:200,y:e.WORLD_H+3,a:Math.PI/2});for(const p of e.wheelPoints(w))assert(p.y>e.HEIGHT-20);
 // Browser code: addTracks records through the pure, clipped recordTracks (task 09) and draw() renders sceneItems.
 const page=scripts[0][1].split('// ---- Browser only below.')[1];
 assert(/recordTracks\(world,trackRec,/.test(page)&&!/wrappedLine/.test(page),'tracks use recordTracks');
 assert(/drawList=sceneItems\(world,alpha\)/.test(page)&&!/-A\.W,0,A\.W/.test(page),'no wrapped copies in draw()');
});
test('accelerate, coast, brake, then reverse', () => {
 const w=empty();run(w,3,input(true));assert(forward(w)>75);const speed=forward(w);run(w,1,input());assert(forward(w)<speed);
 run(w,2.5,input(false,true));assert(forward(w)<-15);run(w,2,input(true));assert(forward(w)>15);
});
test('stationary steering does not rotate; reverse steering reverses yaw', () => {
 const w=empty();const initial=w.car.a;run(w,2,input(false,false,true));assert(Math.abs(w.car.a-initial)<1e-12);
 run(w,1,input(true,false,true));assert(w.car.omega<0);
 const b=empty();run(b,1,input(false,true,true));assert(b.car.omega>0);
});
test('opposing throttle keys brake instead of accelerating', () => {
 const w=empty();run(w,2,input(true));run(w,2,input(true,true));assert(Math.abs(forward(w))<1);
});
test('coupe corners generate genuine lateral slip', () => {
 const w=empty('coupe');run(w,2,input(true));run(w,1.5,input(true,false,false,true));assert(w.car.slip>6);assert(w.car.skidding);
});
test('no car-cone collision across an edge; a plain collision right at the edge still works', () => {
 const w=e.createWorld();Object.assign(w.car,{x:1,y:100,a:0,vx:-35,vy:0,omega:0});w.cones=[{x:e.WIDTH-10.5,y:100,vx:0,vy:0,a:0,omega:0,tipped:false}];e.carCone(w,w.cones[0]);
 assert.equal(w.cones[0].vx,0);assert.equal(w.cones[0].x,e.WIDTH-10.5);assert(!w.cones[0].tipped);assert.equal(w.car.vx,-35);
 const v=e.createWorld();Object.assign(v.car,{x:20,y:100,a:0,vx:-35,vy:0,omega:0});const cone={x:20-(v.p.length/2+e.CONE_R-.5),y:100,vx:0,vy:0,a:0,omega:0,tipped:false};
 assert(cone.x>0&&cone.x<4,'cone just inside the left edge');e.carCone(v,cone);assert(cone.vx<0);assert(cone.tipped);assert(v.car.vx>-35);
});
test('no cone-cone collision across an edge; same-side contact still works', () => {
 const a={x:20,y:1,vx:0,vy:-10},b={x:20,y:e.WORLD_H-1,vx:0,vy:0};e.coneCone(a,b);assert.equal(b.vy,0);assert.equal(a.vy,-10);
 const c={x:1,y:50,vx:-10,vy:0},d={x:e.WIDTH-1,y:50,vx:0,vy:0};e.coneCone(c,d);assert.equal(d.vx,0);
 const g={x:20,y:1,vx:0,vy:10},h={x:20,y:1+2*e.CONE_R-.5,vx:0,vy:0};e.coneCone(g,h);assert(h.vy>0&&g.vy<10);
});
test('overlapping centers resolve without NaN', () => {
 const w=e.createWorld();Object.assign(w.car,{x:100,y:100,a:.4});const c={x:100,y:100,vx:0,vy:0,a:0,omega:0,tipped:false};e.carCone(w,c);
 assert(Number.isFinite(c.x)&&Number.isFinite(c.y));assert(Math.hypot(c.x-100,c.y-100)>0);
});
test('fixed-step result is identical at 30/60/120/144 render schedules', () => {
 function simulation(hz){const w=empty();let acc=0,ticks=0;for(let frame=0;frame<hz*8;frame++){acc+=1/hz;while(acc+1e-12>=e.STEP){e.step(w,input(true,false,ticks>240&&ticks<500,ticks>600));acc-=e.STEP;ticks++;}}return [ticks,w.car.x,w.car.y,w.car.a,w.car.vx,w.car.vy];}
 const reference=simulation(60);for(const hz of [30,120,144]){const actual=simulation(hz);actual.forEach((n,i)=>assert(Math.abs(n-reference[i])<1e-8));}
});
test('all presets remain finite and inside the offscreen envelope through five-minute drives', () => {
 // Envelope (§5, §11): x in [-(r-l), W+(r-l)] and screen y in [-(b-t), H+(b-t)], using the largest box over every heading and
 // roll value (roll 0 and the task 11 placeholder roll 1). Cones use their own box.
 const big={};for(const id of CARS){const p=e.PRESETS[id];let bw=0,bh=0;for(const roll of [0,1])for(let i=0;i<256;i++){const b=e.carScreenBounds(p,i*e.TAU/256,roll);bw=Math.max(bw,b.r-b.l);bh=Math.max(bh,b.b-b.t);}big[id]={bw,bh};}
 const cw=e.CONE_BOX.r-e.CONE_BOX.l,ch=e.CONE_BOX.b-e.CONE_BOX.t;
 for(const id of CARS){const w=e.createWorld(id),{bw,bh}=big[id];
  for(let i=0;i<36000;i++){e.step(w,input(i%1800<1500,i%1800>=1500,i%1300<400,i%1300>900));
   const c=w.car;assert(c.x>=-bw&&c.x<=e.WIDTH+bw&&c.y*e.K>=-bh&&c.y*e.K<=e.HEIGHT+bh,id+' car left the envelope at step '+i);
   if(i%120===0)for(const o of [c,...w.cones]){assert(Number.isFinite(o.x)&&Number.isFinite(o.y)&&Number.isFinite(o.vx)&&Number.isFinite(o.vy));
    if(o!==c)assert(o.x>=-cw&&o.x<=e.WIDTH+cw&&o.y*e.K>=-ch&&o.y*e.K<=e.HEIGHT+ch,id+' cone left its envelope');}}
  assert(w.wraps>0,id+' crossed an edge');}
});
test('shared input contract: analog values, clamping and braking precedence', () => {
 assert.deepEqual({...e.normalizeInput({steering:3,throttle:-1,brake:2})},{steering:1,throttle:0,brake:1});
 const full=empty(),half=empty();run(full,2,{steering:0,throttle:1,brake:0});run(half,2,{steering:0,throttle:.5,brake:0});
 assert(forward(half)>5&&forward(half)<forward(full)*.75);
 const both=empty();run(both,2,{throttle:1});run(both,2,{throttle:1,brake:1});assert(Math.abs(forward(both))<1);
 const left=empty(),right=empty();run(left,1,{throttle:1,steering:-1});run(right,1,{throttle:1,steering:1});assert(left.car.omega<0&&right.car.omega>0);
});
test('carScreenBounds contains the anchor and covers every heading', () => {
 for(const p of Object.values(e.PRESETS))for(let i=0;i<64;i++){const b=e.carScreenBounds(p,i*e.TAU/64);
  assert(b.l<0&&b.r>0&&b.t<0&&b.b>0);assert(b.r-b.l>=p.width&&b.r-b.l<=p.length+p.width+16);}
});
test('resizeWorld maps objects proportionally and breaks tracks', () => {
 const w=e.createWorld();const x=w.car.x,y=w.car.y;e.resizeWorld(w,e.makeArena(800,480));
 assert(Math.abs(w.car.x-2*x)<1e-9&&Math.abs(w.car.y-2*y)<1e-9);assert(w.trackBreak);assert.equal(w.arena.W,800);
 e.step(w,input(true));assert(Number.isFinite(w.car.x));
});
// ---- Agent 1 (interface and controls): task 01 viewport and task 03 shared input ----
test('computeView: integer scale, screen covered, short side about 300 logical px', () => {
 const cases=[['desktop 1920x1080@1',1920,1080,1,{scale:4,W:480,H:270}],['laptop 1366x768@1',1366,768,1,{scale:3,W:456,H:256}],
  ['phone portrait 390x844@3',390,844,3,{scale:4,W:293,H:633}],['phone landscape 844x390@3',844,390,3,{scale:4,W:633,H:293}],['high-DPI 1440x900@2',1440,900,2,{scale:6,W:480,H:300}]];
 for(const [name,w,h,dpr,expected] of cases){const v=e.computeView(w,h,dpr);
  assert.deepEqual({...v},expected,name);assert(Number.isInteger(v.scale)&&v.scale>=1,name);
  // Backing store covers the device screen, overflowing by less than one logical pixel on each axis.
  for(const [n,dev] of [[v.W,w*dpr],[v.H,h*dpr]]){assert(n*v.scale>=dev-1e-9,name);assert((n-1)*v.scale<dev,name);}
  // CSS size of the canvas (W*scale/dpr) covers the viewport.
  assert(v.W*v.scale/dpr>=w-1e-9&&v.H*v.scale/dpr>=h-1e-9,name);
  const short=Math.min(v.W,v.H);assert(short>=250&&short<=360,name+' short side '+short);}
 // Same screen, different dpr only (browser zoom): W×H is the same when device pixels match.
 assert.deepEqual({...e.computeView(1920,1080,1)},{...e.computeView(960,540,2)});
 // Degenerate inputs never produce a zero or NaN arena.
 for(const [w,h,d] of [[0,0,1],[100,50,0],[300,200,NaN]]){const v=e.computeView(w,h,d);assert(v.W>=1&&v.H>=1&&v.scale>=1);}
});
const inp=c=>({...c.sample()});
test('controls: keyboard merge, W+S brakes, A+D cancels, repeats never re-press', () => {
 const c=e.createControls();assert.deepEqual(inp(c),{steering:0,throttle:0,brake:0});
 c.keyDown('w');assert.deepEqual(inp(c),{steering:0,throttle:1,brake:0});
 c.keyDown('s');const ws=inp(c);assert(ws.throttle===1&&ws.brake===1);
 // drive() gives brake precedence when both are held: W+S never accelerates.
 const w=empty();run(w,2,e.keysToInput({w:true}));const v0=forward(w);run(w,.5,c.sample());assert(forward(w)<v0);
 c.keyDown('a');assert.equal(c.sample().steering,-1);c.keyDown('d');assert.equal(c.sample().steering,0);c.keyUp('a');assert.equal(c.sample().steering,1);
 assert.equal(c.keyDown('x'),false);assert.equal(c.keyUp('q'),false);
 c.releaseAll();assert.deepEqual(inp(c),{steering:0,throttle:0,brake:0});
 // Still physically held after releaseAll: auto-repeat must not bring the key back; a fresh press does.
 c.keyDown('w',true);assert.equal(c.sample().throttle,0);c.keyDown('w');assert.equal(c.sample().throttle,1);c.keyDown('w',true);assert.equal(c.sample().throttle,1);
 c.keyUp('w');assert.equal(c.sample().throttle,0);
});
test('controls: keyboard + touch precedence (max for pedals, wheel owns steering)', () => {
 const c=e.createControls();
 c.keyDown('d');assert(c.bindPointer('wheel',7));c.setWheel(-.4,7);assert.equal(c.sample().steering,-.4,'wheel wins while owned');
 c.releasePointer(7);assert.equal(c.sample().steering,1,'keyboard steering returns');
 assert(c.bindPointer('gas',3));c.setPedal('gas',.3,3);assert.equal(c.sample().throttle,.3);
 c.keyDown('w');assert.equal(c.sample().throttle,1,'max(key, touch)');c.keyUp('w');assert.equal(c.sample().throttle,.3);
 assert(c.bindPointer('brake',4,.6));c.keyDown('s');assert.equal(c.sample().brake,1);c.keyUp('s');assert.equal(c.sample().brake,.6);
 // Values are clamped, and visual() reports exactly what sample() returns.
 c.setPedal('gas',5,3);c.setWheel(9,7);assert.equal(c.sample().throttle,1);
 const s=inp(c),vis=c.visual();for(const k of ['steering','throttle','brake'])assert.equal(vis[k],s[k]);
 assert(vis.owned.gas&&vis.owned.brake&&!vis.owned.wheel);
 // Unowned controls cannot hold a value; a different pointer cannot set or steal an owned control.
 assert.equal(c.setWheel(.5),false);assert.equal(c.sample().steering,1);
 assert.equal(c.bindPointer('gas',99),false);assert.equal(c.setPedal('gas',0,99),false);assert.equal(c.sample().throttle,1);
 assert.equal(c.setPedal('wheel',1,3),false);assert.equal(c.bindPointer('horn',1),false);
});
test('controls: pointer ownership releases only the cancelled control', () => {
 const c=e.createControls();
 c.bindPointer('wheel',1);c.setWheel(.8,1);c.bindPointer('gas',2,1);
 assert.deepEqual(inp(c),{steering:.8,throttle:1,brake:0});
 c.releasePointer(1); // pointercancel / lostpointercapture on the wheel finger
 assert.deepEqual(inp(c),{steering:0,throttle:1,brake:0},'gas stays held');
 c.bindPointer('wheel',5);c.setWheel(-.5,5);c.releasePointer(2); // and vice versa
 assert.deepEqual(inp(c),{steering:-.5,throttle:0,brake:0},'steering stays held');
 assert.equal(c.releasePointer(42),false);assert.equal(c.owner('wheel'),5);
 // A finger moved from gas to brake owns only the brake afterwards.
 c.bindPointer('gas',6,1);c.bindPointer('brake',6,1);assert.equal(c.owner('gas'),null);assert.deepEqual(inp(c),{steering:-.5,throttle:0,brake:1});
 // Pointer id 0 (common for the first mouse/touch) is a valid owner.
 const z=e.createControls();assert(z.bindPointer('gas',0,1));assert.equal(z.sample().throttle,1);z.releasePointer(0);assert.equal(z.sample().throttle,0);
});
test('controls: releaseAll clears keys and every pointer; engage starts driving', () => {
 const events=[],c=e.createControls({onEngage:s=>events.push(s)});
 c.keyDown('w');c.keyDown('w',true);c.keyDown('a');c.bindPointer('wheel',1,.5);c.bindPointer('gas',2,1);c.bindPointer('brake',3,1);
 assert.deepEqual(events,['key','key','wheel','gas','brake']);
 c.releaseAll();assert.deepEqual(inp(c),{steering:0,throttle:0,brake:0});
 for(const n of ['wheel','gas','brake'])assert.equal(c.owner(n),null);
 assert.equal(c.setWheel(1,1),false);assert.equal(c.sample().steering,0,'old pointer cannot write after releaseAll');
 // Fixed-step sampling: the sample is a fresh object, stable between input events.
 c.keyDown('d');const a=c.sample(),b=c.sample();assert.notEqual(a,b);assert.deepEqual({...a},{...b});
});
test('rendering code reads the arena, not the 400x240 globals', () => {
 const browser=scripts[0][1].split('// ---- Browser only below.')[1].split('\n').slice(1).join('\n').replace(/\/\/[^\n]*/g,'');
 assert(!/\b(WIDTH|HEIGHT|WORLD_H)\b/.test(browser));
 assert(/100dvh/.test(html)&&/safe-area-inset/.test(html)&&!/requestFullscreen/.test(html));
});
// ---- Agent 1 stage 2: task 02 (compact HUD, painted instructions) and task 04 (wheel and pedals) ----
const DEVICES=[['desktop 1920x1080@1',1920,1080,1],['laptop 1366x768@1',1366,768,1],['phone portrait 390x844@3',390,844,3],['phone landscape 844x390@3',844,390,3],['high-DPI 1440x900@2',1440,900,2],['phone 375x812@2',375,812,2],['landscape 844x390@1',844,390,1]];
const overlaps=(a,b)=>a.l<b.r&&b.l<a.r&&a.t<b.b&&b.t<a.b;
const byId=zs=>Object.fromEntries(zs.map(z=>[z.id,z]));
function checkZones(name,v,zs,safe={}){
 assert.deepEqual(Array.from(zs,z=>z.id),['hud','wheel','pedals','instructions','recover'],name);
 const sx=Math.max(safe.left||0,safe.right||0);
 for(const z of zs){for(const k of ['l','t','r','b'])assert(Number.isInteger(z[k]),`${name} ${z.id}.${k} integer`);
  assert(z.l>=4+sx&&z.t>=4+(safe.top||0)&&z.r<=v.W-4-sx&&z.b<=v.H-4-(safe.bottom||0),`${name}: ${z.id} ${JSON.stringify(z)} inside arena and safe area`);
  assert(z.r-z.l>0&&z.b-z.t>0,`${name}: ${z.id} non-empty`);}
 for(let i=0;i<zs.length;i++)for(let j=i+1;j<zs.length;j++)assert(!overlaps(zs[i],zs[j]),`${name}: ${zs[i].id} overlaps ${zs[j].id}`);
}
test('controlZones: HUD, wheel, pedals and instructions fit every device without overlapping', () => {
 for(const [name,w,h,dpr] of DEVICES){const v=e.computeView(w,h,dpr),zs=e.controlZones(v),z=byId(zs),u=v.scale/dpr,S=Math.min(v.W,v.H);
  checkZones(name,v,zs);
  // The wheel's full circular face extends below the viewport, with about 60% visible.
  assert(z.hud.r===v.W-4&&z.hud.t===4,name);assert(z.wheel.l===4&&z.wheel.r<v.W/2,name);
  const k=e.uiMetrics(S),visible=(v.H-z.wheel.t)/k.D;
  assert(visible>=.59&&visible<=.61,`${name}: ${visible} of wheel visible`);
  assert.equal(z.wheel.r-z.wheel.l,k.D,name+': full wheel diameter');
  // Pedals sit slightly inboard with a larger gap, while retaining usable button sizes.
  assert(z.pedals.r<v.W-4&&z.pedals.t>v.H/2,name);
  assert(k.pg>=8&&k.pg>=Math.min(14,Math.round(S*.04)),name+': separated pedals');
  assert.equal(z.pedals.r-z.pedals.l,2*k.pw+k.pg,name);assert(k.pw>=28&&k.b>=24,name);
  assert(z.instructions.t>=z.hud.b,name+': tutorial below the HUD');
  assert(z.hud.r-z.hud.l<=v.W*.7,`${name}: HUD is compact`);assert(z.hud.b-z.hud.t<=S*.15,`${name}: HUD is short`);
  // Touch targets on phones, in CSS px (logical px × scale / dpr).
  if(dpr>=2&&Math.min(w,h)<500){assert(k.pw*u>=44&&k.ph*u>=70,`${name}: pedal ${k.pw*u}x${k.ph*u} CSS px`);assert(k.D*u>=120,`${name}: wheel ${k.D*u} CSS px`);assert(k.b*u>=38,`${name}: HUD button ${k.b*u} CSS px`);}
  // Deterministic, and an arena (as keepOuts(A) will pass) gives the same zones as the view.
  assert.equal(JSON.stringify(e.controlZones(v)),JSON.stringify(zs));assert.equal(JSON.stringify(e.controlZones(e.makeArena(v.W,v.H))),JSON.stringify(zs));
 }
 console.log('     1366x768@1:',JSON.stringify(e.controlZones(e.computeView(1366,768,1))));
 console.log('     375x812@2: ',JSON.stringify(e.controlZones(e.computeView(375,812,2))));
});
test('controlZones: safe-area insets move every zone inside them; left/right are symmetric', () => {
 const p=e.computeView(375,812,2),l=e.computeView(812,375,2);
 checkZones('portrait notch',p,e.controlZones(p,{top:32,bottom:23}),{top:32,bottom:23});
 checkZones('landscape notch',l,e.controlZones(l,{left:32,bottom:14}),{left:32,right:32,bottom:14});
 assert.equal(JSON.stringify(e.controlZones(l,{left:32})),JSON.stringify(e.controlZones(l,{right:32})),'notch on either side gives the same zones');
 assert.equal(JSON.stringify(e.controlZones(p,{top:-5,left:NaN})),JSON.stringify(e.controlZones(p)),'bad insets count as zero');
 assert.equal(byId(e.controlZones(p,{top:32})).hud.t,36);
});
test('tutorial: each key has its own label and mobile guidance remains available', () => {
 const css=html.split('<style>')[1].split('</style>')[0],script=scripts[0][1];
 for(const [key,label] of [['W','Gas'],['A','Left'],['S','Brake'],['D','Right']])assert(html.includes('<kbd>'+key+'</kbd><span>'+label+'</span>'),'instruction sits under '+key);
 assert(/key-w\{grid-column:2;grid-row:1\}/.test(css),'W sits above the lower key row');
 assert(/guide-copy'\)\.textContent=isTouch\(\)/.test(script)&&/Drag wheel/.test(script),'mobile instructions remain available');
 const legend=html.split('id="instructions"')[1].split('id="wheel"')[0];assert(!/Esc|reverse/i.test(legend),'legend stays concise');
 assert(/wheel-dither/.test(html)&&/<circle cx="50"/.test(html),'wheel has a curved textured rim');
 assert(/\.wheel-face\{[^}]*width:100%;aspect-ratio:1/.test(css),'wheel face keeps circular drag geometry');
});

test('wheel maths: shortest turn across the ±180° seam, clamped lock, dead zone at the hub', () => {
 const deg=Math.PI/180,near=(a,b,m='')=>assert(Math.abs(a-b)<1e-9,`${m} ${a} vs ${b}`);
 near(e.turnDelta(179*deg,-179*deg),2*deg,'clockwise across the seam');near(e.turnDelta(-179*deg,179*deg),-2*deg,'anticlockwise across the seam');
 near(e.turnDelta(0,Math.PI),Math.PI);near(e.turnDelta(10*deg,10*deg+4*Math.PI),0);near(e.turnDelta(-170*deg,170*deg),-20*deg);
 near(e.pointerAngle(0,0,0,-10),0,'12 o\'clock');near(e.pointerAngle(0,0,10,0),Math.PI/2,'3 o\'clock is right');near(e.pointerAngle(0,0,-10,0),-Math.PI/2);near(Math.abs(e.pointerAngle(0,0,0,10)),Math.PI);
 const at=(s,d,r=40)=>e.wheelDrag(s,100+r*Math.sin(d*deg),100-r*Math.cos(d*deg));
 // Grab at 6 o'clock (just left of the seam) and move across it: a 2° turn, not a 358° jump.
 let s=at({cx:100,cy:100,r:50,ref:null,angle:0},179);near(s.angle,0,'grab does not move the wheel');
 s=at(s,-179);near(s.angle,2*deg,'seam crossing');s=at(s,179);near(s.angle,0,'and back');
 // Turning clockwise past the lock clamps at WHEEL_MAX; turning back moves the wheel immediately.
 s=at({cx:100,cy:100,r:50,ref:null,angle:0},0);for(let d=10;d<=300;d+=10)s=at(s,d);near(s.angle,e.WHEEL_MAX,'clamped');near(e.wheelValue(s),1);
 s=at(s,270);near(s.angle,e.WHEEL_MAX-30*deg,'reverses straight away');
 for(let d=260;d>=-400;d-=10)s=at(s,d);near(s.angle,-e.WHEEL_MAX,'left lock');near(e.wheelValue(s),-1);
 // At the hub the angle is unstable: the wheel holds still and re-anchors without a jump when the finger leaves the hub.
 s={cx:100,cy:100,r:50,ref:null,angle:.3};s=at(s,0);s=e.wheelDrag(s,102,101);assert.equal(s.ref,null);near(s.angle,.3);s=at(s,120);near(s.angle,.3,'no jump on re-entry');s=at(s,130);near(s.angle,.3+10*deg);
 // A grab carries over the current (keyboard) steering angle, so the visual and the input stay continuous.
 const c=e.createControls();c.keyDown('d');const start=c.sample().steering*e.WHEEL_MAX;assert(c.bindPointer('wheel',3,start/e.WHEEL_MAX));assert.equal(c.sample().steering,1);
});
test('menu flow: opening releases inputs, closing pauses, stale keys never resume driving', () => {
 const changes=[];let m;const c=e.createControls({onEngage:()=>m.engage()});m=e.createModes(c,(next,prev)=>changes.push(prev+'>'+next));
 assert.equal(m.mode,'paused');
 c.keyDown('w');assert.equal(m.mode,'running','a fresh key starts driving');
 c.bindPointer('wheel',1,.5);c.bindPointer('brake',2,1);assert.deepEqual(inp(c),{steering:.5,throttle:1,brake:1});
 assert(m.openMenu());assert.equal(m.mode,'menu');assert.deepEqual(inp(c),{steering:0,throttle:0,brake:0},'menu releases keys and pointers');
 assert.equal(c.owner('wheel'),null);assert.equal(m.acceptsKeys(),false,'drive keys are ignored in the menu');
 assert.equal(m.engage(),false,'nothing resumes from the menu');
 assert(m.closeMenu());assert.equal(m.mode,'paused','closing never resumes by itself');
 c.keyDown('w',true);assert.equal(m.mode,'paused');assert.equal(c.sample().throttle,0,'auto-repeat of a key held through the menu is stale');
 assert.equal(c.setWheel(1,1),false,'an old finger cannot steer after the menu');
 c.keyUp('w');c.keyDown('w');assert.equal(m.mode,'running');assert.equal(c.sample().throttle,1,'a fresh press drives');
 // Grabbing a pedal is also an intentional resume; pausing releases it again.
 m.set('paused');assert.equal(c.sample().throttle,0);c.bindPointer('gas',9,1);assert.equal(m.mode,'running');assert.equal(c.sample().throttle,1);
 assert.equal(m.closeMenu(),false);assert.equal(m.set('flying'),false);assert.equal(m.set('running'),false,'no-op');
 assert.deepEqual(changes,['paused>running','running>menu','menu>paused','paused>running','running>paused','paused>running']);
});
test('page: accessible HUD, settings dialog, controls and painted-text fallbacks', () => {
 const css=html.split('<style>')[1].split('</style>')[0],script=scripts[0][1];
 // touch-action:none only on the wheel and the pedals.
 const ta=[...css.matchAll(/([^{}]+)\{[^}]*touch-action:([a-z-]+)/g)].map(m=>[m[1].trim(),m[2]]);
 assert.deepEqual(ta.filter(x=>x[1]==='none'),[['.wheel-face','none'],['.pedal','none']]);assert(!/touch-action/.test(html.split('</style>')[1].split('<script>')[0]));
 // Round 2 (r2-paint): canvas text is used only offscreen by the paint rasteriser, thresholded to a 1-bit mask (no antialiasing).
 assert.equal((script.match(/fillText/g)||[]).length,1,'canvas text only in the paint rasteriser');assert(/function canvasTextMask[\s\S]*?fillText[\s\S]*?>=128/.test(script),'paint text thresholded to 1 bit');
 assert(/id="settings-btn"[^>]*aria-expanded="false"[^>]*aria-controls="settings"/.test(html)&&/id="settings"[^>]*role="dialog"[^>]*hidden/.test(html));
 assert(/id="skids" type="checkbox" role="switch" checked/.test(html));assert.equal((html.match(/class="car-choice"[^>]*aria-pressed=/g)||[]).length,3);
 assert(/id="wheel-face"[^>]*role="slider"[^>]*tabindex="0"[^>]*aria-label="Steering wheel"/.test(html));
 assert(/id="pedal-gas"[^>]*aria-label="Gas/.test(html)&&/id="pedal-brake"[^>]*aria-label="Brake and reverse/.test(html));
 assert(/aria-describedby="driving-help"/.test(html)&&/id="driving-help">W accelerates/.test(html),'instructions stay available to screen readers');
 assert(/id="panel-help"/.test(html),'help is reachable from the settings menu');
 assert(/:focus-visible\{outline/.test(css),'visible focus');
});
// ---- Agent 1 stage 3: "Right the car" control, arrow/A-D independence, touch targets ----
// A fake recovery api standing in for Agent 3's canRecover(w) / recover(w): records calls, rights the car like §4 would.
function fakeApi(can){const api={can:w=>typeof can==='function'?can(w):can,runs:0,run:w=>{api.runs++;Object.assign(w.car,{a:.5,vx:0,vy:0,omega:0,x:w.car.x+3});}};return api;}
const keyEv=(o={})=>({code:'KeyR',key:'r',repeat:false,isComposing:false,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,...o});
test('recovery: offered only while canRecover is true and no menu is open', () => {
 const w=empty();
 for(const mode of ['running','paused']){assert.equal(e.recoverAvailable(fakeApi(true),w,mode),true,mode);assert.equal(e.recoverAvailable(fakeApi(false),w,mode),false,mode);}
 assert.equal(e.recoverAvailable(fakeApi(true),w,'menu'),false,'never in the menu');
 // Only a real true counts (a truthy non-boolean, a missing world or api does not).
 for(const v of [1,'yes',{},undefined,null])assert.equal(e.recoverAvailable(fakeApi(v),w,'running'),false,String(v));
 assert.equal(e.recoverAvailable(fakeApi(true),null,'running'),false);assert.equal(e.recoverAvailable(null,w,'running'),false);
 // The answer follows the world it is asked about.
 const api=fakeApi(x=>x.car.state==='resting');w.car.state='resting';assert(e.recoverAvailable(api,w,'running'));w.car.state='driving';assert(!e.recoverAvailable(api,w,'running'));
});
test('recovery: tryRecover gates on canRecover, releases every input, breaks tracks, resets interpolation, keeps the mode', () => {
 for(const can of [true,false])for(const mode of ['running','paused','menu']){
  const w=empty(),api=fakeApi(can),c=e.createControls();
  c.keyDown('w');c.keyDown('a');c.keyDown('arrowRight');c.keyDown('pedalBrake');c.bindPointer('wheel',1,.7);c.bindPointer('gas',2,1);c.bindPointer('brake',3,1);
  Object.assign(w.car,{px:w.car.x-5,py:w.car.y-5,pa:w.car.a-1});w.trackBreak=false;const before=JSON.stringify(w.car);
  const ok=e.tryRecover(api,w,mode,c),allowed=can&&mode!=='menu';
  assert.equal(ok,allowed,can+' '+mode);assert.equal(api.runs,allowed?1:0,'recover() runs once, only when allowed');
  if(allowed){
   assert.deepEqual(inp(c),{steering:0,throttle:0,brake:0},'no stuck throttle, brake or steering');for(const n of ['wheel','gas','brake'])assert.equal(c.owner(n),null);
   assert.equal(c.setPedal('gas',1,2),false,'the old gas finger cannot write');assert(w.trackBreak,'recovery breaks the tracks');
   assert(w.car.px===w.car.x&&w.car.py===w.car.y&&w.car.pa===w.car.a,'interpolation reset');
   // Keys still physically held do not count until pressed again (same rule as the menu).
   c.keyDown('w',true);assert.equal(c.sample().throttle,0);c.keyDown('w');assert.equal(c.sample().throttle,1);
  }else{assert.equal(JSON.stringify(w.car),before,'nothing changes');assert(!w.trackBreak);assert.equal(c.sample().throttle,1,'inputs untouched');}
 }
 // tryRecover never changes the game mode (it has no access to it) and works without a controls object.
 const w=empty();assert(e.tryRecover(fakeApi(true),w,'paused',null));assert(w.trackBreak);
});
test('recovery: the R key (first press only, no Ctrl/Cmd/Alt, never in the menu or while focus owns keys)', () => {
 assert(e.isRecoverKey(keyEv()));assert(e.isRecoverKey(keyEv({key:'R',shiftKey:true})),'Shift / Caps Lock still count');
 assert(e.isRecoverKey(keyEv({key:'к'})),'physical R on any layout');assert(e.isRecoverKey(keyEv({code:'',key:'R'})),'character fallback without a code');
 for(const bad of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true},{code:'KeyT',key:'r'},{code:'KeyW',key:'w'},{code:'',key:'t'},{code:'',key:undefined}])
  assert.equal(e.isRecoverKey(keyEv(bad)),false,JSON.stringify(bad));
 assert.equal(e.isRecoverKey(null),false);
 assert(e.recoverFromKey(keyEv(),'running',false)&&e.recoverFromKey(keyEv(),'paused',false));
 assert.equal(e.recoverFromKey(keyEv(),'menu',false),false,'not in the menu');assert.equal(e.recoverFromKey(keyEv(),'running',true),false,'not while a text field owns keys');
 assert.equal(e.recoverFromKey(keyEv({repeat:true}),'running',false),false);
 // Gated end to end: the key path plus canRecover.
 const w=empty(),c=e.createControls();c.keyDown('w');
 const press=(api,mode)=>e.recoverFromKey(keyEv(),mode,false)&&e.tryRecover(api,w,mode,c);
 assert.equal(press(fakeApi(false),'running'),false);assert.equal(c.sample().throttle,1,'R without a recovery keeps driving');
 assert.equal(press(fakeApi(true),'menu'),false);assert.equal(press(fakeApi(true),'running'),true);assert.equal(c.sample().throttle,0);
});
test('controls: arrow keys on the wheel and Space on a pedal are independent of A/D and W/S', () => {
 const c=e.createControls();
 c.keyDown('a');c.keyDown('arrowLeft');assert.equal(c.sample().steering,-1,'A + left arrow is still full left, not -2');
 c.keyUp('arrowLeft');assert.equal(c.sample().steering,-1,'releasing the arrow keeps the held A');
 c.keyDown('arrowLeft');c.keyUp('a');assert.equal(c.sample().steering,-1,'releasing A keeps the held arrow');c.keyUp('arrowLeft');assert.equal(c.sample().steering,0);
 c.keyDown('d');c.keyDown('arrowLeft');assert.equal(c.sample().steering,0,'right + left cancels');c.keyUp('d');assert.equal(c.sample().steering,-1);c.keyUp('arrowLeft');
 c.keyDown('arrowRight');assert.equal(c.sample().steering,1);c.keyUp('arrowRight');
 c.keyDown('w');c.keyDown('pedalGas');c.keyUp('pedalGas');assert.equal(c.sample().throttle,1,'Space up on the gas pedal keeps the held W');c.keyUp('w');assert.equal(c.sample().throttle,0);
 c.keyDown('s');c.keyDown('pedalBrake');c.keyUp('pedalBrake');assert.equal(c.sample().brake,1,'Enter up on the brake pedal keeps the held S');c.keyUp('s');
 c.keyDown('pedalGas');c.keyDown('pedalBrake');const both=c.sample();assert(both.throttle===1&&both.brake===1,'pedal keys merge like W+S (drive() brakes)');
 // The wheel still owns steering while a pointer holds it; visual() matches sample(); releaseAll clears the new slots too.
 c.keyDown('arrowRight');c.bindPointer('wheel',4,-.25);assert.equal(c.sample().steering,-.25);c.releasePointer(4);assert.equal(c.sample().steering,1);
 const v=c.visual(),s=c.sample();for(const k of ['steering','throttle','brake'])assert.equal(v[k],s[k]);
 c.releaseAll();assert.deepEqual(inp(c),{steering:0,throttle:0,brake:0});c.keyDown('arrowRight',true);assert.equal(c.sample().steering,0,'repeat after release is stale');
 // The page maps the focused controls to these slots, not to a/d/w/s.
 const script=scripts[0][1];
 assert(/holdKeys\(ui\.wheelFace,\{ArrowLeft:'arrowLeft',ArrowRight:'arrowRight'\}\)/.test(script)&&/holdKeys\(ui\.gas,\{' ':'pedalGas',Enter:'pedalGas'\}\)/.test(script)&&/holdKeys\(ui\.brake,\{' ':'pedalBrake',Enter:'pedalBrake'\}\)/.test(script));
});
test('controlZones stage 3: recover slot beside the HUD, nothing overlaps, phone HUD buttons >= 44 CSS px', () => {
 const more=[...DEVICES,['iPhone SE landscape 667x375@2',667,375,2],['small landscape 740x360@3',740,360,3],['Android portrait 360x800@3',360,800,3],['iPhone SE 320x568@2',320,568,2],['tablet 1024x768@2',1024,768,2],['tablet portrait 768x1024@2',768,1024,2],['low-res 600x350@1',600,350,1],['4K 3840x2160@1.5',3840,2160,1.5]];
 for(const [name,w,h,dpr] of more)for(const safe of [{},{top:20,bottom:12},{left:24,bottom:10}]){
  const v=e.computeView(w,h,dpr),zs=e.controlZones(v,safe),z=byId(zs),k=e.uiMetrics(Math.min(v.W,v.H)),u=v.scale/dpr;
  checkZones(name+' '+JSON.stringify(safe),v,zs,{...safe,right:safe.left});
  // On the HUD's row, just left of it (or, if the row is too narrow, right under it), one HUD button tall, recW wide.
  const row=z.recover.t===z.hud.t&&z.recover.r===z.hud.l-e.UI_GAP,under=z.recover.t===z.hud.b+e.UI_GAP&&z.recover.r===z.hud.r;
  assert(row||under,`${name}: recover slot next to the HUD ${JSON.stringify(z.recover)}`);assert(row||z.hud.l-e.UI_GAP-k.recW<z.wheel.l,name+': prefers the HUD row');
  assert.equal(z.recover.b-z.recover.t,k.b,name+': one HUD button tall');assert.equal(z.recover.r-z.recover.l,k.recW,name);assert(k.recW>=2.5*k.b,name+': room for the two-line label');
  // keepOuts(A) gives the course the same five rects (so cones, spawn and the recovery spot stay off the button).
  const A=e.makeArena(v.W,v.H);A.safe=safe;assert.equal(JSON.stringify(e.keepOuts(A)),JSON.stringify(zs));
  // Phones: >= 44 CSS px wherever the short side is >= 360 CSS px; the 320 px iPhone SE class gets >= 40 (the HUD width cap binds).
  if(dpr>=2&&Math.min(w,h)<500)assert(k.b*u>=(Math.min(w,h)>=360?44:40),`${name}: HUD button ${k.b*u} CSS px`);
 }
 // The first four zones keep their order (callers that index them are unaffected).
 assert.deepEqual(Array.from(e.controlZones(e.computeView(1366,768,1)).slice(0,4),z=>z.id),['hud','wheel','pedals','instructions']);
 console.log('     375x812@2 recover:',JSON.stringify(byId(e.controlZones(e.computeView(375,812,2))).recover),' 844x390@1:',JSON.stringify(byId(e.controlZones(e.computeView(844,390,1))).recover));
});
test('page: right-the-car button, R in the help texts, adapter for Agent 3', () => {
 const script=scripts[0][1],css=html.split('<style>')[1].split('</style>')[0];
 const btn=(html.match(/<button[^>]*id="recover"[^>]*>/)||[''])[0];
 assert(/type="button"/.test(btn)&&/\bhidden\b/.test(btn)&&/aria-label="Right the car"/.test(btn)&&/aria-keyshortcuts="R"/.test(btn),'labelled, hidden until needed, announces its shortcut');
 assert(/\.recover\[hidden\]\{display:none\}/.test(css),'hidden really hides it (display:flex would override the attribute)');
 assert(/\.recover:focus-visible/.test(css)&&/button:focus-visible,input:focus-visible\{outline/.test(css),'visible focus');
 // Tab order: after the HUD, before the settings panel and the wheel.
 const at=id=>html.indexOf('id="'+id+'"');assert(at('settings-btn')<at('recover')&&at('recover')<at('settings')&&at('recover')<at('wheel-face'));
 assert(/aria-label="[^"]*R rights the car[^"]*"/.test(html),'canvas label mentions R');
 assert(/id="driving-help">[^<]*press R or use the Right the car button/.test(html),'screen-reader help mentions R and the button');
 assert(/<kbd>R<\/kbd> right the car/.test(html),'settings help mentions R');
 // The page reaches Agent 3's functions only through the adapter, and announces the result.
 assert(/const recoveryApi=\{can:w=>typeof canRecover==='function'\?canRecover\(w\)===true:false,run:w=>\{if\(typeof recover==='function'\)recover\(w\);\}\}/.test(script));
 assert(/say\('Car righted\.'\)/.test(script)&&/id="announcement"[^>]*aria-live="polite"/.test(html));
 const browser=script.split('// ---- Browser only below.')[1];assert(/recoverFromKey\(event,mode,ownsKeys\(document\.activeElement\)\)/.test(browser),'R goes through the tested gate');
 // Short landscape screens get the two-column settings panel; [hidden] still wins over the grid (same specificity, so :not([hidden])).
 assert(/\.panel\.wide:not\(\[hidden\]\)\{display:grid/.test(css)&&!/\.panel\.wide\{display/.test(css)&&/wide=view\.cssW>view\.cssH&&view\.cssH<=500/.test(browser));
});
// ---- Task 08 (Agent 3): larger cars, sprite anchors, shadow and bounds ----
const ids=Object.keys(e.PRESETS);
// Opaque pixels of a sprite rendered into a padded raster, as offsets from the integer anchor.
function opaque(sprite,ax,ay){const out=[];for(let y=0;y<sprite.height;y++)for(let x=0;x<sprite.width;x++)if(sprite.data[(y*sprite.width+x)*4+3])out.push([x-ax,y-ay]);return out;}
const PAD=16,frames={};
for(const id of ids){const p=e.PRESETS[id],s=p.sprite,box={size:s.size+2*PAD,ax:s.ax+PAD,ay:s.ay+PAD};
 frames[id]=Array.from({length:e.FRAMES},(_,i)=>{const a=i*e.TAU/e.FRAMES;return {car:opaque(e.carSprite(p,a,box),box.ax,box.ay),shadow:opaque(e.carShadow(p,a,box),box.ax,box.ay)};});}
const extent=px=>{let l=1e9,t=1e9,r=-1e9,b=-1e9;for(const [x,y] of px){l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);b=Math.max(b,y+1);}return {l,t,r,b};};
test('every car and shadow pixel of all 3 cars x 64 headings lies inside carScreenBounds and its raster', () => {
 const slack={};
 for(const id of ids){const p=e.PRESETS[id],s=p.sprite;let worst=0;
  for(let i=0;i<e.FRAMES;i++){const px=[...frames[id][i].car,...frames[id][i].shadow];assert(frames[id][i].car.length>150&&frames[id][i].shadow.length>40,'frame renders');
   // The frame drawn for heading a is frameIndex(a); bounds must cover it anywhere within half a frame of its angle.
   for(const off of [0,-.49,.49]){const a=(i+off)*e.TAU/e.FRAMES;assert.equal(e.frameIndex(a,e.FRAMES),i);const b=e.carScreenBounds(p,a);
    for(const [x,y] of px)assert(x>=b.l&&x+1<=b.r&&y>=b.t&&y+1<=b.b,`${id} frame ${i} pixel ${x},${y} outside ${JSON.stringify(b)}`);}
   for(const [x,y] of px)assert(x+s.ax>=0&&x+s.ax<s.size&&y+s.ay>=0&&y+s.ay<s.size,`${id} frame ${i} clipped by its raster`);
   const ext=extent(px),b=e.carScreenBounds(p,i*e.TAU/e.FRAMES);worst=Math.max(worst,ext.l-b.l,b.r-ext.r,ext.t-b.t,b.b-ext.b);}
  slack[id]=worst;assert(worst<=4,`${id} bounds are loose by ${worst}px`);}
 console.log('     max bounds slack per side (px):',JSON.stringify(slack));
});
test('cars are at least 20% larger than the original sprites', () => {
 // Original presets and their mean opaque sprite extents over 64 headings, measured from tasks/handoffs/base/index.html.
 const before={compact:{length:24,width:12,height:6.2,roof:10.2,wheelbase:16,w:24.19,h:20.41},coupe:{length:28,width:12.5,height:4.9,roof:8.2,wheelbase:19,w:26.81,h:21.09},van:{length:28,width:14,height:7.3,roof:14,wheelbase:19,w:28.13,h:25.69}};
 const report={};
 for(const id of ids){const p=e.PRESETS[id],o=before[id];for(const k of ['length','width','wheelbase'])assert(p[k]>=o[k]*1.2&&p[k]<=o[k]*1.35,`${id}.${k}`);
  let w=0,h=0;for(const f of frames[id]){const x=extent(f.car);w+=x.r-x.l;h+=x.b-x.t;}w/=e.FRAMES;h/=e.FRAMES;
  report[id]=[(w/o.w).toFixed(2),(h/o.h).toFixed(2)];assert(w>=o.w*1.2&&h>=o.h*1.1,`${id} sprite only ${w.toFixed(1)}x${h.toFixed(1)}`);}
 console.log('     sprite growth (mean width, height):',JSON.stringify(report));
});
test('wheelPoints sit under the rear axle, inside the footprint', () => {
 for(const id of ids){const p=e.PRESETS[id],w=e.createWorld(id);assert(p.trackWidth>0&&p.trackWidth<p.width);
  for(let i=0;i<64;i++){const a=i*e.TAU/64;Object.assign(w.car,{x:200,y:180,a});
   const pts=e.wheelPoints(w).map(q=>{const dx=q.x-200,dy=q.y/e.K-180;return {lx:dx*Math.cos(a)+dy*Math.sin(a),ly:-dx*Math.sin(a)+dy*Math.cos(a)};});
   for(const q of pts){assert(Math.abs(q.lx+p.wheelbase/2)<1e-9,'on the rear axle');assert(Math.abs(q.lx)<p.length/2&&Math.abs(q.ly)<p.width/2-1,'inside footprint');}
   assert(Math.abs(pts[0].ly+p.trackWidth/2)<1e-9&&Math.abs(pts[1].ly-p.trackWidth/2)<1e-9,'left then right tyre');}}
});
test('car shadow follows the shared light and stays two-tone', () => {
 for(const id of ids){const p=e.PRESETS[id];
  for(let i=0;i<64;i+=4){const a=i*e.TAU/64,[body]=e.carShadowPolys(p,a),cx=body.reduce((s,v)=>s+v[0],0)/body.length,cy=body.reduce((s,v)=>s+v[1],0)/body.length;
   assert(cx>0&&cy>0,'shadow falls down-right');}
  const s=e.carShadow(p,1),car=e.carSprite(p,1);let ink=0,n=0;
  for(const img of [s,car])for(let j=0;j<img.data.length;j+=4)if(img.data[j+3]){const c=[img.data[j],img.data[j+1],img.data[j+2]].join();assert(c==='48,52,45'||c==='191,193,177','two tones only');assert.equal(img.data[j+3],255);if(img===s){n++;if(c==='48,52,45')ink++;}}
  assert(Math.abs(ink/n-e.SHADOW_INK)<.06,`shadow density ${ink/n}`);}
});
test('sprite anchors are integers and atlases build quickly', () => {
 for(const id of ids){const s=e.PRESETS[id].sprite;assert(Number.isInteger(s.size)&&Number.isInteger(s.ax)&&Number.isInteger(s.ay));}
 const {ms}=e.buildCarAtlases();console.log(`     all atlases (384 rasters) built in ${ms.toFixed(1)} ms under node:vm (slower than a browser)`);
});
// ---- Task 06: figure-eight course, parking and gate slot (Agent 2). Rules are re-stated here from CONTRACT.md §5/§7,
// independently of the page's own helpers, so a wrong helper cannot make its own test pass.
const ARENAS=[[400,240],[480,270],[455,256],[234,506],[506,234],[320,320]];
// Edge strip (§11): clamp(round(0.12 × short side), 24, 40) screen px on all four sides.
const edgeOf = A => Math.max(24,Math.min(40,Math.round(.12*Math.min(A.W,A.H))));
const screen = (A,x,y) => [x, y*e.K];
function clearOf(A,sx,sy,m=0){
 const EDGE=edgeOf(A);
 if(sx<EDGE+m||sy<EDGE+m||sx>A.W-EDGE-m||sy>A.H-EDGE-m)return false;
 return e.controlZones(A).every(z=>!(sx>z.l-m&&sx<z.r+m&&sy>z.t-m&&sy<z.b+m)); // the page's real control zones
}
const layouts = ARENAS.map(([W,H])=>{const A=e.makeArena(W,H);return {A,name:W+'x'+H,L:e.layoutCourse(A)};});
const maxLength = Math.max(...Object.values(e.PRESETS).map(p=>p.length));
test('course: centered figure eight, gate and starting point', () => {
 for(const {A,name,L} of layouts){
  const f=L.figure,g=L.gate,s=L.spawn;
  assert.equal(f.x,A.W/2,`${name}: figure x`);assert(Math.abs(f.y*e.K-A.H/2)<1e-9,`${name}: figure y`);
  assert.equal(g.x,f.x,`${name}: gate x`);assert.equal(g.y,f.y,`${name}: gate y`);
  assert(Math.abs((s.x-g.x)*Math.cos(g.rotation)+(s.y-g.y)*Math.sin(g.rotation))<1e-9,`${name}: start aligned to gate`);
  assert(Math.abs(s.a-g.a)<1e-9,`${name}: start facing through gate`);
  assert.equal(L.parking.length,0,`${name}: no parking places`);
  assert(L.cones.length>=8,`${name}: enough cones to show both loops`);
  const vertical=A.H>A.W,along=c=>vertical?c.y*e.K:c.x,center=vertical?A.H/2:A.W/2;
  const left=L.cones.filter(c=>along(c)<center),right=L.cones.filter(c=>along(c)>center);
  assert.equal(left.length,right.length,`${name}: balanced loops`);
  for(const c of L.cones){
   assert(clearOf(A,...screen(A,c.x,c.y),e.CONE_R),`${name}: cone outside playable area`);
   for(const p of g.posts)assert(Math.hypot(c.x-p.x,c.y-p.y)>p.r+e.CONE_R,`${name}: cone overlaps gate post`);
  }
  const inner=Math.hypot(g.posts[1].x-g.posts[0].x,g.posts[1].y-g.posts[0].y)-g.posts[1].r-g.posts[0].r;
  assert(Math.abs(inner-g.width)<1e-9,`${name}: posts frame the opening`);
 }
});
test('course: all cars can drive straight through the gate from the start', () => {
 for(const id of Object.keys(e.PRESETS)){
  const w=e.createWorld(id),g=w.layout.gate;w.cones=[];
  for(let i=0;i<120;i++)e.step(w,input(true));
  assert((w.car.x-g.x)*Math.cos(g.a)+(w.car.y-g.y)*Math.sin(g.a)>0,`${id}: passed through gate`);assert.equal(w.hits,0);
 }
});
test('course: gate opening fits every (grown) car with the contract clearance', () => {
 const grown=1;let needW=0,needH=0; // presets already include task 08's growth
 for(const p0 of Object.values(e.PRESETS)){const p={...p0,length:p0.length*grown,width:p0.width*grown,height:p0.height*grown,roof:p0.roof*grown};
  for(const a of [Math.PI/2,-Math.PI/2,Math.PI/2+.25,Math.PI/2-.25]){const b=e.carScreenBounds(p,a);needW=Math.max(needW,b.r-b.l+8);}
  needH=Math.max(needH,p.roof+6);}
 for(const {name,L} of layouts){assert(L.gate.width>=Math.max(50,needW),`${name}: opening ${L.gate.width} < ${needW}`);assert(L.gate.height>=needH,`${name}: height`);}
});
test('course: layout is deterministic and survives unusual arenas', () => {
 for(const {A,L} of layouts)assert.equal(JSON.stringify(e.layoutCourse(A)),JSON.stringify(L));
 for(const [W,H] of [[200,150],[150,300],[640,250],[800,480],[250,250]]){const L=e.layoutCourse(e.makeArena(W,H));
  assert(L.cones.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y))&&Number.isFinite(L.spawn.x+L.spawn.y+L.spawn.a));}
});
test('createWorld places cones and car from layoutCourse; resetCones restores homes', () => {
 for(const {A,name,L} of layouts){
  const w=e.createWorld('van',A);assert.equal(w.arena,A);
  assert.deepEqual([w.car.x,w.car.y,w.car.a],[L.spawn.x,L.spawn.y,L.spawn.a],name);
  w.cones.forEach((o,i)=>{assert.equal(o.x,L.cones[i].x);assert.equal(o.y,L.cones[i].y);assert.equal(o.hx,o.x);assert.equal(o.hy,o.y);});
  // Spawned car does not start touching any cone: one physics step at rest leaves every cone still.
  e.step(w,input());assert(w.cones.every(o=>o.vx===0&&o.vy===0),`${name}: spawn overlaps a cone`);
 }
 const w=e.createWorld();for(const o of w.cones){o.x+=7;o.y-=3;o.vx=5;o.tipped=true;}e.resetCones(w);
 assert(w.cones.every(o=>o.x===o.hx&&o.y===o.hy&&o.vx===0&&!o.tipped&&o.px===o.x));
});
test('resizeWorld rebuilds layout and cone homes for the new arena', () => {
 const w=e.createWorld();const A=e.makeArena(234,506);
 // Cone 0 has been knocked aside; the rest stand at home. Untouched cones move to the new homes, the moved one scales.
 const k=w.cones[0];k.x+=9;k.vx=0;const kx=k.x*234/400,ky=k.y*(506/e.K)/(240/e.K);e.resizeWorld(w,A);
 assert.equal(JSON.stringify(w.layout),JSON.stringify(e.layoutCourse(A)));
 w.cones.forEach((o,i)=>{assert.equal(o.hx,w.layout.cones[i].x);assert.equal(o.hy,w.layout.cones[i].y);if(i)assert(o.x===o.hx&&o.y===o.hy&&o.px===o.x,'home cone follows the layout');});
 assert(Math.abs(k.x-kx)<1e-9&&Math.abs(k.y-ky)<1e-9,'displaced cone scales proportionally');
});
test('compact landscape retains a usable course around the corner instructions', () => {
 const L=e.layoutCourse(e.makeArena(333,222));assert(L.figure.rx>40,'loop should not collapse');assert(L.cones.length>=8,'both loops retain visible cones');
});
test('resize adjusts untouched cone count when course fitting changes', () => {
 const w=e.createWorld('compact',e.makeArena(400,240)),small=e.makeArena(427,240),large=e.makeArena(400,240);
 e.resizeWorld(w,small);assert.equal(w.cones.length,w.layout.cones.length);w.cones.forEach((c,i)=>{assert.equal(c.x,w.layout.cones[i].x);assert.equal(c.y,w.layout.cones[i].y);});
 e.resizeWorld(w,large);assert.equal(w.cones.length,w.layout.cones.length);w.cones.forEach((c,i)=>{assert.equal(c.x,w.layout.cones[i].x);assert.equal(c.y,w.layout.cones[i].y);});
});
test('course cones sit outside the marked driving lane', () => {
 for(const {name,L} of layouts){const f=L.figure;for(const c of L.cones){let closest=Infinity;
  for(let i=0;i<960;i++){const t=i*e.TAU/960,si=Math.sin(t),co=Math.cos(t),d=1+si*si,u=co/d,v=si*co/d*2*Math.SQRT2;
   const x=f.x+f.rx*(f.vertical?v:u),y=f.y*e.K+f.ry*e.K*(f.vertical?u:v);closest=Math.min(closest,Math.hypot(c.x-x,c.y*e.K-y));}
  assert(closest>17.9,`${name}: cone inside driving lane`);
 }}
});
test('drawGround is deterministic and draws two distinct track edges', () => {
 function render(A,L){const ink=new Set();const ctx={fillStyle:'',fillRect(x,y,w,h){if(this.fillStyle==='#30342d')for(let i=0;i<w;i++)for(let j=0;j<h;j++){const px=x+i,py=y+j;assert(px>=0&&py>=0&&px<A.W&&py<A.H);ink.add(px+','+py);}}};e.drawGround(ctx,A,L);return ink;}
 for(const {A,name,L} of layouts){
  const pixels=render(A,L);assert.deepEqual([...pixels].sort(),[...render(A,L)].sort(),name);
  const f=L.figure,point=t=>{const si=Math.sin(t),co=Math.cos(t),d=1+si*si,u=co/d,v=si*co/d*2*Math.SQRT2;return [f.x+f.rx*(f.vertical?v:u),f.y*e.K+f.ry*e.K*(f.vertical?u:v)];};
  for(let i=0;i<16;i++){const t=i*2*Math.PI/16,p=point(t),a=point(t-.001),b=point(t+.001),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
   for(const side of [-1,1]){const x=Math.round(p[0]-side*15*dy/len),y=Math.round(p[1]+side*15*dx/len);let hit=false;
    for(let ox=-2;ox<=2;ox++)for(let oy=-2;oy<=2;oy++)if(pixels.has((x+ox)+','+(y+oy)))hit=true;
    assert(hit,`${name}: missing track edge ${side} at sample ${i}`);
   }
  }
 }
});
// ---- Task 05 / 06 stage 2 (Agent 2): more transfer behaviour, cones, scene list, course finish ----
test('partial exit then reverse returns through the same edge (all edges, all cars)', () => {
 const A=e.DEFAULT_ARENA;
 for(const id of ids)for(const [edge,a,axis,sign] of EDGES){
  const name=id+' '+edge,w=empty(id);Object.assign(w.car,{a,pa:a,vx:0,vy:0});const b=bounds(w);
  // Parked with the box 2 px inside the edge, then drive out until the box's centre has crossed the edge.
  if(axis==='x'){w.car.x=sign>0?A.W-b.r-2:-b.l+2;w.car.y=A.WH/2;}else{w.car.x=A.W/2;w.car.y=(sign>0?A.H-b.b-2:-b.t+2)/e.K;}
  w.car.px=w.car.x;w.car.py=w.car.y;const start={x:w.car.x,y:w.car.y};
  const centreOut=()=>{const q=sbox(w),c=axis==='x'?(q.l+q.r)/2:(q.t+q.b)/2,lim=axis==='x'?A.W:A.H;return sign>0?c>=lim:c<=0;};
  let n=0;while(!centreOut()&&n<1200){e.step(w,input(true));n++;assert(visible(w),name+': visible while leaving');}
  assert(centreOut(),name+': got half out');
  // Brake, then reverse back in until the whole box is inside again.
  const inside=()=>{const q=sbox(w);return q.l>=0&&q.r<=A.W&&q.t>=0&&q.b<=A.H;};
  n=0;while(!inside()&&n<2400){e.step(w,input(false,true));n++;assert(visible(w),name+': visible while backing in');}
  assert(inside(),name+': back inside');assert.equal(w.wraps,0,name+': never transferred');
  assert(Math.hypot(w.car.x-start.x,w.car.y-start.y)<60,name+': came back through the same edge');
 }
});
test('no transfer flip-flop: arrivals survive heading changes and short reversals; edge circling never ping-pongs', () => {
 const A=e.DEFAULT_ARENA;
 // Unit level: right after a transfer, a heading change of up to ±0.05 rad (more than one step at the §11 limit of
 // 5.9 rad/s) or backing up 1.9 px does not transfer the car back.
 for(const id of ids)for(let i=0;i<64;i++)for(const [edge,,axis,sign] of EDGES){
  const w=empty(id),a=i*e.TAU/64;w.car.a=a;const b=bounds(w);
  if(axis==='x'){w.car.x=sign>0?A.W+TM+.01-b.l:-TM-.01-b.r;w.car.y=A.WH/2;}else{w.car.x=A.W/2;w.car.y=(sign>0?A.H+TM+.01-b.t:-TM-.01-b.b)/e.K;}
  w.car.px=w.car.x;w.car.py=w.car.y;e.transferEdges(w);assert.equal(w.wraps,1);
  const x0=w.car.x,y0=w.car.y;
  for(const da of [-.05,-.025,.025,.05])for(const back of [0,1.9]){
   w.car.a=a+da;w.car.x=x0+(axis==='x'?sign*back:0);w.car.y=y0+(axis==='y'?sign*back/e.K:0);
   e.transferEdges(w);assert.equal(w.wraps,1,`${id} ${edge} frame ${i} da ${da} back ${back}: flipped back`);
  }
 }
 // Driving level: circle across each edge and through a corner at full lock for 40 s. Every transfer is one big jump on one
 // axis; a jump straight back on the same axis needs the whole box to cross again, so it never follows within 0.25 s.
 let total=0;const starts=[[1,.5,0],[0,.5,Math.PI],[.5,1,Math.PI/2],[.5,0,-Math.PI/2],[1,1,Math.PI/4]];
 for(const id of ids)for(const [fx,fy,a] of starts)for(const steerRight of [true,false]){
  const w=empty(id);Object.assign(w.car,{x:A.W*fx,px:A.W*fx,y:A.WH*fy,py:A.WH*fy,a,pa:a});const events=[];
  for(let i=0;i<4800;i++){const x=w.car.x,y=w.car.y,before=w.wraps;e.step(w,input(true,false,!steerRight,steerRight));
   if(w.wraps>before){const jx=w.car.x-x,jy=(w.car.y-y)*e.K;assert.equal(w.wraps-before,1);
    if(Math.abs(jx)>A.W/2)events.push({i,axis:'x',s:Math.sign(jx)});if(Math.abs(jy)>A.H/2)events.push({i,axis:'y',s:Math.sign(jy)});}}
  assert(w.wraps>=1,`${id} ${fx},${fy}: the circle crosses an edge`);total+=w.wraps;
  for(let k=1;k<events.length;k++)for(let j=k-1;j>=0&&events[k].i-events[j].i<30;j--)
   if(events[j].axis===events[k].axis)assert(events[j].s===events[k].s,`${id} ${fx},${fy}: flip-flop at steps ${events[j].i}/${events[k].i}`);
 }
 assert(total>=300,'edge circling produced '+total+' transfers');
});
test('collision timing: a cone just inside the far edge is untouched while the car departs, hit after transfer', () => {
 const A=e.DEFAULT_ARENA;
 for(const id of ids)for(const [edge,a,axis,sign] of EDGES){
  const name=id+' '+edge,w=empty(id);Object.assign(w.car,{a,pa:a,vx:Math.cos(a)*50,vy:Math.sin(a)*50});const b=bounds(w);
  // Car partly out of the departing edge; a cone in its path just inside the opposite edge.
  const cone={x:0,y:0,vx:0,vy:0,a:0,omega:0,tipped:false};
  if(axis==='x'){w.car.x=sign>0?A.W-b.l-4:-b.r+4;w.car.y=A.WH/2;cone.x=sign>0?3:A.W-3;cone.y=w.car.y;}
  else{w.car.x=A.W/2;w.car.y=(sign>0?A.H-b.t-4:-b.b+4)/e.K;cone.x=w.car.x;cone.y=(sign>0?2:A.H-2)/e.K;}
  Object.assign(cone,{px:cone.x,py:cone.y,pa:0});w.cones=[cone];w.car.px=w.car.x;w.car.py=w.car.y;
  const home={x:cone.x,y:cone.y};let n=0;
  while(w.wraps===0&&n<600){e.step(w,input(true));n++;assert(cone.vx===0&&cone.vy===0&&cone.x===home.x&&cone.y===home.y,name+': hit across the edge before transfer');}
  assert.equal(w.wraps,1,name);
  n=0;while(cone.vx===0&&cone.vy===0&&n<240){e.step(w,input(true));n++;}
  assert(cone.vx!==0||cone.vy!==0,name+': cone in the path is hit after transfer');
  assert(sign*(axis==='x'?cone.vx:cone.vy)>0,name+': pushed onward, in the direction of travel');
 }
});
test('cones transfer with their own box: fully offscreen first, overshoot kept, no wraps counted', () => {
 const A=e.DEFAULT_ARENA,B=e.CONE_BOX;
 // Every cone pixel (upright, 16 tipped frames, shadow) lies inside CONE_BOX relative to the drawn anchor (raster 10,14).
 const rasters=[e.coneSprite(),e.coneShadowSprite(),...Array.from({length:16},(_,i)=>e.coneSprite(true,i*e.TAU/16)),...Array.from({length:16},(_,i)=>e.coneShadowSprite(true,i*e.TAU/16))];
 for(const r of rasters)for(const [x,y] of opaque(r,10,14))assert(x>=B.l&&x+1<=B.r&&y>=B.t&&y+1<=B.b,`cone pixel ${x},${y} outside CONE_BOX`);
 const w=empty();w.car.x=A.W/2;w.car.y=A.WH/2;
 const cone={x:A.W-B.l+TM-.01,y:100,vx:0,vy:0,a:0,omega:0,tipped:false};cone.px=cone.x;cone.py=cone.y;w.cones=[cone];
 e.transferEdges(w);assert.equal(cone.x,A.W-B.l+TM-.01,'inside the margin: stays');
 cone.x+=.5;cone.px=cone.x-1;e.transferEdges(w);
 assert(Math.abs(cone.x+B.r-(TM+.49))<1e-9,'right box edge re-enters at the overshoot');assert(Math.abs(cone.px-(cone.x-1))<1e-9,'px shifted too');
 assert.equal(w.wraps,0,'cone transfers are not car wraps');
 const top={x:50,y:(-B.b-TM-.3)/e.K,vx:0,vy:-5,a:0,omega:0,tipped:true};w.cones=[top];e.transferEdges(w);assert(Math.abs(top.y*e.K+B.t-(A.H-TM-.3))<1e-9);
});
test('sceneItems: one copy per object at its real position, culled offscreen, car last on ties', () => {
 const A=e.DEFAULT_ARENA,w=e.createWorld();const b=bounds(w);
 Object.assign(w.car,{x:A.W-b.l-5,px:A.W-b.l-5,y:100,py:100}); // car hanging over the right edge: only a 5 px sliver shows
 let items=e.sceneItems(w,1);assert.equal(items.filter(o=>o.type==='car').length,1);
 const car=items.find(o=>o.type==='car');assert.equal(car.x,Math.round(w.car.x));assert(!items.some(o=>o.type==='car'&&o.x<A.W/2),'no copy on the left');
 assert.equal(items.filter(o=>o.type==='cone').length,w.cones.length,'every on-screen cone once');
 Object.assign(w.car,{x:A.W-b.l+1,px:A.W-b.l+1});items=e.sceneItems(w,1);assert.equal(items.filter(o=>o.type==='car').length,0,'fully offscreen car is culled');
 const o=w.cones[0];o.x=o.px=-e.CONE_BOX.r-.5;assert.equal(e.sceneItems(w,1).filter(q=>q.type==='cone').length,w.cones.length-1,'offscreen cone culled');
 // Draw order: key = ground screen y; the car sorts after a cone on the same row.
 Object.assign(w.car,{x:200,px:200,y:100,py:100});const c0=w.cones[1];c0.x=c0.px=150;c0.y=c0.py=100;
 const sorted=e.sceneItems(w,1).sort(e.drawOrder);assert(sorted.every(q=>q.key===q.y||(q.type==='gate'&&q.part==='arch')),'key = ground y (the arch top always in front)');
 for(let i=1;i<sorted.length;i++)assert(sorted[i-1].key<=sorted[i].key,'sorted by key');
 const row=sorted.filter(q=>q.key===66);assert(row.length>=2&&row[row.length-1].type==='car','car drawn after a cone on its row');
});
test('course finish: edge strip per §11, spawn box 4 px inside, crossing corridor fits the Van', () => {
 assert.deepEqual([[400,240],[234,506],[800,480],[150,100]].map(([W,H])=>e.edgeClear(e.makeArena(W,H))),[29,28,40,24]);
 // Box over every car and heading, computed here independently of the page's helper.
 let l=0,t=0,r=0,b=0;for(const p of Object.values(e.PRESETS))for(let i=0;i<256;i++){const q=e.carScreenBounds(p,i*e.TAU/256);l=Math.min(l,q.l);t=Math.min(t,q.t);r=Math.max(r,q.r);b=Math.max(b,q.b);}
 const need=Math.max(...Object.values(e.PRESETS).map(p=>p.width))+8; // the Van's width + 8 screen px (lead, stage 2)
 for(const {A,name,L} of layouts){
  const sx=L.spawn.x,sy=L.spawn.y*e.K;assert(sx+l>=4&&sy+t>=4&&sx+r<=A.W-4&&sy+b<=A.H-4,`${name}: spawn car box inside by 4 px`);
  // Gate lanes are outside the edge strip too.
  const E=edgeOf(A),gy=L.gate.y*e.K,lane=L.gate.lane*e.K;assert(gy-lane>=E-1e-9&&gy+lane<=A.H-E+1e-9,`${name}: gate lanes clear of the strip`);
  // Corridor along the long axis through the crossing: each side's pair of crossing cones leaves >= need px between edges.
  const f=L.figure,cx=f.x,cy=f.y*e.K,pts=L.cones.map(c=>[c.x,c.y*e.K]),along=p=>f.vertical?p[1]-cy:p[0]-cx,across=p=>f.vertical?p[0]-cx:p[1]-cy;
  const near=[...pts].sort((p,q)=>Math.hypot(p[0]-cx,p[1]-cy)-Math.hypot(q[0]-cx,q[1]-cy)).slice(0,4);
  for(const side of [-1,1]){const pair=near.filter(p=>Math.sign(along(p))===side);assert.equal(pair.length,2,name);
   assert(Math.abs(across(pair[0])-across(pair[1]))-2*e.CONE_R>=need-1e-6,`${name}: crossing corridor too narrow`);}
  // No other cone sits inside the corridor between the two loops' crossing pairs.
  const reach=Math.max(...near.map(p=>Math.abs(along(p))));
  for(const p of pts)if(Math.abs(along(p))<=reach+1e-9)assert(Math.abs(across(p))>=need/2+e.CONE_R-1e-6,`${name}: cone in the corridor`);
 }
});
test('the Van can follow the figure-eight route through the centered gate', () => {
 for(const [W,H] of [[400,240],[480,270],[234,506],[506,234]]){
  const w=e.createWorld('van',e.makeArena(W,H)),f=w.layout.figure,name=W+'x'+H;
  function point(t){const si=Math.sin(t),co=Math.cos(t),d=1+si*si,u=co/d,v=si*co/d*2*Math.SQRT2;
   return [f.x+f.rx*(f.vertical?v:u),f.y+f.ry*(f.vertical?u:v)];}
  // Orient the Van along the actual traced route and test clearance from both gate posts.
  for(let i=0;i<960;i++){const t=i*e.TAU/960,[x,y]=point(t),[nx,ny]=point(t+.0001),a=Math.atan2(ny-y,nx-x);
   for(const post of w.layout.gate.posts){Object.assign(w.car,{x,y,a,vx:0,vy:0,omega:0});
    assert.equal(e.carPost(w,post),0,`${name}: route hits a gate post at sample ${i}`);}
  }
 }
});
test('layoutCourse is cached per arena size and returns independent copies', () => {
 const A=e.makeArena(333,222),t0=Date.now();const L1=e.layoutCourse(A);const t1=Date.now();
 for(let i=0;i<20;i++)e.layoutCourse(A);const t2=Date.now();
 assert((t2-t1)/20<5,'cached call is cheap');
 const L2=e.layoutCourse(A);assert.notEqual(L1,L2);assert.deepEqual(L1,L2);
 L2.cones[0].x=-999;L2.spawn.x=-1;assert.deepEqual(e.layoutCourse(A),L1,'mutating a result does not touch the cache');
 assert.equal(JSON.stringify(e.layoutCourse(e.makeArena(333,222))),JSON.stringify(L1),'keyed by size, not by object');
 console.log(`     layoutCourse 333x222: first call ${t1-t0} ms, cached ${((t2-t1)/20).toFixed(2)} ms`);
});
// ---- Task 10 (Agent 3): faster cars, collision substeps, gate posts ----
// Stage-1 presets (tasks/handoffs/base/index.html), and their measured top speed and 0-to-top time with this file's drive().
const OLD={compact:{accel:57,brake:105,max:111,reverse:37,grip:84,top:2.97,to60:1.29},coupe:{accel:69,brake:109,max:137,reverse:43,grip:60,top:2.94,to60:1.01},van:{accel:43,brake:89,max:88,reverse:29,grip:91,top:3.43,to60:1.92}};
const noPosts = w => { w.layout = undefined; return w; }; // also exercises the "no layout" path
// layoutCourse takes ~50 ms, so scenario worlds are shallow copies of one cached world per car (the layout is shared, read-only).
const cache10 = {};
const fresh = id => { const b=cache10[id]||(cache10[id]=e.createWorld(id)); return {...b,car:{...b.car},cones:b.cones.map(o=>({...o})),time:0,wraps:0,hits:0,trackBreak:false}; };
const bare = id => { const w=fresh(id); w.cones=[]; return noPosts(w); };
const lane = id => { const w=fresh(id); w.cones=[]; return w; }; // real gate posts, no cones
function local(c,x,y){const dx=x-c.x,dy=y-c.y,cs=Math.cos(c.a),sn=Math.sin(c.a);return {lx:dx*cs+dy*sn,ly:-dx*sn+dy*cs};}
// How deep a circle (x, y, R) overlaps the car's box; negative = apart.
function depth(w,x,y,R){const p=w.p,{lx,ly}=local(w.car,x,y),hl=p.length/2,hw=p.width/2;
 if(Math.abs(lx)<hl&&Math.abs(ly)<hw)return R+Math.min(hl-Math.abs(lx),hw-Math.abs(ly));
 return R-Math.hypot(lx-Math.max(-hl,Math.min(hl,lx)),ly-Math.max(-hw,Math.min(hw,ly)));}
const finite = o => [o.x,o.y,o.vx,o.vy,o.a,o.omega].every(Number.isFinite);
const speedOf = o => Math.hypot(o.vx,o.vy);
// Aim a car at a target circle from direction `ang`, offset sideways by `off`, at speed v, `gap` px before contact.
function aim(w,q,ang,off,v,gap=10){const p=w.p,dx=Math.cos(ang),dy=Math.sin(ang),back=p.length/2+q.r+gap;
 Object.assign(w.car,{x:q.x-dx*back-dy*off,y:q.y-dy*back+dx*off,a:ang,vx:dx*v,vy:dy*v,omega:0,steer:0});}
// Passing through: the target's centre crosses the car's centre line inside the body's width between two steps.
const crossed = (a,b,hw) => Math.sign(a.lx)!==Math.sign(b.lx)&&Math.max(Math.abs(a.ly),Math.abs(b.ly))<hw;
const report10 = {};
test('task 10: top speed and acceleration are moderately higher, and the three cars stay distinct', () => {
 for(const id of ids){const p=e.PRESETS[id],o=OLD[id],w=bare(id);let t=0,to60=null,top=null;
  for(let i=0;i<8/e.STEP&&top===null;i++){e.step(w,input(true));t+=e.STEP;const f=forward(w);if(to60===null&&f>=60)to60=t;if(f>=p.max-1e-9)top=t;}
  assert(top!==null,`${id} reaches its top speed`);assert(Math.abs(forward(w)-p.max)<1e-9);
  assert(p.max>=o.max*1.2&&p.max<=o.max*1.45,`${id} top speed +20-45%`);assert(p.accel>=o.accel*1.2&&p.accel<=o.accel*1.4,`${id} acceleration +20-40%`);
  assert(p.brake>o.brake&&p.reverse>o.reverse&&p.grip>=o.grip,`${id} braking, reverse and grip retuned upward`);
  assert(to60<o.to60,`${id} 0-60 is quicker`);assert(top<o.top*1.1,`${id} reaches the higher top speed in about the old time`);
  // Braking from top speed stops quickly and never accelerates.
  let d=0,bt=0,prev=forward(w);while(forward(w)>0.5&&bt<3){const x=w.car.x,y=w.car.y;e.step(w,input(false,true));bt+=e.STEP;d+=Math.hypot(e.delta(w.car.x-x,w.arena.W),e.delta(w.car.y-y,w.arena.WH));assert(forward(w)<=prev+1e-9);prev=forward(w);}
  assert(bt<1.3,`${id} stops from top speed in ${bt.toFixed(2)} s`);
  report10[id]={top:`${o.max}->${p.max}`,toTop:`${o.top}->${top.toFixed(2)}s`,to60:`${o.to60}->${to60.toFixed(2)}s`,brake:`${bt.toFixed(2)}s/${d.toFixed(0)}px`};}
 // Character: the coupe is fastest and slides most at full lock, the van is slowest and grips hardest, the compact sits between.
 const lock={};for(const id of ids){const w=bare(id),p=w.p;Object.assign(w.car,{a:0,vx:p.max,vy:0});let slip=0;
  for(let i=0;i<240;i++){e.step(w,{steering:1,throttle:forward(w)<p.max?1:0,brake:0});if(i>120)slip=Math.max(slip,w.car.slip);assert(Math.abs(w.car.omega)<5.9);}lock[id]=+slip.toFixed(1);}
 assert(e.PRESETS.coupe.max>e.PRESETS.compact.max&&e.PRESETS.compact.max>e.PRESETS.van.max);
 assert(lock.coupe>lock.compact&&lock.compact>lock.van,`full-lock slip at top speed ${JSON.stringify(lock)}`);
 console.log('     old->new top speed, 0-top, 0-60, braking from top:',JSON.stringify(report10));
 console.log('     full-lock slip at top speed (px/s):',JSON.stringify(lock));
});
test('task 10: low-speed driving stays controllable and grips', () => {
 for(const id of ids){const w=bare(id);Object.assign(w.car,{a:0,vx:30,vy:0});
  for(let i=0;i<240;i++){e.step(w,{steering:i<120?1:-1,throttle:forward(w)<30?1:0,brake:0});assert(!w.car.skidding,`${id} skids at 30 px/s`);assert(w.car.slip<5,`${id} slip ${w.car.slip}`);}}
});
test('task 10: W+S brakes and reverse steering is correct for every car at the new speeds', () => {
 const c=e.createControls();c.keyDown('w');c.keyDown('s');
 for(const id of ids){const w=bare(id);run(w,4,input(true));const v0=forward(w);assert(v0>e.PRESETS[id].max*.95);
  let prev=v0;for(let i=0;i<240;i++){e.step(w,c.sample());assert(Math.abs(forward(w))<=prev+1e-9,`${id} W+S never accelerates`);prev=Math.abs(forward(w));}
  assert(Math.abs(forward(w))<1,`${id} W+S stops the car`);
  // Reversing: S then S+A yaws positive, S+D negative, at full reverse speed; forward D yaws positive.
  for(const [keys,sign] of [[input(false,true,true),1],[input(false,true,false,true),-1],[input(true,false,false,true),1]]){
   const r=bare(id);run(r,keys.throttle?2:3,keys.throttle?input(true):input(false,true));
   if(!keys.throttle)assert(Math.abs(forward(r)+e.PRESETS[id].reverse)<1e-9,`${id} reaches full reverse speed`);
   run(r,.5,keys);assert(Math.sign(r.car.omega)===sign,`${id} steering ${JSON.stringify(keys)} yaws ${r.car.omega}`);}}
});
test('task 10: substeps keep every relative move under half a cone radius, with bounded cost', () => {
 const reach=Math.max(...ids.map(id=>Math.hypot(e.PRESETS[id].length,e.PRESETS[id].width)/2));
 const worst=(e.FASTEST*e.SPEED_CAP+e.CONE_MAX+e.OMEGA_MAX*reach)*e.STEP,cap=Math.ceil(worst/e.SUB_MOVE);
 assert(e.SUB_MOVE<=e.CONE_R/2+1e-12&&e.OMEGA_MAX<5.9&&cap<=6,`cap ${cap}`);
 assert(e.CONE_MAX>=e.FASTEST*e.SPEED_CAP,'a struck cone can outrun the fastest car');
 for(const id of ids){const w=e.createWorld(id);assert.equal(e.substeps(w),1,'one substep at rest');
  // Worst case for this car: speed limit, a cone at CONE_MAX and full spin.
  Object.assign(w.car,{vx:e.PRESETS[id].max*e.SPEED_CAP,vy:0,omega:e.OMEGA_MAX});w.cones[0].vx=-e.CONE_MAX;
  const n=e.substeps(w),p=e.PRESETS[id],move=(p.max*e.SPEED_CAP+e.CONE_MAX+e.OMEGA_MAX*Math.hypot(p.length,p.width)/2)*e.STEP/n;
  assert(n<=cap&&move<=e.SUB_MOVE,`${id}: ${n} substeps move ${move.toFixed(3)} px`);
  // Even with every cone at rest, a fast car budgets for the cone it is about to strike.
  const o=w.cones[0],half=Math.hypot(p.length,p.width)/2,sp=p.max*e.SPEED_CAP+e.OMEGA_MAX*half;o.vx=0;Object.assign(w.car,{x:o.x-half-e.CONE_R-1,y:o.y});
  assert(e.substeps(w)*e.SUB_MOVE>=(sp+Math.min(e.CONE_MAX,1.2*sp))*e.STEP,id+' budgets for the cone it strikes');
  // Far from every cone (none moving), only the car's own motion counts, which keeps long drives cheap.
  const far=bare(id);Object.assign(far.car,{vx:p.max,vy:0,omega:0});assert.equal(e.substeps(far),Math.ceil((p.max+p.accel*e.STEP)*e.STEP/e.SUB_MOVE));}
 console.log(`     substeps: 1 at rest, at most ${cap} per 1/120 s step; worst relative move ${(worst/cap).toFixed(3)} px <= ${e.SUB_MOVE} px`);
});
// Drives a scenario with full throttle and checks every step. `targets` are circles {x, y, r} the car must not pass through.
function watch(w,targets,steps,each){const hw=w.p.width/2;let prev=targets.map(q=>local(w.car,q.x,q.y)),stats={pen:-Infinity,speed:0,omega:0,minVd:Infinity};
 const d=[Math.cos(w.car.a),Math.sin(w.car.a)];
 for(let i=0;i<steps;i++){e.step(w,input(true));const c=w.car;
  assert(finite(c),'car state finite');for(const o of w.cones)assert(finite(o),'cone state finite');
  const now=targets.map(q=>local(c,q.x,q.y));
  targets.forEach((q,k)=>{assert(!crossed(prev[k],now[k],hw),'tunnelled through a target');stats.pen=Math.max(stats.pen,depth(w,q.x,q.y,q.r));});
  prev=now;stats.speed=Math.max(stats.speed,speedOf(c));stats.omega=Math.max(stats.omega,Math.abs(c.omega));stats.minVd=Math.min(stats.minVd,c.vx*d[0]+c.vy*d[1]);
  if(each)each(w,i);}
 return stats;}
const DIRS=Array.from({length:8},(_,k)=>k*Math.PI/4);
test('task 10: max-speed head-on, off-centre and grazing hits on both gate posts, all cars, no tunnelling', () => {
 const worst={};
 for(const id of ids){const p=e.PRESETS[id],hw=p.width/2;let deepest=-Infinity,rebound=0,spin=0;
  for(const k of [0,1]){
   for(const ang of DIRS)for(const [kind,off] of [['head-on',0],['off-centre',hw*.5],['off-centre',-hw*.5],['grazing',hw+3],['grazing',-(hw+3)]]){
    const w=lane(id),q=w.layout.gate.posts[k];aim(w,q,ang,off,p.max);
    const s=watch(w,w.layout.gate.posts,150);
    const tag=`${id} post ${k} ${kind} ${off.toFixed(1)} at ${(ang*180/Math.PI).toFixed(0)}deg`;
    assert(s.pen<.05,`${tag}: post overlaps the car by ${s.pen.toFixed(3)}`);
    assert(s.speed<=p.max*e.SPEED_CAP+1e-9&&s.omega<=e.OMEGA_MAX+1e-9,`${tag}: speed ${s.speed} spin ${s.omega}`);
    deepest=Math.max(deepest,s.pen);spin=Math.max(spin,s.omega);
    if(kind==='head-on'){
     // Stops dead at the post (never beyond it), and the bounce is gentle: at most POST_E of the impact speed.
     const along=(q.x-w.car.x)*Math.cos(ang)+(q.y-w.car.y)*Math.sin(ang);
     assert(along>=p.length/2+q.r-.05,`${tag}: car ended past the post face (${along.toFixed(2)})`);
     assert(s.minVd<0&&-s.minVd<=0.3*p.max+1,`${tag}: rebound ${s.minVd.toFixed(1)}`);rebound=Math.max(rebound,-s.minVd);
    }
    if(kind==='off-centre')assert(s.minVd<p.max*.75,`${tag}: an off-centre hit must cost real speed`);
   }}
  worst[id]={maxOverlap:+deepest.toFixed(3),rebound:+rebound.toFixed(1),spin:+spin.toFixed(2)};}
 console.log('     post impacts (overlap px, head-on rebound px/s, peak spin rad/s):',JSON.stringify(worst));
});
test('task 10: car passes cleanly through the gate opening at top speed (only the posts collide)', () => {
 for(const id of ids)for(const dir of [-1,1]){const w=lane(id),g=w.layout.gate,p=e.PRESETS[id];
  Object.assign(w.car,{x:g.x,y:g.y-dir*(p.length/2+20),a:dir*Math.PI/2,vx:0,vy:dir*p.max,omega:0});
  const ghost=noPosts(lane(id));Object.assign(ghost.car,{...w.car});
  for(let i=0;i<72;i++){e.step(w,input(true));e.step(ghost,input(true));}
  assert.deepEqual([w.car.x,w.car.y,w.car.vx,w.car.vy],[ghost.car.x,ghost.car.y,ghost.car.vx,ghost.car.vy],`${id} touched a post in the opening`);
  assert(dir*(w.car.y-g.y)>p.length/2+4,`${id} drove through`);}
});
test('task 10: max-speed head-on, off-centre and grazing cone hits, all cars', () => {
 const out={};
 for(const id of ids){const p=e.PRESETS[id],hw=p.width/2;let fastest=0,deepest=-Infinity;
  for(const ang of DIRS)for(const [kind,off] of [['head-on',0],['off-centre',hw*.6],['off-centre',-hw*.6],['grazing',hw+1.5],['grazing',-(hw+1.5)]]){
   const w=bare(id),o={x:200,y:180,vx:0,vy:0,a:0,omega:0,tipped:false};w.cones=[o];aim(w,{...o,r:e.CONE_R},ang,off,p.max,4);
   let conePeak=0;const s=watch(w,[],50,()=>{conePeak=Math.max(conePeak,speedOf(o));deepest=Math.max(deepest,depth(w,o.x,o.y,e.CONE_R));
    const l=local(w.car,o.x,o.y);assert(!(Math.abs(l.lx)<p.length/2&&Math.abs(l.ly)<hw),`${id} ${kind}: cone centre inside the car`);});
   const tag=`${id} ${kind} ${off.toFixed(1)} at ${(ang*180/Math.PI).toFixed(0)}deg`;
   assert(conePeak>0,`${tag}: cone was hit`);assert(conePeak<=e.CONE_MAX+1e-9,`${tag}: cone speed ${conePeak}`);
   assert(s.speed<=p.max*e.SPEED_CAP+1e-9&&s.omega<=e.OMEGA_MAX+1e-9);
   // A 45 g cone barely slows a car; the cone leaves ahead of it (head-on) instead of being driven through.
   assert(s.minVd>p.max*.8,`${tag}: car lost too much speed (${s.minVd.toFixed(1)})`);
   if(kind==='head-on'){const l=local(w.car,o.x,o.y);assert(l.lx>p.length/2,`${tag}: cone is not ahead of the car`);assert(o.tipped,`${tag}: hard hit tips the cone`);}
   fastest=Math.max(fastest,conePeak);}
  out[id]={coneSpeed:+fastest.toFixed(1),maxOverlap:+deepest.toFixed(3)};}
 console.log('     cone impacts (peak cone speed px/s, worst overlap px):',JSON.stringify(out),'CONE_MAX',e.CONE_MAX);
});
test('task 10: high relative velocity: fast cones against posts and against an oncoming car', () => {
 const w0=lane('coupe'),posts=w0.layout.gate.posts,R=posts[0].r+e.CONE_R;
 for(const q of posts)for(let k=0;k<16;k++){const ang=k*Math.PI/8;
  for(const off of [0,R*.5,-R*.5,R-.3]){const w=lane('coupe');Object.assign(w.car,{x:q.x+w.arena.W/2,y:q.y+60,vx:0,vy:0}); // car far away
   const dx=Math.cos(ang),dy=Math.sin(ang),o={x:q.x-dx*(R+6)-dy*off,y:q.y-dy*(R+6)+dx*off,vx:dx*e.CONE_MAX,vy:dy*e.CONE_MAX,a:0,omega:0,tipped:true};w.cones=[o];
   let px=o.x,py=o.y;
   for(let i=0;i<40;i++){e.step(w,input());assert(finite(o));
    for(const p of w.layout.gate.posts){assert(Math.hypot(o.x-p.x,o.y-p.y)>=R-1e-6,'cone inside a post');
     // The straight path between two steps never cuts through the post itself.
     const sx=o.x-px,sy=o.y-py,L2=sx*sx+sy*sy,t=L2?Math.max(0,Math.min(1,((p.x-px)*sx+(p.y-py)*sy)/L2)):0;assert(Math.hypot(px+sx*t-p.x,py+sy*t-p.y)>=p.r-1e-6,'cone tunnelled through a post');}
    assert(speedOf(o)<=e.CONE_MAX+1e-9);px=o.x;py=o.y;}
   if(off===0)assert((o.x-q.x)*dx+(o.y-q.y)*dy<0,'head-on cone bounces back');}}
 // Car at top speed meets a cone flying at CONE_MAX straight at it.
 for(const id of ids){const p=e.PRESETS[id];for(const off of [0,p.width*.3,p.width/2+1]){const w=bare(id),o={x:200,y:180,vx:-e.CONE_MAX,vy:0,a:0,omega:0,tipped:false};w.cones=[o];
  aim(w,{...o,r:e.CONE_R},0,off,p.max,8);const s=watch(w,[],40,()=>assert(speedOf(o)<=e.CONE_MAX+1e-9));
  assert(s.speed<=p.max*e.SPEED_CAP+1e-9&&s.minVd>p.max*.7,`${id}: oncoming cone ${s.minVd}`);
  if(!off)assert(local(w.car,o.x,o.y).lx>p.length/2,`${id}: oncoming cone passed through the car`);}}
});
test('task 10: car shoving a cone into a post stays stable (no overlap with the post, no NaN, bounded speeds)', () => {
 for(const id of ids)for(const k of [0,1])for(const ang of DIRS)for(const off of [0,1.5,-3]){const w=lane(id),p=e.PRESETS[id],q=w.layout.gate.posts[k],R=q.r+e.CONE_R;
  const dx=Math.cos(ang),dy=Math.sin(ang),o={x:q.x-dx*(R+.5)-dy*off,y:q.y-dy*(R+.5)+dx*off,vx:0,vy:0,a:0,omega:0,tipped:false};w.cones=[o];
  aim(w,{x:o.x,y:o.y,r:e.CONE_R},ang,0,p.max,6);
  const s=watch(w,w.layout.gate.posts,240,()=>{for(const p2 of w.layout.gate.posts)assert(Math.hypot(o.x-p2.x,o.y-p2.y)>=p2.r+e.CONE_R-1e-6,'cone pushed into a post');assert(speedOf(o)<=e.CONE_MAX+1e-9);});
  assert(s.pen<.05&&s.speed<=p.max*e.SPEED_CAP+1e-9&&s.omega<=e.OMEGA_MAX+1e-9,`${id} post ${k}: ${JSON.stringify(s)}`);}
});
test('task 10: worlds without a layout or gate skip post collisions safely', () => {
 for(const strip of [w=>{w.layout=undefined;},w=>{w.layout={};},w=>{w.layout.gate={};},w=>{w.layout.gate.posts=[null,{x:NaN,y:1,r:4}];}]){
  const w=e.createWorld();strip(w);assert.equal(e.gatePosts(w).length,0);run(w,1,input(true,false,true));assert(finite(w.car));}
 assert.equal(e.gatePosts(null).length,0);
 const w=e.createWorld();assert.equal(e.gatePosts(w).length,2);
 // Teleported onto a post (e.g. after a resize): pushed out through the nearest face, without NaN.
 const q=w.layout.gate.posts[0];Object.assign(w.car,{x:q.x,y:q.y,a:.3,vx:0,vy:0,omega:0});w.cones=[];e.step(w,input());
 assert(finite(w.car)&&depth(w,q.x,q.y,q.r)<.05);
});
test('task 10: 90-second drives through the full course stay finite and bounded at the new speeds', () => {
 for(const id of ids){const w=e.createWorld(id),p=e.PRESETS[id];
  for(let i=0;i<10800;i++){e.step(w,input(i%1800<1500,i%1800>=1500,i%1300<400,i%1300>900));
   if(i%10===0){assert(finite(w.car)&&speedOf(w.car)<=p.max*e.SPEED_CAP+1e-9&&Math.abs(w.car.omega)<=e.OMEGA_MAX+1e-9);
    for(const o of w.cones)assert(finite(o)&&speedOf(o)<=e.CONE_MAX+1e-9);
    for(const q of w.layout.gate.posts){const d=depth(w,q.x,q.y,q.r);assert(d<.05,`${id} inside a post`);for(const o of w.cones)assert(Math.hypot(o.x-q.x,o.y-q.y)>=q.r+e.CONE_R-1e-6);}}}}
});
// ---- Stage 3 (Agent 2): task 07 gate + shadows, task 09 skid marks. Rules re-stated from CONTRACT.md §6, §8, §11, §12.
const BAYER4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const INK3='48,52,45',PAPER3='191,193,177';
// Every opaque pixel of a raw raster is one of the two tones, fully opaque.
function twoTone(r,name){let n=0,ink=0;for(let j=0;j<r.data.length;j+=4)if(r.data[j+3]){const c=r.data[j]+','+r.data[j+1]+','+r.data[j+2];assert(c===INK3||c===PAPER3,name+': two tones only');assert.equal(r.data[j+3],255,name+': opaque');n++;if(c===INK3)ink++;}return {n,ink};}
// A shadow raster was filled with the shared shadowPixel: ink exactly where the 4x4 ordered dither says (SHADOW_INK of 16).
function sharedDither(r,name){const cut=Math.round(e.SHADOW_INK*16);for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){const j=(y*r.width+x)*4;if(!r.data[j+3])continue;assert.equal(r.data[j]===48,BAYER4[(x&3)+4*(y&3)]<cut,`${name}: pixel ${x},${y} is not the shared shadow dither`);}}
const keyOf=(x,y)=>x+','+y;
test('task 07: gate sprites are two-tone, cached per geometry, legs on the layout posts, opening and clearance kept', () => {
 let first=null;
 for(const {name,L} of layouts){const g=L.gate,art=e.gateArt(g),s=art.shape;
  assert.equal(e.gateArt(JSON.parse(JSON.stringify(g))),art,name+': cached, not re-rasterised');if(first)assert.equal(art,first,name+': same geometry shares one sprite set');first=art;
  const a=twoTone(art.arch,name+' arch'),p=twoTone(art.posts,name+' posts');twoTone(art.shadow,name+' shadow');
  assert(a.n>300&&p.n>200&&a.ink>a.n/2&&p.ink>p.n*.8,name+': a dark arch with solid legs');
  assert(Math.abs(s.wi*2-g.width)<1e-9,name+': inner opening');assert.equal(s.hi,g.height,name+': inner height');
  const cs=Math.cos(g.rotation),sn=Math.sin(g.rotation),pixels=opaque(art.posts,art.box.ax,art.box.ay);
  for(const q of g.posts){const x=q.x-g.x,y=(q.y-g.y)*e.K;assert(pixels.some(([px,py])=>Math.hypot(px-x,py-y)<3),name+': rotated leg at physical post');}
  for(const r of [art.arch,art.posts])for(const [x,y] of opaque(r,art.box.ax,art.box.ay)){
   let match=false;for(let k=0;k<=48;k++){const v=s.d-2*s.d*k/48,u=(x+.5+v*sn)/cs,z=(e.K*(u*sn+v*cs)-(y+.5))/e.Z;if(e.inArch(s,u,z)){match=true;break;}}
   assert(match,name+': every rotated arch pixel belongs to geometry');
  }
 }
 // Clearance (§2): every car's roof + 6 fits under the opening; every roof is under the split, so the arch top only covers cars behind.
 for(const p of Object.values(e.PRESETS)){assert(first.shape.hi>=p.roof+6);assert(e.GATE_SPLIT>p.roof);}
});
test('task 07: every car fits through the opening in both directions and never touches a post when centred', () => {
 const L=layouts[0].L,s=e.gateArt(L.gate).shape;
 for(const id of ids){const p=e.PRESETS[id];
  // Sprite pixels (heading through the gate, ±0.2 rad) stay inside the opening with 2 px to spare on each side.
  for(const base of [Math.PI/2,-Math.PI/2])for(const off of [-.2,0,.2]){const i=e.frameIndex(base+off,e.FRAMES);
   for(const [x] of frames[id][i].car)assert(x>=-s.wi+2&&x+1<=s.wi-2,`${id} heading ${(base+off).toFixed(2)}: sprite px ${x} too wide for the opening`);}
  // Driving: centred or 4 px off, straight or slightly angled, both directions: identical to a run with no posts at all.
  for(const dir of [-1,1])for(const dx of [-4,0,4])for(const da of [-.06,0,.06]){
   const w=e.createWorld(id);w.cones=[];const g=w.layout.gate,a=dir*Math.PI/2+da;
   Object.assign(w.car,{x:g.x+dx,px:g.x+dx,y:g.y-dir*(p.length/2+14),a,pa:a,vx:Math.cos(a)*p.max*.6,vy:Math.sin(a)*p.max*.6,omega:0,steer:0});
   w.car.py=w.car.y;const ghost=e.createWorld(id);ghost.cones=[];ghost.layout=undefined;Object.assign(ghost.car,{...w.car});
   for(let k=0;k<120;k++){e.step(w,input(true));e.step(ghost,input(true));}
   assert.deepEqual([w.car.x,w.car.y,w.car.vx,w.car.vy],[ghost.car.x,ghost.car.y,ghost.car.vx,ghost.car.vy],`${id} dir ${dir} dx ${dx} da ${da}: touched a post`);
   assert(dir*(w.car.y-g.y)>p.length/2,`${id}: drove through`);}
 }
});
test('task 07: gate shadow is the arch swept by LIGHT onto the ground, with the shared shadow dither', () => {
 const L=layouts[0].L,art=e.gateArt(L.gate),s=art.shape,B=art.shadowBox,px=opaque(art.shadow,B.ax,B.ay);
 sharedDither(art.shadow,'gate shadow');const {n,ink}=twoTone(art.shadow,'gate shadow');assert(Math.abs(ink/n-e.SHADOW_INK)<.05,`gate shadow density ${ink/n}`);
 // Independent forward sweep: points of the arch (legs 2r wide, beam over a rounded opening) at depth yd, height z.
 const swept=new Set();
 for(let x=-s.wo;x<=s.wo;x+=.25)for(let z=0;z<=s.ho;z+=.25)if(e.inArch(s,x,z))for(let yd=-s.d;yd<=s.d;yd+=.5)swept.add(keyOf(Math.floor(x*Math.cos(L.gate.rotation)-yd*Math.sin(L.gate.rotation)+e.LIGHT.x*z),Math.floor((x*Math.sin(L.gate.rotation)+yd*Math.cos(L.gate.rotation))*e.K+e.LIGHT.y*z)));
 const near=(set,x,y)=>{for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)if(set.has(keyOf(x+i,y+j)))return true;return false;};
 const have=new Set(px.map(([x,y])=>keyOf(x,y)));
 for(const [x,y] of px)assert(near(swept,x,y),`shadow pixel ${x},${y} not on the swept arch`);
 for(const k of swept){const [x,y]=k.split(',').map(Number);assert(near(have,x,y),`swept point ${k} missing from the shadow`);}
 // The independent rotated sweep agrees with the shadow's extent.
 const ext=extent(px),want=extent([...swept].map(k=>k.split(',').map(Number)));
 for(const k of ['l','r','t','b'])assert(Math.abs(ext[k]-want[k])<2,'rotated shadow '+k);
 // Cone shadows (upright + 16 tipped) use the same dither and fall down-right of the cone's anchor.
 for(const [r,name] of [[e.coneShadowSprite(),'upright'],...Array.from({length:16},(_,i)=>[e.coneShadowSprite(true,i*e.TAU/16),'tipped '+i])]){
  sharedDither(r,'cone shadow '+name);const q=opaque(r,10,14),cx=q.reduce((t,v)=>t+v[0]+.5,0)/q.length,cy=q.reduce((t,v)=>t+v[1]+.5,0)/q.length;
  assert(q.length>=8,`cone shadow ${name}: visible`);if(name==='upright')assert(cx>0&&cy>0,`upright cone shadow falls down-right (${cx.toFixed(2)}, ${cy.toFixed(2)})`);}
 const up=extent(opaque(e.coneShadowSprite(),10,14));assert(Math.abs(up.r-e.LIGHT.x*e.CONE_H)<=1.5&&Math.abs(up.b-e.LIGHT.y*e.CONE_H)<=1.5,`cone shadow tip at LIGHT × CONE_H (${up.r}, ${up.b})`);
});
test('task 07: depth: cars pass under the arch in both directions; a car in front is never covered by it', () => {
 for(const {name,L} of layouts.slice(0,4)){const art=e.gateArt(L.gate),gx=Math.round((L.gate.posts[0].x+L.gate.posts[1].x)/2),gy=Math.round(L.gate.posts[0].y*e.K);
  const archPx=new Set(opaque(art.arch,art.box.ax,art.box.ay).map(([x,y])=>keyOf(x+gx,y+gy)));
  for(const id of ids){const p=e.PRESETS[id],w=e.createWorld(id,makeA(name));w.cones=[];
   const place=(dx,dyWorld,a)=>{Object.assign(w.car,{x:gx+dx,px:gx+dx,y:L.gate.y+dyWorld,py:L.gate.y+dyWorld,a,pa:a});const items=e.sceneItems(w,1).sort(e.drawOrder);
    const car=items.find(o=>o.type==='car'),k=t=>items.findIndex(o=>o.type==='gate'&&o.part===t);
    const hit=frames[id][car.frame].car.filter(([x,y])=>archPx.has(keyOf(x+car.x,y+car.y))).length;return {car:items.indexOf(car),posts:k('posts'),arch:k('arch'),hit};};
   const reach=Math.hypot(p.length,p.width)/2+L.gate.posts[0].r+.5;
   for(const a of [Math.PI/2,-Math.PI/2,Math.PI/2+.3,-Math.PI/2-.3])for(const dx of [-5,0,5]){
    // Wholly in front of the gate plane: drawn over the legs, under the arch top, and no car pixel is hidden by the arch.
    const f=place(dx,reach,a);assert(f.posts<f.car&&f.car<f.arch,`${name} ${id}: order in front`);assert.equal(f.hit,0,`${name} ${id} a=${a.toFixed(2)}: car in front covered by the arch`);
    // Wholly behind: the legs and the arch both draw over it.
    const b=place(dx,-reach,a);assert(b.car<b.posts&&b.car<b.arch,`${name} ${id}: order behind`);}
   // Centred under the beam (just behind the plane): the beam covers part of the car, so it visibly passes under.
   for(const a of [Math.PI/2,-Math.PI/2])assert(place(0,-(p.length/2+2),a).hit>0,`${name} ${id}: car behind the gate is not under the arch`);
  }
 }
});
function makeA(name){const [W,H]=name.split('x').map(Number);return e.makeArena(W,H);}
test('task 07: gate drawables follow the layout (and a resize), no layout means no gate', () => {
 const w=e.createWorld('van');let gd=e.gateDrawables(w);const L=w.layout.gate;
 assert.equal(gd.length,2);assert.deepEqual(Array.from(gd,o=>o.part),['posts','arch']);
 assert.equal(gd[0].x,Math.round((L.posts[0].x+L.posts[1].x)/2));assert.equal(gd[0].y,Math.round((L.posts[0].y+L.posts[1].y)/2*e.K));assert.equal(gd[0].key,gd[0].y);assert.equal(gd[1].key,e.GATE_FRONT);
 const art=e.gateArt(L);e.resizeWorld(w,e.makeArena(234,506));gd=e.gateDrawables(w);
 assert.equal(gd[0].x,Math.round((w.layout.gate.posts[0].x+w.layout.gate.posts[1].x)/2),'gate moves with the new layout');assert.equal(e.gateArt(w.layout.gate),art,'and reuses the cached sprites');
 w.layout=undefined;assert.equal(e.gateDrawables(w).length,0);assert(!e.sceneItems(w,1).some(o=>o.type==='gate'));
 // The car drawable is the single hook for car drawing (Agent 3 extends it for roll frames).
 const v=e.createWorld('coupe'),c=e.carDrawable(v,1);assert.equal(c.type,'car');assert.equal(c.frame,e.frameIndex(v.car.a,e.FRAMES));assert.equal(c.roll,0);assert.deepEqual(c.box,e.carScreenBounds(v.p,v.car.a,0));
 // Page: shadows (car, cones, gate) all draw before the sorted drawables; gate canvases come from the cached gateArt.
 const page=scripts[0][1].split('// ---- Browser only below.')[1];
 assert(/for\(const o of drawList\)drawShadow\(o\);\s*drawList\.sort\(drawOrder\);\s*for\(const o of drawList\)drawItem\(o\);/.test(page),'§6 draw order');
 assert(/gateCanvases\.get\(art\)/.test(page)&&!/coneShade\b/.test(page),'gate canvases cached; old cone shadow gone');
});
// ---- Task 09: skid marks. recordTracks is pure; the page calls it once per physics step with the track canvas as plot.
const SKIDW={W:400,H:240};
function skidWorld(id,arena){const w=e.createWorld(id,arena);w.cones=[];w.layout=undefined;return w;}
// One step + record. Checks locality: every pixel of tyre i lies on (within 1.8 px of) that tyre's own move this step, so no
// pixel can ever belong to a line across the arena. Returns this step's pixels.
function skidStep(w,rec,inp,out,enabled=true){
 if(inp)e.step(w,inp);const prev=rec.prev&&rec.prev.map(q=>({...q})),cur=e.wheelPoints(w),px=[];
 const n=e.recordTracks(w,rec,(x,y,i)=>px.push([x,y,i]),enabled);assert.equal(n,px.length);
 for(const [x,y,i] of px){assert(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<w.arena.W&&y<w.arena.H,'pixel inside the arena');
  assert(prev,'no pixels without a previous point (a break never connects)');
  const a=prev[i],b=cur[i],dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy,t=L2?Math.max(0,Math.min(1,((x+.5-a.x)*dx+(y+.5-a.y)*dy)/L2)):0;
  assert(Math.hypot(a.x+dx*t-x-.5,a.y+dy*t-y-.5)<=1.8,`pixel ${x},${y} is off tyre ${i}'s path`);assert(Math.sqrt(L2)<=e.SKID.maxSeg,'segment length');}
 if(out)out.push(...px);return px;
}
const big=()=>e.makeArena(4000,4000);
function drive09(id,secs,ctl,arena=big()){const w=skidWorld(id,arena);if(arena.W===4000){w.car.x=2000;w.car.y=2000;w.car.px=2000;w.car.py=2000;}
 const rec=e.createTrackRecorder(),out=[];for(let i=0;i<Math.round(secs/e.STEP);i++)skidStep(w,rec,ctl(i,w),out);return {w,rec,out};}
const cruise09=(steer,frac)=>(i,w)=>({steering:typeof steer==='function'?steer(i):steer,throttle:Math.hypot(w.car.vx,w.car.vy)<frac*w.p.max?1:0,brake:0});
test('task 09: sustained slip builds before marking and brief slip cools', () => {
 const w=skidWorld('coupe',e.makeArena(400,240)),rec=e.createTrackRecorder();
 Object.assign(w.car,{x:200,y:150,a:0,vx:0,vy:60});let pixels=0;
 const tick=()=>{w.car.y+=.5;pixels+=e.recordTracks(w,rec,()=>{});};
 for(let i=0;i<24;i++)tick();assert.equal(pixels,0,'brief slip leaves no marks');
 Object.assign(w.car,{vx:60,vy:0});for(let i=0;i<12;i++)tick();assert(rec.heat<1e-9,'slip buildup cools');
 Object.assign(w.car,{vx:0,vy:60});for(let i=0;i<50;i++)tick();assert(pixels>0,'sustained slip leaves marks');
 e.breakTracks(rec);assert.equal(rec.heat,0,'break clears buildup');
});
test('wheel kickback is bounded, slip-responsive and absent at rest', () => {
 const c={state:'driving',a:0,vx:60,vy:0};assert.equal(e.wheelKickback(c,0),0);
 c.vy=40;const k=e.wheelKickback(c,0);assert.notEqual(k,0);assert(Math.abs(k)<.17);
 assert.notEqual(e.wheelKickback(c,0),e.wheelKickback(c,.05),'feedback changes over time');
 c.state='resting';assert.equal(e.wheelKickback(c,0),0);
});
test('task 09: tight turns and hard braking mark the ground; gentle driving leaves no trail', () => {
 const rep={};
 for(const id of ids){
  for(const [name,ctl] of [['straight',cruise09(0,2)],['cruise 50% steer .3',cruise09(.3,.5)],['cruise 70% steer .2',cruise09(.2,.7)],['slalom .4',cruise09(i=>Math.sin(i/70)*.4,.5)],['coast from top',(i)=>({steering:0,throttle:i<480?1:0,brake:0})]])
   assert.equal(drive09(id,7,ctl).out.length,0,`${id} ${name}: gentle driving left marks`);
  const tight=drive09(id,5,()=>({steering:1,throttle:1,brake:0})).out.length;
  const brake=drive09(id,6,(i)=>({steering:0,throttle:i<480?1:0,brake:i<480?0:1})).out.length;
  assert(tight>40,`${id}: a full-lock turn at full throttle marks (${tight})`);assert(brake>10,`${id}: a hard stop marks (${brake})`);rep[id]={tight,brake};
 }
 console.log('     skid pixels (5 s full-lock turn, hard stop from top speed):',JSON.stringify(rep));
});
test('task 09: marks are broken dots from the rear tyres only', () => {
 const {w,out}=drive09('coupe',4,()=>({steering:1,throttle:1,brake:0}));
 assert(out.some(q=>q[2]===0)&&out.some(q=>q[2]===1),'both rear tyres mark');
 // Broken: far fewer pixels than a solid line would need (dots every SKID.dot px plus a tread pixel every third dot).
 let travel=0;const rec=e.createTrackRecorder(),w2=skidWorld('coupe',big());Object.assign(w2.car,{x:2000,y:2000,px:2000,py:2000});let n=0,prev=null;
 for(let i=0;i<480;i++){e.step(w2,{steering:1,throttle:1,brake:0});const before=rec.prev;n+=e.recordTracks(w2,rec,()=>{});if(before&&rec.prev){const c=e.wheelPoints(w2);travel+=Math.hypot(c[0].x-before[0].x,c[0].y-before[0].y)+Math.hypot(c[1].x-before[1].x,c[1].y-before[1].y);}}
 assert(n>0&&n<travel*.75,`dotted, not solid: ${n} px over ${travel.toFixed(0)} px of tyre travel`);
 // Not from the front tyres or the body centre: with the car parked sideways-sliding, pixels sit at the rear axle only.
 const v=skidWorld('van',big()),r2=e.createTrackRecorder(),pts=[];Object.assign(v.car,{x:2000,y:2000,a:0,vx:0,vy:60});
 for(let i=0;i<60;i++){v.car.y+=.5;e.recordTracks(v,r2,(x,y)=>pts.push([x,y]));}
 for(const [x] of pts)assert(Math.abs(x+.5-(2000-v.p.wheelbase/2))<=1.5,'rear axle only');assert(pts.length>0);
});
test('task 09: all four edges and corners: marks clipped at the edge, no connecting lines, they resume after re-entry', () => {
 const A=e.makeArena(SKIDW.W,SKIDW.H);let total=0,afterTransfer=0;
 // Circle centres just inside each edge and each corner; the coupe drifts at full lock so its circle crosses the edge.
 const spots=[[A.W-6,A.WH/2],[6,A.WH/2],[A.W/2,A.WH-8],[A.W/2,8],[A.W-6,A.WH-8],[6,8],[A.W-6,8],[6,A.WH-8]];
 for(const [x,y] of spots)for(const id of ['coupe','compact']){const a=Math.atan2(y-A.WH/2,x-A.W/2); // heading outward
  const w=skidWorld(id,A);Object.assign(w.car,{x,y,px:x,py:y,a,pa:a});const rec=e.createTrackRecorder();let wraps=0;
  for(let i=0;i<1800;i++){const px=skidStep(w,rec,{steering:1,throttle:1,brake:0});total+=px.length;
   if(w.wraps>wraps){wraps=w.wraps;assert.equal(px.length,0,'the transfer step draws nothing');}else if(wraps)afterTransfer+=px.length;}
  assert(w.wraps>0,`${id} at ${x.toFixed(0)},${y.toFixed(0)}: crossed an edge`);}
 assert(total>2000&&afterTransfer>1000,`marks drawn and resumed after transfers (${total}, ${afterTransfer})`);
});
test('task 09: partial exit: a tyre past the edge draws nothing, both resume on re-entry with no jump (all edges)', () => {
 const A=e.makeArena(SKIDW.W,SKIDW.H);
 for(const [edge,base] of [['right',0],['left',Math.PI],['bottom',Math.PI/2],['top',-Math.PI/2]]){
  // Sliding sideways (slip 60 px/s, angle 90°) while the car is nudged out across the edge and back, 0.5 px per step.
  const w=skidWorld('van',A),rec=e.createTrackRecorder(),ux=Math.cos(base),uy=Math.sin(base);
  const cx=A.W/2+ux*(A.W/2-12),cy=(A.H/2+uy*(A.H/2-12))/e.K;let out=[],beyond=0,back=0;
  for(let i=0;i<120;i++){const s=i<60?i:120-i;Object.assign(w.car,{x:cx+ux*s*.5,y:cy+uy*s*.5/e.K,a:base,vx:-uy*60,vy:ux*60});
   const px=skidStep(w,rec,null,out),tyres=e.wheelPoints(w);
   const off=tyres.map(q=>q.x<0||q.y<0||q.x>=A.W||q.y>=A.H);if(off[0]&&off[1])beyond++;
   for(const [x,y,t] of px)assert(!off[t]||Math.hypot(x+.5-tyres[t].x,y+.5-tyres[t].y)<3,`${edge}: offscreen tyre plotted far away`);
   if(i>100)back+=px.length;}
  assert(beyond>5,`${edge}: both tyres went past the edge`);assert(back>0,`${edge}: marks resume after re-entry`);
  assert.equal(w.wraps,0,`${edge}: partial exit, no transfer`);
 }
});
test('task 09: trackBreak, recording off, a non-driving car state and a resize all split marks', () => {
 const A=e.makeArena(SKIDW.W,SKIDW.H),w=skidWorld('coupe',A),rec=e.createTrackRecorder();
 const slide=(n,dx=.6,opt={})=>{let total=0,first=null;for(let i=0;i<n;i++){w.car.x+=dx;Object.assign(w.car,{a:0,vx:0,vy:60});const px=skidStep(w,rec,null,null,opt.enabled!==false);if(i===0)first=px.length;total+=px.length;}return {total,first};};
 Object.assign(w.car,{x:150,y:150});
 assert(slide(60).total>0,'sliding marks');
 w.trackBreak=true;w.car.x+=5;let r=slide(1,0);assert.equal(r.total,0,'trackBreak: no line from the old point');assert.equal(w.trackBreak,false,'consumed');assert(slide(50).total>0,'resumes');
 r=slide(5,.6,{enabled:false});assert.equal(r.total,0,'recording off draws nothing');w.trackBreak=true;slide(1,.6,{enabled:false});assert.equal(w.trackBreak,false,'consumed while off');
 w.car.x+=5;r=slide(50);assert.equal(r.first,0,'toggle back on: no line across the gap');assert(r.total>0);
 for(const state of ['tipping','rolling','resting','recovering']){w.car.state=state;assert.equal(slide(3).total,0,state+': no marks');w.car.state='driving';w.car.x+=5;assert.equal(slide(2).first,0,state+': no line across');}
 delete w.car.state;slide(3);
 e.resizeWorld(w,e.makeArena(480,270));assert(w.trackBreak);r=slide(50);assert.equal(r.first,0,'resize: no line from the old arena');assert(r.total>0);
});
test('task 09: the track layer is bounded; clear, reset, toggle and car change keep their semantics', () => {
 // 3 minutes of hard edge-crossing driving: the recorder holds two points and a few numbers, every pixel is in the arena.
 const A=e.makeArena(SKIDW.W,SKIDW.H),w=skidWorld('coupe',A),rec=e.createTrackRecorder(),seen=new Set();let n=0;
 Object.assign(w.car,{x:A.W-10,y:A.WH/2,px:A.W-10,py:A.WH/2});
 for(let i=0;i<120*180;i++){e.step(w,{steering:Math.sin(i/300)>0?1:-.7,throttle:i%900<800?1:0,brake:i%900<800?0:1});n+=e.recordTracks(w,rec,(x,y)=>{assert(x>=0&&y>=0&&x<A.W&&y<A.H);seen.add(y*A.W+x);});}
 assert(n>5000&&seen.size<=A.W*A.H&&w.wraps>3,`long drive: ${n} px, ${seen.size} distinct, ${w.wraps} transfers`);
 assert(JSON.stringify(rec).length<200,'recorder state does not grow');
 // Page: one arena-sized canvas, rebuilt (cleared) on arena change; clear/reset/car change/toggle semantics.
 const page=scripts[0][1].split('// ---- Browser only below.')[1];
 assert(/function resetTrackLayer\(A\)\{tracks=makeCanvas\(A\.W,A\.H\)/.test(page),'one arena-sized layer');
 assert(/function clearTracks\(\)\{trackCtx\.clearRect\(0,0,tracks\.width,tracks\.height\);breakTracks\(trackRec\)/.test(page),'clear empties and breaks');
 assert(/function reset\([^)]*\)\{world=createWorld\([^;]*;[^}]*world\.trackBreak=true;[^}]*clearTracks\(\)/.test(page),'reset and car change clear the tracks');
 assert(/enabled=ui\.skids\.checked;breakTracks\(trackRec\);[^}]*world\.trackBreak=true;/.test(page)&&/if\(enabled\)ctx\.drawImage\(tracks,0,0\)/.test(page),'toggle hides, pauses and keeps retained marks');
 assert(/resizeWorld\(world,A\)[^\n]*\n\s*resetTrackLayer\(world\.arena\)/.test(page),'arena change clears the layer');
 assert(/function addTracks\(\)\{trackPixels\+=recordTracks\(world,trackRec,plotTrack,enabled\);\}/.test(page)&&/step\(world,controls\.sample\(\)\);addTracks\(\);/.test(page),'recorded once per physics step');
});
// ---- Task 11 (Agent 3): rollover physics, roll frames and recovery ----
// open(id): no edges in reach, no cones, no posts: pure handling. Uses the cached task 10 worlds.
const open = id => { const w=fresh(id); w.cones=[]; w.layout=undefined; w.arena=e.makeArena(80000,48000); Object.assign(w.car,{x:40000,y:30000,px:40000,py:30000}); return w; };
const ST = s => ({driving:'d',tipping:'t',rolling:'r',resting:'s',recovering:'v'})[s];
// Steps a world; returns the state sequence (repeats collapsed) and the peak |load|. `each` runs after every step.
function ride(w,steps,inp,each){let seq=ST(w.car.state),peak=0;
 for(let i=0;i<steps;i++){const before=w.car.state;w.trackBreak=false;e.step(w,typeof inp==='function'?inp(i,w):inp);const c=w.car;peak=Math.max(peak,Math.abs(c.load));
  if(c.state!==before){seq+=ST(c.state);if(c.state==='tipping'||c.state==='rolling')assert(w.trackBreak,`${c.state} start breaks tracks`);}
  if(each)each(w,i);}
 return {seq:seq.replace(/(.)\1+/g,'$1'),peak};}
// Top speed (fraction f), full lock one way for T seconds, then full lock the other way (a "fishhook" / flick).
function flick(id,T,dir=1,f=1){const w=open(id);Object.assign(w.car,{a:0,vx:w.p.max*f,vy:0});const n=Math.round(T/e.STEP);return {w,inp:i=>({steering:(i<n?-dir:dir),throttle:1,brake:0})};}
const fwd11 = w => w.car.vx*Math.cos(w.car.a)+w.car.vy*Math.sin(w.car.a);
const near = (a,b,eps=1e-9) => Math.abs(a-b)<=eps;
test('task 11: presets carry roll fields; the Van is the most roll-prone and the Coupe the least', () => {
 const index={};
 for(const id of ids){const p=e.PRESETS[id];assert(p.comHeight>0&&p.comHeight<p.roof&&p.rollThreshold>=1,id);
  // Static rollover index: the largest steady cornering load (tyres saturate at grip) over the wheels-lift threshold.
  index[id]=p.grip*e.rollKappa(p)/p.rollThreshold;assert(index[id]<.75,`${id}: steady cornering can never lift a wheel (${index[id].toFixed(2)})`);}
 assert(index.van>index.compact&&index.compact>index.coupe,JSON.stringify(index));
 const h=Object.fromEntries(ids.map(id=>[id,e.PRESETS[id].comHeight]));assert(h.van>h.compact&&h.compact>h.coupe,'centre of mass: van highest, coupe lowest');
 const w=e.createWorld();assert.equal(w.car.state,'driving');assert.equal(w.car.roll,0);assert.deepEqual([...e.CAR_STATES],['driving','tipping','rolling','resting','recovering']);
 console.log('     static rollover index (steady load / threshold):',JSON.stringify(Object.fromEntries(Object.entries(index).map(([k,v])=>[k,+v.toFixed(2)]))));
});
test('task 11: low-speed full-lock turns, slaloms and reversals never flip any car', () => {
 const worst={};
 for(const id of ids){const thr=e.PRESETS[id].rollThreshold;let peak=0;
  for(const v of [15,30,45,50]){
   for(const s of [-1,1]){const w=open(id);Object.assign(w.car,{a:0,vx:v,vy:0});const r=ride(w,360,(i,w)=>({steering:s,throttle:fwd11(w)<v?1:0,brake:0}));assert.equal(r.seq,'d',`${id} ${v} steady`);peak=Math.max(peak,r.peak);}
   for(const per of [.4,.8,1.2,1.6,2]){const w=open(id),n=Math.round(per/e.STEP);Object.assign(w.car,{a:0,vx:v,vy:0});
    const r=ride(w,720,(i,w)=>({steering:(i%n)<n/2?-1:1,throttle:fwd11(w)<v?1:0,brake:0}));assert.equal(r.seq,'d',`${id} ${v} slalom ${per}`);peak=Math.max(peak,r.peak);}}
  // From rest, full lock and full throttle: the turn tightens and speeds up, but the load builds smoothly.
  for(const s of [-1,1]){const w=open(id);const r=ride(w,1200,{steering:s,throttle:1,brake:0});assert.equal(r.seq,'d',`${id} circling`);}
  assert(peak<.75*thr,`${id}: low-speed load ${peak.toFixed(2)} vs threshold ${thr}`);worst[id]=+peak.toFixed(2);}
 console.log('     peak load at <= 50 px/s (thresholds 1-1.2):',JSON.stringify(worst));
});
test('task 11: drifting stays possible: the coupe slides at full lock and never tips', () => {
 const w=empty('coupe');let seq='';run(w,2,input(true));for(let i=0;i<180;i++){e.step(w,input(true,false,false,true));seq+=ST(w.car.state);}
 assert(w.car.slip>6&&w.car.skidding&&!/[trsv]/.test(seq),'the stage 1 drift test, still driving');
 for(const s of [-1,1]){const d=open('coupe');Object.assign(d.car,{a:0,vx:d.p.max,vy:0});let slip=0;
  const r=ride(d,480,{steering:s,throttle:1,brake:0},w=>{slip=Math.max(slip,w.car.slip);});assert.equal(r.seq,'d');assert(slip>100&&d.car.skidding,`coupe slides (${slip.toFixed(0)} px/s)`);}
 // Even a resonant slalom or a hard flick at the coupe's top speed keeps all four wheels down.
 for(const per of [1,1.4,2]){const d=open('coupe'),n=Math.round(per/e.STEP);Object.assign(d.car,{a:0,vx:d.p.max,vy:0});assert.equal(ride(d,1200,i=>({steering:(i%n)<n/2?-1:1,throttle:1,brake:0})).seq,'d');}
 for(const T of [.4,.7,1.5]){const {w:d,inp}=flick('coupe',T);assert.equal(ride(d,600,inp).seq,'d');}
});
test('task 11: sustained aggressive cornering rolls the Van through driving > tipping > rolling > resting', () => {
 const thr=e.PRESETS.van.rollThreshold;
 for(const dir of [1,-1]){const {w,inp}=flick('van',.6,dir);let tipRoll=[],firstRoll=null,restT=null;
  const r=ride(w,1200,inp,(w,i)=>{const c=w.car;
   if(c.state==='driving'||c.state==='recovering')assert.equal(c.roll,0,'upright while driving');
   if(c.state==='tipping'){tipRoll.push(c.roll);assert(Math.abs(c.roll)>=e.TIP_MIN-1e-9&&Math.abs(c.roll)<=e.tipAngle(w.p)+1e-9);}
   if(c.state==='rolling'&&firstRoll===null)firstRoll=c.roll;
   if(c.state==='resting'&&restT===null)restT=i;});
  assert.equal(r.seq,'dtrs',`van flick ${dir}: ${r.seq}`);
  // Turning hard toward +dir loads the wheels on the -dir side: the van tips and rolls that way.
  assert(tipRoll.length>0&&tipRoll.every(x=>Math.sign(x)===-dir)&&Math.sign(firstRoll)===-dir,'rolls toward the outside of the final turn');
  const c=w.car;assert.equal(c.vx,0);assert.equal(c.vy,0);assert.equal(c.omega,0);
  assert([Math.PI/2,-Math.PI/2,Math.PI].some(a=>near(c.roll,a)),`rests on a side or the roof (${c.roll})`);
  assert(e.canRecover(w)&&restT<1100,'settles within a few seconds');}
 // A sustained slalom at top speed also rolls it; one full-lock turn at top speed (no reversal) does not even lift a wheel.
 for(const per of [1.4,2]){const w=open('van'),n=Math.round(per/e.STEP);Object.assign(w.car,{a:0,vx:w.p.max,vy:0});assert(/r/.test(ride(w,1200,i=>({steering:(i%n)<n/2?-1:1,throttle:1,brake:0})).seq),'slalom '+per);}
 for(const s of [-1,1]){const w=open('van');Object.assign(w.car,{a:0,vx:w.p.max,vy:0});const r=ride(w,600,{steering:s,throttle:1,brake:0});assert.equal(r.seq,'d');assert(r.peak<thr*.95,`single turn peak ${r.peak}`);}
 // Hysteresis: a too-short flick lifts the wheels, then the van lands again without rolling.
 const lands=[.2,.25,.3,.35].map(T=>{const {w,inp}=flick('van',T);return ride(w,600,inp).seq;});assert(lands.includes('dtd'),'a tip that lands: '+lands);
 // The same flick never rolls the compact or the coupe.
 for(const id of ['compact','coupe'])for(const T of [.3,.6,1,1.5])for(const dir of [1,-1]){const {w,inp}=flick(id,T,dir);assert(!/r/.test(ride(w,600,inp).seq),`${id} flick ${T}`);}
});
test('task 11: a strong sideways post hit rolls a susceptible car; light or straight hits do not', () => {
 const out={};
 function broadside(id,v){const w=open(id),p=w.p;w.layout={gate:{posts:[{x:40000,y:30000+p.width/2+4+3,r:4}]}};Object.assign(w.car,{a:0,vx:0,vy:v});
  const q=w.layout.gate.posts[0];let rollAt=null;const r=ride(w,720,{steering:0,throttle:0,brake:0},w=>{assert(finite(w.car)&&depth(w,q.x,q.y,q.r)<.05,'stays out of the post');if(w.car.state==='rolling'&&rollAt===null)rollAt=w.car.roll;});
  return {seq:r.seq,peak:r.peak,rollAt};}
 // Van sliding sideways into a post at 100 px/s trips over it (toward the post side, +y = its right).
 let b=broadside('van',100);assert.equal(b.seq,'dtrs');assert(b.rollAt>0,'trips toward the post');out.van100=b.seq;
 b=broadside('van',40);assert.equal(b.seq,'d');out.van40=b.seq;
 b=broadside('compact',150);assert(/r/.test(b.seq),'compact at 150');out.compact150=b.seq;
 b=broadside('compact',80);assert.equal(b.seq,'d');out.compact80=b.seq;
 b=broadside('coupe',100);assert.equal(b.seq,'d');out.coupe100=b.seq;
 // Driving straight into a post at top speed (head-on or clipping it) stops or spins the car but never tips it.
 for(const id of ids){const p=e.PRESETS[id];for(const off of [0,p.width/4,p.width/2]){const w=lane(id),q=w.layout.gate.posts[0];aim(w,q,.3,off,p.max);assert.equal(ride(w,240,input(true)).seq,'d',`${id} straight hit ${off}`);}}
 console.log('     broadside post hits:',JSON.stringify(out));
});
test('task 11: light mass alone never flips a car', () => {
 // Cornering load does not depend on mass: a car 7x lighter or 3x heavier has exactly the same load trace.
 for(const id of ids)for(const k of [.15,3]){const a=open(id),b=open(id);b.p={...b.p,mass:b.p.mass*k};
  for(const w of [a,b])Object.assign(w.car,{a:0,vx:w.p.max,vy:0});
  for(let i=0;i<480;i++){const s={steering:i<90?-1:1,throttle:1,brake:0};e.step(a,s);e.step(b,s);assert.equal(a.car.load,b.car.load);assert.equal(a.car.state,b.car.state);}}
 // Very light compact and coupe thrash the whole course (cones and posts) for 60 s: lots of hits, never a roll.
 for(const id of ['compact','coupe']){const w=e.createWorld(id);w.p={...w.p,mass:w.p.mass*.15};let seq='';
  for(let i=0;i<7200;i++){e.step(w,input(i%1800<1500,i%1800>=1500,i%1300<400,i%1300>900));if(i%6===0)seq+=ST(w.car.state);}
  assert(!/[rs]/.test(seq)&&w.hits>3,`light ${id}: ${w.hits} hits, states ${[...new Set(seq)].join('')}`);}
});
test('task 11: inputs have no effect while tipping, rolling, resting or recovering', () => {
 const {w,inp}=flick('van',.6);let i=0;while(w.car.state==='driving'&&i<600)e.step(w,inp(i++));assert.equal(w.car.state,'tipping');
 const clone=x=>({...x,car:{...x.car},cones:x.cones.map(o=>({...o}))});
 const worlds=[clone(w),clone(w),clone(w)],inputs=[{steering:0,throttle:0,brake:0},{steering:-1,throttle:1,brake:0},{steering:1,throttle:0,brake:1}];
 const seen=new Set();
 for(let k=0;k<720;k++){worlds.forEach((x,j)=>e.step(x,inputs[j]));seen.add(worlds[0].car.state);
  for(const x of worlds.slice(1))assert.deepEqual(x.car,worlds[0].car,'identical whatever the input, step '+k);}
 assert.deepEqual([...seen].sort(),['resting','rolling','tipping']);
 // A resting car with the throttle held does not move.
 const r=worlds[1],x0=r.car.x;run(r,1,input(true,false,true));assert.equal(r.car.x,x0);
 // After recovery: inputs are ignored for RECOVER_TIME (the car stays put), then the car drives normally.
 const v=e.createWorld('van');Object.assign(v.car,{state:'resting',roll:Math.PI});assert(e.recover(v));const p0={x:v.car.x,y:v.car.y};let t=0;
 while(v.car.state==='recovering'){e.step(v,input(true,false,true));t+=e.STEP;assert.equal(v.car.x,p0.x);assert.equal(v.car.y,p0.y);}
 assert(t>=e.RECOVER_TIME-1e-9&&t<e.RECOVER_TIME+e.STEP&&v.car.state==='driving');run(v,.5,input(true));assert(fwd11(v)>10,'drives after recovery');
});
// Checks a recovered car against contract §4/§5/§11: upright and still, box ≥ 4 px inside, anchor outside the edge strip,
// off the control zones, clear of every cone and post, interpolation reset, tracks broken.
function checkRecovered(w,name){const c=w.car,A=w.arena,b=e.carScreenBounds(w.p,c.a,0),x=c.x,y=c.y*e.K,E=edgeOf(A);
 assert.equal(c.state,'recovering',name);assert(w.trackBreak,name+': trackBreak');
 for(const k of ['roll','vx','vy','omega','steer','load','loadRate','rollRate'])assert.equal(c[k],0,name+': '+k);
 assert(c.px===c.x&&c.py===c.y&&c.pa===c.a,name+': interpolation reset');
 assert(x+b.l>=4&&y+b.t>=4&&x+b.r<=A.W-4&&y+b.b<=A.H-4,`${name}: box inside by 4 px`);assert(x>=E&&y>=E&&x<=A.W-E&&y<=A.H-E,name+': outside the edge strip');
 for(const z of e.controlZones(A,A.safe))assert(!(x+b.r>z.l&&x+b.l<z.r&&y+b.b>z.t&&y+b.t<z.b),`${name}: car box on the ${z.id} zone`);
 for(const o of w.cones)assert(depth(w,o.x,o.y,e.CONE_R)<=-e.RECOVER_GAP+1e-9,name+': inside a cone');
 for(const q of e.gatePosts(w))assert(depth(w,q.x,q.y,q.r)<=-e.RECOVER_GAP+1e-9,name+': inside a post');
 assert(!e.canRecover(w),name+': nothing left to recover');
 // The next step touches nothing: every cone at rest stays exactly where it was (cones still sliding from a crash may move).
 const cones=w.cones.map(o=>[o.x,o.y,o.vx===0&&o.vy===0]);e.step(w,input());w.cones.forEach((o,i)=>assert(!cones[i][2]||(o.x===cones[i][0]&&o.y===cones[i][1]),name+': a resting cone was hit'));}
const restAt=(w,x,y,a=w.car.a,roll=Math.PI)=>{Object.assign(w.car,{x,y,px:x,py:y,a,pa:a,vx:0,vy:0,omega:0,state:'resting',roll});w.trackBreak=false;};
test('task 11: canRecover and recover: settled, near edges, invisible in the margin, near posts and cones', () => {
 const A=e.DEFAULT_ARENA;
 // Not offered while driving (visible), tipping, rolling (visible) or recovering; recover() then changes nothing.
 for(const s of ['driving','tipping','rolling','recovering']){const w=fresh('van');w.car.state=s;const before=JSON.stringify(w.car);assert(!e.canRecover(w),s);assert.equal(e.recover(w),false);assert.equal(JSON.stringify(w.car),before);}
 // Settled overturned in the open: righted in (almost) the same place.
 for(const id of ids){const w=fresh(id),s=w.layout.spawn;restAt(w,s.x,s.y,s.a);assert(e.canRecover(w));assert(e.recover(w));checkRecovered(w,id+' open');
  assert(Math.hypot(w.car.x-s.x,(w.car.y-s.y)*e.K)<=2,id+': nearest spot is where it lay');assert(Math.abs(e.angleDelta(w.car.a,s.a))<1e-9,'keeps its heading');}
 // Reached through real physics: the van rolls on the real course, then is righted.
 {const w=fresh('van'),s=w.layout.spawn;Object.assign(w.car,{a:s.a,vx:Math.cos(s.a)*w.p.max,vy:Math.sin(s.a)*w.p.max});const n=72;let i=0;
  while(!e.canRecover(w)&&i<1200){e.step(w,{steering:i<n?-1:1,throttle:1,brake:0});i++;}assert(e.canRecover(w),'the van ends recoverable');w.trackBreak=false;assert(e.recover(w));checkRecovered(w,'after a real roll');}
 // Hanging half over every edge and corner (partly offscreen), every car, several headings.
 for(const id of ids)for(const [fx,fy] of [[0,.5],[1,.5],[.5,0],[.5,1],[0,0],[1,1],[1,0],[0,1]])for(const a of [0,1,2.5]){
  const w=fresh(id);w.car.a=a;const b=e.carScreenBounds(w.p,a,Math.PI),x=fx===0?-(b.l+b.r)*.5:fx===1?A.W-(b.l+b.r)*.5:A.W*fx,y=fy===0?-(b.t+b.b)*.5:fy===1?A.H-(b.t+b.b)*.5:A.H*fy;
  restAt(w,x,y/e.K,a);assert(visible(w));assert(e.canRecover(w));assert(e.recover(w));checkRecovered(w,`${id} edge ${fx},${fy} a ${a}`);}
 // Invisible: a driving car whose whole box sits inside the 2 px transfer margin past an edge. It has not transferred,
 // so it would stay hidden; recovery is offered and brings it fully on screen.
 for(const id of ids)for(const [edge,base,axis,sign] of EDGES){const w=fresh(id);w.car.a=base+.2;const b=e.carScreenBounds(w.p,w.car.a,0);
  if(axis==='x'){w.car.x=sign>0?A.W-b.l+1:-b.r-1;w.car.y=A.WH/2;}else{w.car.x=A.W/2;w.car.y=(sign>0?A.H-b.t+1:-b.b-1)/e.K;}
  w.car.px=w.car.x;w.car.py=w.car.y;e.transferEdges(w);assert.equal(w.wraps,0,'inside the margin: not transferred');assert(!visible(w));
  assert(e.canRecover(w),id+' '+edge+': invisible car is recoverable');w.trackBreak=false;assert(e.recover(w));checkRecovered(w,`${id} hidden ${edge}`);}
 // Lying against (even across) a gate post, and on top of cones of the course.
 for(const id of ids)for(const k of [0,1])for(const [dx,dy] of [[0,0],[3,0],[-6,2],[0,-5]]){const w=fresh(id),q=w.layout.gate.posts[k];restAt(w,q.x+dx,q.y+dy,.4,Math.PI/2);assert(e.recover(w));checkRecovered(w,`${id} post ${k} ${dx},${dy}`);}
 for(const id of ids){const count=fresh(id).cones.length;for(let k=0;k<count;k+=3){const w=fresh(id),o=w.cones[k];restAt(w,o.x+2,o.y-1,k*.3,-Math.PI/2);assert(e.recover(w));checkRecovered(w,`${id} cone ${k}`);}}
 // Knocked-over cones scattered round the car: still finds a clear spot.
 {const w=fresh('van'),s=w.layout.spawn;w.cones.forEach((o,i)=>{o.x=s.x+((i%5)-2)*9;o.y=s.y+(Math.floor(i/5)-2)*9;});restAt(w,s.x,s.y,s.a);assert(e.recover(w));checkRecovered(w,'among scattered cones');}
 // No clear spot anywhere (cones every 20 px leave gaps narrower than any car): falls back to the layout spawn, upright.
 {const w=fresh('compact'),s=w.layout.spawn;w.cones=[];for(let x=0;x<A.W;x+=20)for(let y=0;y<A.WH;y+=20)w.cones.push({x,y,vx:0,vy:0,a:0,omega:0,tipped:false});
  restAt(w,50,50);assert(e.recover(w));assert.deepEqual([w.car.x,w.car.y,w.car.a,w.car.state,w.car.roll],[s.x,s.y,s.a,'recovering',0]);assert(w.trackBreak);}
});
test('task 11: recovery is valid anywhere on (and just off) the course, on every arena shape', () => {
 let n=0;
 for(const [W,H] of [[400,240],[234,506],[506,234],[480,270]]){const A=e.makeArena(W,H),base=e.createWorld('van',A);
  for(const id of ids)for(let gx=0;gx<4;gx++)for(let gy=0;gy<3;gy++){const w={...base,id,p:e.PRESETS[id],car:{...base.car},cones:base.cones.map(o=>({...o})),trackBreak:false};
   const x=-20+(W+40)*gx/3,y=(-20+(H+40)*gy/2)/e.K;restAt(w,x,y,gx*1.3+gy);assert(e.recover(w));checkRecovered(w,`${W}x${H} ${id} ${gx},${gy}`);n++;}}
 console.log(`     ${n} recoveries checked on 4 arenas`);
});
test('task 11: every roll-frame and roll-shadow pixel lies inside carScreenBounds(roll) and its raster', () => {
 const roll=k=>k?k*e.TAU/e.ROLL_STEPS:e.TAU; // a non-zero roll that selects frame k
 for(let k=0;k<e.ROLL_STEPS;k++)assert.equal(e.rollFrame(roll(k)),k);
 assert.deepEqual([Math.PI/2,Math.PI,-Math.PI/2,-Math.PI,e.TIP_MIN,-e.TIP_MIN].map(e.rollFrame),[3,6,9,6,1,11]);
 const slack={};
 for(const id of ids){const p=e.PRESETS[id],s=e.rollSpriteBox(p),box={size:s.size+2*PAD,ax:s.ax+PAD,ay:s.ay+PAD};let worst=0;
  for(let i=0;i<e.FRAMES;i++){
   // One box for every roll value at this heading, so the box never changes while the car tumbles.
   const b0=e.carScreenBounds(p,i*e.TAU/e.FRAMES,1);for(const r of [-3,.3,Math.PI,5])assert.deepEqual({...e.carScreenBounds(p,i*e.TAU/e.FRAMES,r)},{...b0});
   let ext=null;
   for(let k=0;k<e.ROLL_STEPS;k++){const a=i*e.TAU/e.FRAMES,car=opaque(e.carRollSprite(p,a,k,box),box.ax,box.ay),sh=opaque(e.carRollShadow(p,a,k,box),box.ax,box.ay);
    assert(car.length>120&&sh.length>40,`${id} roll ${k} frame ${i} renders`);
    // Ground-anchored: the shadow covers the ground under the car's anchor.
    assert(sh.some(([x,y])=>Math.abs(x)<=1&&Math.abs(y)<=1),`${id} roll ${k} frame ${i}: shadow not under the car`);
    const px=[...car,...sh];
    // Inside the box for any heading within half a frame of this one (the intersection of those boxes), and in the raster.
    const bs=[0,-.49,.49].map(off=>e.carScreenBounds(p,(i+off)*e.TAU/e.FRAMES,roll(k))),b={l:Math.max(...bs.map(q=>q.l)),t:Math.max(...bs.map(q=>q.t)),r:Math.min(...bs.map(q=>q.r)),b:Math.min(...bs.map(q=>q.b))};
    for(const [x,y] of px){assert(x>=b.l&&x+1<=b.r&&y>=b.t&&y+1<=b.b,`${id} roll ${k} frame ${i} pixel ${x},${y} outside ${JSON.stringify(b)}`);
     assert(x+s.ax>=0&&x+s.ax<s.size&&y+s.ay>=0&&y+s.ay<s.size,`${id} roll ${k} frame ${i} clipped by its raster`);}
    const q=extent(px);ext=ext?{l:Math.min(ext.l,q.l),t:Math.min(ext.t,q.t),r:Math.max(ext.r,q.r),b:Math.max(ext.b,q.b)}:q;}
   worst=Math.max(worst,ext.l-b0.l,b0.r-ext.r,ext.t-b0.t,b0.b-ext.b);}
  slack[id]=worst;assert(worst<=4,`${id} roll bounds are loose by ${worst}px`);}
 // Two tones, opaque, and the shadow uses the shared dither density.
 for(const id of ids)for(const k of [1,3,6,9]){const p=e.PRESETS[id],s=e.carRollShadow(p,.7,k),car=e.carRollSprite(p,.7,k);let ink=0,n=0;
  for(const img of [s,car])for(let j=0;j<img.data.length;j+=4)if(img.data[j+3]){const c=[img.data[j],img.data[j+1],img.data[j+2]].join();assert(c==='48,52,45'||c==='191,193,177');assert.equal(img.data[j+3],255);if(img===s){n++;if(c==='48,52,45')ink++;}}
  assert(Math.abs(ink/n-e.SHADOW_INK)<.06,`roll shadow density ${ink/n}`);}
 // The roof frame looks different from the upright car (the underside and the tyres are on top).
 for(const id of ids){const p=e.PRESETS[id],up=e.carSprite(p,.7,e.rollSpriteBox(p)),roof=e.carRollSprite(p,.7,6);let diff=0;for(let j=0;j<up.data.length;j+=4)if(up.data[j]!==roof.data[j]||up.data[j+3]!==roof.data[j+3])diff++;assert(diff>200,id+' roof frame differs');}
 console.log('     max roll-bounds slack per side (px):',JSON.stringify(slack),'roll raster sizes:',JSON.stringify(Object.fromEntries(ids.map(id=>[id,e.rollSpriteBox(e.PRESETS[id]).size]))));
});
test('task 11: a rolling car transfers across an edge once, with its roll box, and never flip-flops', () => {
 const A=e.DEFAULT_ARENA;
 for(const id of ids)for(const [edge,base,axis,sign] of EDGES){const w=empty(id);w.car.a=base+.5;
  const b=e.carScreenBounds(w.p,w.car.a,1);
  if(axis==='x'){w.car.x=sign>0?A.W-b.l-3:-b.r+3;w.car.y=A.WH/2;}else{w.car.x=A.W/2;w.car.y=(sign>0?A.H-b.t-3:-b.b+3)/e.K;}
  Object.assign(w.car,{px:w.car.x,py:w.car.y,vx:Math.cos(base)*90,vy:Math.sin(base)*90,state:'rolling',roll:1,rollRate:7});
  let events=0;for(let i=0;i<600;i++){const before=w.wraps;e.step(w,input(true));if(w.wraps>before){events++;
   const q=sbox(w),near=axis==='x'?(sign>0?q.r:A.W-q.l):(sign>0?q.b:A.H-q.t);assert(near>=TM-1e-9&&near<TM+2,`${id} ${edge}: re-enters at the overshoot (${near})`);}
   assert(finite(w.car));}
  assert.equal(events,1,`${id} ${edge}: one transfer`);assert(['resting','driving'].includes(w.car.state),w.car.state);}
});
test('task 11: fixed-step results with rollovers and a recovery are identical at 30/60/120/144 Hz', () => {
 function simulation(hz){const w=fresh('van'),s=w.layout.spawn;Object.assign(w.car,{a:s.a,vx:Math.cos(s.a)*w.p.max,vy:Math.sin(s.a)*w.p.max});
  let acc=0,ticks=0,seq='d',recovered=0;
  for(let frame=0;frame<hz*9;frame++){acc+=1/hz;
   // The page calls recover() between frames; here at the first frame after tick 700 where it is offered.
   if(ticks>700&&!recovered&&e.canRecover(w)){e.recover(w);recovered=ticks;}
   while(acc+1e-12>=e.STEP){e.step(w,{steering:ticks<72?-1:ticks<400?1:ticks>900?-1:0,throttle:ticks<400||ticks>850?1:0,brake:0});acc-=e.STEP;ticks++;if(ST(w.car.state)!==seq[seq.length-1])seq+=ST(w.car.state);}}
  return {seq,recovered,state:[ticks,w.car.x,w.car.y,w.car.a,w.car.vx,w.car.vy,w.car.roll,w.car.load,w.car.state]};}
 const ref=simulation(60);assert(/dtrs/.test(ref.seq)&&/vd/.test(ref.seq),'the run rolls, rests, recovers and drives: '+ref.seq);
 for(const hz of [30,120,144]){const r=simulation(hz);assert.equal(r.seq,ref.seq);r.state.forEach((n,i)=>assert(typeof n==='string'?n===ref.state[i]:Math.abs(n-ref.state[i])<1e-8,`${hz} Hz differs at ${i}`));}
});
test('task 11: two-minute drives with rollovers and recoveries stay finite, bounded and out of the posts', () => {
 const big={};for(const id of ids){const p=e.PRESETS[id];let bw=0,bh=0;for(const roll of [0,1])for(let i=0;i<256;i++){const b=e.carScreenBounds(p,i*e.TAU/256,roll);bw=Math.max(bw,b.r-b.l);bh=Math.max(bh,b.b-b.t);}big[id]={bw,bh};}
 const report={};
 for(const id of ids){const w=e.createWorld(id),p=w.p,{bw,bh}=big[id];let rolls=0,tips=0,recoveries=0,prev='driving',rest=0;
  for(let i=0;i<14400;i++){
   // Aggressive: every 4 s a 2 s run-up, then a fishhook (0.6 s full lock one way, 1.2 s the other), alternating sides,
   // flat out; every fifth cycle brakes hard through the fishhook instead.
   const k=i%480,dir=Math.floor(i/480)%2?1:-1,brake=Math.floor(i/480)%5===4&&k>=240;
   e.step(w,{steering:k<240?0:k<312?-dir:k<456?dir:0,throttle:brake?0:1,brake:brake?1:0});
   const c=w.car;if(c.state!==prev){if(c.state==='tipping')tips++;if(c.state==='rolling')rolls++;prev=c.state;}
   // The player rights the car half a second after it is offered.
   if(e.canRecover(w)){if(++rest>60){assert(e.recover(w));recoveries++;rest=0;}}else rest=0;
   assert(e.CAR_STATES.includes(c.state),'state '+c.state);
   assert(finite(c)&&[c.roll,c.load,c.loadRate,c.rollRate].every(Number.isFinite),id+' finite at '+i);
   assert(speedOf(c)<=p.max*e.SPEED_CAP+1e-9&&Math.abs(c.omega)<=e.OMEGA_MAX+1e-9,id+' bounded');
   assert(c.x>=-bw&&c.x<=w.arena.W+bw&&c.y*e.K>=-bh&&c.y*e.K<=w.arena.H+bh,id+' left the envelope');
   if((c.state==='driving'||c.state==='recovering')&&c.roll!==0)assert.fail('roll must be 0 when upright');
   if(i%10===0){for(const q of w.layout.gate.posts)assert(depth(w,q.x,q.y,q.r)<.05,id+' inside a post');for(const o of w.cones)assert(finite(o)&&speedOf(o)<=e.CONE_MAX+1e-9);}}
  report[id]={tips,rolls,recoveries,wraps:w.wraps,hits:w.hits};}
 assert(report.van.rolls>=3&&report.van.recoveries>=3,'the van rolls and is recovered repeatedly');assert(report.coupe.rolls===0||report.coupe.hits>0,'Supercar rolls only in a drive with course impacts');
 console.log('     2-minute aggressive drives:',JSON.stringify(report));
});

test('round 2: tuning interface clamps, snaps and resets', () => {
 const before={...e.TUNING};const out=e.setTuning({grip:99,steerAngle:.731,nope:1,turnRate:'x'});
 assert.equal(out.grip,2);assert.equal(out.steerAngle,.75);assert.equal(out.turnRate,before.turnRate);assert(!('nope' in e.TUNING));
 e.resetTuning();assert.deepEqual({...e.TUNING},{...e.TUNING_DEFAULTS});
 for(const s of e.TUNING_SPEC)assert(s.def>=s.min&&s.def<=s.max&&s.step>0,s.key+' default inside its range');
});

// ==== Round 2 tests: sim + course (r2-sim adds its new tests below this line) ====
// (end of r2-sim section)

// ==== Round 2 tests: ui (r2-ui adds its new tests below this line) ====
// (end of r2-ui section)

// ==== Round 2 tests: ground paint (r2-paint adds its new tests below this line) ====
// Pixel helpers: a run list [x, y, n] → Set of "x,y" keys; byText picks layout items by their text.
const paintPixels=runs=>{const s=new Set();for(const [x,y,n] of runs)for(let i=0;i<n;i++)s.add(x+i+','+y);return s;};
const paintText=L=>L.items.filter(i=>i.t==='text').map(i=>i.s);
const paintKey=(L,ch)=>L.items.find(i=>i.t==='key'&&i.ch===ch);
test('round 2 paint: 1-bit masks are sheared into italics and painted as horizontal stripes', () => {
 const m=e.glyphMask('W',11);assert.equal(m.h,11);assert(m.w>=8,'heavy, wide fallback glyph');assert(m.bits.every(b=>b===0||b===1));
 const s=e.shearMask(m),row=(k,y)=>Array.from(k.bits.subarray(y*k.w,(y+1)*k.w)).indexOf(1);
 assert.equal(s.w,m.w+5,'top row leans right by (h-1)/2');assert.equal(row(s,10),row(m,10),'bottom row stays put');assert.equal(row(s,0),row(m,0)+5);
 assert.equal(s.bits.reduce((a,b)=>a+b,0),m.bits.reduce((a,b)=>a+b,0),'shear moves pixels, never adds or drops them');
 const striped=e.maskRuns(s,10,20),solid=e.maskRuns(s,10,20,[],1);
 assert(striped.length&&striped.every(([,y])=>y%2===0),'only every other ground row is painted');
 assert.equal(paintPixels(solid).size,s.bits.reduce((a,b)=>a+b,0),'solid runs cover the mask exactly');
 for(const p of paintPixels(striped))assert(paintPixels(solid).has(p),'stripes are a subset of the glyph');
 assert.deepEqual(e.maskRuns(s,10,21).map(r=>r[1]%2),e.maskRuns(s,10,21).map(()=>0),'stripe phase is tied to the ground, not the item');
 assert(e.glyphMask('·',9).bits.every(b=>!b),'no separator glyphs');
});
test('round 2 paint: keycaps are 2.5D, extruded toward the shadow side (down-right)', () => {
 const px=paintPixels(e.keycapRuns(50,40,24,20,3)),at=(x,y)=>px.has(x+','+y);
 for(const p of px){const [x,y]=p.split(',').map(Number);assert(x>=50&&y>=40&&x<50+24+3&&y<40+20+3,'inside the face plus its extrusion');}
 assert(at(51,40)&&at(72,40)&&!at(50,40)&&!at(73,40),'top edge with rounded corners, no side above the face');
 assert(at(50,45)&&!at(51,45)&&!at(60,50),'left outline, paper face inside');
 for(let x=73;x<=76;x++)assert(at(x,50),'solid side on the right');for(let y=60;y<=62;y++)assert(at(62,y),'solid side below');
 assert(!at(49,50)&&!at(60,39),'nothing up or left of the face');
});
test('round 2 paint: keyboard layout is W above S and A S D in a row, with labels; the Supercar adds Q / E', () => {
 for(const shift of [false,true]){
  const L=e.paintLayout(240,120,{shift}),A=paintKey(L,'A'),S=paintKey(L,'S'),D=paintKey(L,'D'),W=paintKey(L,'W'),txt=paintText(L);
  assert(L.w<=240&&L.h<=120&&['side','under'].includes(L.mode),'labelled keycaps fit a large zone');assert(A.w>=24,'keys stay big: '+A.w);
  assert(A.y===S.y&&S.y===D.y&&A.x+A.w+A.d<S.x&&S.x+S.w+S.d<D.x,'A S D sit side by side in one row');
  assert(W.y+W.h+W.d<S.y&&W.x+W.w/2>S.x&&W.x+W.w/2<S.x+S.w,'W sits above S');
  for(const s of ['GAS','BRAKE','LEFT','RIGHT'])assert(txt.includes(s),s);assert(!txt.some(s=>/·/.test(s)));
  const Q=paintKey(L,'Q'),E=paintKey(L,'E');
  if(!shift){assert(!Q&&!E&&!txt.includes('DOWN'),'Q / E only on the Supercar');continue;}
  assert(Q.y===W.y&&E.y===W.y&&Q.x<W.x&&E.x>W.x&&Q.x<A.x&&E.x<D.x,'Q W E row offset left like a real keyboard');assert(txt.includes('DOWN')&&txt.includes('UP'));
 }
 const T=e.paintLayout(240,120,{touch:true}),B=e.paintLayout(240,120,{touch:true,shift:true});
 assert(!T.items.some(i=>i.t==='key')&&/DRAG WHEEL/.test(paintText(T).join(' '))&&/HOLD PEDALS/.test(paintText(T).join(' ')),'touch screens get a painted line');
 assert(/STICK/.test(paintText(B).join(' '))&&!/STICK/.test(paintText(T).join(' ')),'Supercar touch line mentions the stick');
});
test('round 2 paint: every zone from 120x50 to 260x140 fits, degrades gracefully and stays inside the zone', () => {
 const A=e.makeArena(711,400);let prev=null;
 for(const [w,h] of [[120,50],[150,52],[180,70],[216,108],[240,120],[260,140],[300,90],[130,140]])for(const touch of [false,true])for(const shift of [false,true]){
  const name=`${w}x${h} touch=${touch} shift=${shift}`,L=e.paintLayout(w,h,{touch,shift});
  assert(L.items.length&&L.w<=w&&L.h<=h,name+' fits');
  if(!touch)assert(['A','S','D','W'].every(c=>paintKey(L,c)),name+' always shows the four keys');
  const zone={l:17.4,t:33.2,r:17.4+w,b:33.2+h},runs=e.paintRuns(A,zone,{touch,shift}),px=paintPixels(runs);
  assert(px.size>100,name+' paints something');assert.deepEqual(e.paintRuns(A,zone,{touch,shift}),runs,name+' deterministic');
  for(const p of px){const [x,y]=p.split(',').map(Number);assert(x>=zone.l&&x<zone.r&&y>=zone.t&&y<zone.b,name+' inside the zone');}
  if(touch&&L.items[0].h>=e.PAINT_SOLID_BELOW)assert(runs.every(([,y])=>y%2===0),name+' touch text is all stripes');
  if(touch&&w>=180&&h>=70)assert(L.items[0].h>=e.PAINT_SOLID_BELOW,name+' big zones get big striped letters');
 }
 const k=n=>paintKey(e.paintLayout(n,n/2,{}),'A').w;assert(k(100)<k(120)&&k(140)<k(200)&&k(200)<k(240),'keys shrink with the zone (per tier)');
 assert.equal(e.paintLayout(240,120,{}).mode,'side');assert.equal(e.paintLayout(100,40,{}).mode,'bare','labels drop before keys');
 assert.equal(e.paintRuns(A,{l:10,t:10,r:12,b:12},{}).length,0,'a tiny zone paints nothing');
 const edge=e.paintRuns(A,{l:600,t:300,r:900,b:500},{});assert(edge.length&&edge.every(([x,y,n])=>x>=600&&x+n<=A.W&&y>=300&&y<A.H),'clipped to the arena');
});
test('round 2 paint: drawPaint uses INK only, one-pixel-tall runs, and buildGround paints the instructions zone', () => {
 const calls=[],gc={fillStyle:'',fillRect(x,y,w,h){calls.push([this.fillStyle,x,y,w,h]);}};
 const zone={l:8,t:40,r:248,b:160},n=e.drawPaint(gc,e.makeArena(711,400),zone,{shift:true});
 assert(n>50&&calls.length===n&&calls.every(c=>c[0]==='#30342d'&&c[4]===1&&c[3]>=1),'INK runs, nothing else');
 const script=scripts[0][1],bg=script.split('function buildGround(')[1].split('\n}')[0];
 assert(/drawGround\(gc,A,world\.layout\)[\s\S]*zoneOf\('instructions'\)[\s\S]*drawPaint\(gc,A,zone,\{touch:isTouch\(\),shift:world\.id==='coupe',mask:canvasTextMask\}\)/.test(bg),'paint drawn after the ground, in the instructions zone');
 assert(!/GROUND_TEXT|drawGroundText/.test(script),'old 3x5 painted text is gone');
});
// (end of r2-paint section)

console.log(`${count} checks passed. The deployable page has no external assets or dependencies.`);
