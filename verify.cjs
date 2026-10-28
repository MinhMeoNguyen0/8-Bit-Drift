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
const input = (w=false,s=false,a=false,d=false) => ({w,s,a,d});
const empty = id => { const w=e.createWorld(id); w.cones=[]; return w; };
const run = (w,seconds,keys) => { for(let i=0;i<Math.round(seconds/e.STEP);i++)e.step(w,keys); };
const forward = w => w.car.vx*Math.cos(w.car.a)+w.car.vy*Math.sin(w.car.a);
test('positive modulo preserves overshoot on all sides', () => {
 assert.equal(e.wrap(-3,400),397); assert.equal(e.wrap(803,400),3);
 const w=empty();Object.assign(w.car,{x:399.9,y:e.WORLD_H-.1,vx:90,vy:90,a:Math.PI/4});e.step(w,input(true));
 assert(w.car.x<2&&w.car.y<2);assert(Math.hypot(w.car.vx,w.car.vy)>100);assert(w.wraps>0);
});
test('edge and angle interpolation use the short path', () => {
 const p=e.position({px:399,x:1,py:e.WORLD_H-1,y:1,pa:359*Math.PI/180,a:Math.PI/180},.5);
 assert(Math.abs(p.x)<1e-8&&Math.abs(p.y)<1e-8);assert(Math.abs(e.delta(p.a,e.TAU||Math.PI*2))<1e-8);
});
test('tracks split across edges and diagonal corners', () => {
 const pixels=[];e.wrappedLine(399,239,1,1,(x,y)=>pixels.push([x,y]));assert.deepEqual(pixels,[[399,239],[0,0],[1,1]]);
 const reverse=[];e.wrappedLine(1,100,399,100,(x,y)=>reverse.push(x));assert.deepEqual(reverse,[1,0,399]);
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
test('car-cone collision works across the horizontal seam', () => {
 const w=e.createWorld();Object.assign(w.car,{x:1,y:100,a:0,vx:-35,vy:0,omega:0});w.cones=[{x:389.5,y:100,vx:0,vy:0,a:0,omega:0,tipped:false}];e.carCone(w,w.cones[0]);
 assert(w.cones[0].vx<0);assert(w.cones[0].tipped);assert(w.car.vx>-35);
});
test('cone collision works across vertical seam', () => {
 const a={x:20,y:1,vx:0,vy:-10},b={x:20,y:e.WORLD_H-1,vx:0,vy:0};e.coneCone(a,b);assert(b.vy<0);
});
test('overlapping centers resolve without NaN', () => {
 const w=e.createWorld();Object.assign(w.car,{x:100,y:100,a:.4});const c={x:100,y:100,vx:0,vy:0,a:0,omega:0,tipped:false};e.carCone(w,c);
 assert(Number.isFinite(c.x)&&Number.isFinite(c.y));assert(Math.hypot(c.x-100,c.y-100)>0);
});
test('fixed-step result is identical at 30/60/120/144 render schedules', () => {
 function simulation(hz){const w=empty();let acc=0,ticks=0;for(let frame=0;frame<hz*8;frame++){acc+=1/hz;while(acc+1e-12>=e.STEP){e.step(w,input(true,false,ticks>240&&ticks<500,ticks>600));acc-=e.STEP;ticks++;}}return [ticks,w.car.x,w.car.y,w.car.a,w.car.vx,w.car.vy];}
 const reference=simulation(60);for(const hz of [30,120,144]){const actual=simulation(hz);actual.forEach((n,i)=>assert(Math.abs(n-reference[i])<1e-8));}
});
test('all presets remain finite and bounded through five-minute drives', () => {
 for(const id of Object.keys(e.PRESETS)){const w=e.createWorld(id);for(let i=0;i<36000;i++){e.step(w,input(i%1800<1500,i%1800>=1500,i%1300<400,i%1300>900));if(i%120===0){for(const o of [w.car,...w.cones]){assert(Number.isFinite(o.x)&&Number.isFinite(o.y)&&Number.isFinite(o.vx)&&Number.isFinite(o.vy));assert(o.x>=0&&o.x<e.WIDTH&&o.y>=0&&o.y<e.WORLD_H);}}}assert(w.wraps>0);}
});
console.log(`${count} checks passed. The deployable page has no external assets or dependencies.`);
