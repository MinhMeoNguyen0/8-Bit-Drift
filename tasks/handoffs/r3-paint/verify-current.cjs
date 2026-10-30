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
e.setTrack('signature');console.log(n+' current-feature checks passed.');
