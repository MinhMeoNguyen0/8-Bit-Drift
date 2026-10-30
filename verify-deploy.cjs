// Deployment gate. The existing regression workflows report their own failures separately.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
let game;
test('standalone HTML has an entry point, no external assets, and executable game code',()=>{
 assert(/<!doctype html>/i.test(html));assert(/<canvas\b/i.test(html));assert(/<title>[^<]+<\/title>/i.test(html));
 assert(!/<(?:script|img|link|audio|video)\b[^>]*(?:src|href)=/i.test(html),'No external assets');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
 const sandbox={module:{exports:{}}};vm.runInNewContext(scripts[0][1],sandbox,{timeout:5000});game=sandbox.module.exports;
 assert.equal(typeof game.step,'function');assert.equal(typeof game.createWorld,'function');
});
test('each vehicle starts and simulates on each course without invalid state',()=>{
 for(const track of ['signature','oval','eight','parking']){
  game.setTrack(track);
  for(const id of Object.keys(game.PRESETS)){
   const arena=game.makeArena(1350,675);arena.fixedMobile=true;
   const w=game.createWorld(id,arena),initialTime=w.time;
   for(let i=0;i<240;i++){
    game.step(w,{throttle:1,brake:0,steering:.15,sticks:{lift:0,yaw:0,pitch:.3,roll:0}});
    for(const key of ['x','y','a','vx','vy'])assert(Number.isFinite(w.car[key]),`${track}/${id}: ${key}`);
    if(w.p.flying)assert(Number.isFinite(w.car.z),`${track}/${id}: altitude`);
   }
   assert(w.time>initialTime,`${track}/${id}: simulation advances`);
  }
 }
});
console.log(`Deployment checks: ${count} passed. Full regressions run separately.`);
