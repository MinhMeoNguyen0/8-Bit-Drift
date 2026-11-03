// Renders a course from the game's own drawing code to a PNG, at native pixels, without a browser or any package.
// Ground paint, every shadow, then the depth-sorted sprites (temple, race gate, pit, cones, the car at its spawn), exactly as
// draw() orders them. The painted title, keyboard guide, tyre marks and the DOM controls are not included.
//
//   node snapshot.cjs [track] [out.png] [--scale N] [--crop l,t,r,b] [--car compact|coupe|f1|van] [--at x,y,heading]
//
// track: signature, oval, eight, temple or parking (default temple). --crop is in arena screen px (1350 x 675);
// --at places the car in world units (screen y = y * K). Example: a 3x close-up of the temple:
//   node snapshot.cjs temple docs/images/temple-closeup.png --scale 3 --crop 520,60,840,360
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8'),sandbox={module:{exports:{}}};
vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);const e=sandbox.module.exports;

const args=process.argv.slice(2),opt=k=>{const i=args.indexOf(k);return i<0?null:args.splice(i,2)[1];};
const scale=+(opt('--scale')||1),crop=opt('--crop'),carId=opt('--car')||'compact',at=opt('--at');
const [track='temple',out='snapshot.png']=args;
if(!e.setTrack(track))throw new Error('unknown track '+track);

const A=e.makeArena(e.VIEW_SHORT*2,e.VIEW_SHORT);A.fixedMobile=true;
const w=e.createWorld(carId,A);
if(at){const [x,y,a]=at.split(',').map(Number);Object.assign(w.car,{x,y,px:x,py:y,a:a||0,pa:a||0});}
const W=A.W,H=A.H,px=Buffer.alloc(W*H*3),INK=[48,52,45],PAPER=[191,193,177];
const put=(x,y,c)=>{x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*3;px[i]=c[0];px[i+1]=c[1];px[i+2]=c[2];};
let fill=PAPER;const gc={set fillStyle(v){fill=/30342d/i.test(v)?INK:PAPER;},get fillStyle(){return fill;},fillRect(x,y,ww,hh){for(let j=0;j<hh;j++)for(let i=0;i<ww;i++)put(x+i,y+j,fill);}};
e.drawGround(gc,A,w.layout);
const blit=(img,x,y)=>{for(let j=0;j<img.height;j++)for(let i=0;i<img.width;i++){const k=(j*img.width+i)*4;if(img.data[k+3])put(x+i,y+j,[img.data[k],img.data[k+1],img.data[k+2]]);}};

// Each item: depth key, its sprite and (for one part per object) its shadow, as in drawShadow / drawItem.
const items=[];
const T=w.layout.temple;if(T){const art=e.templeArt(T);for(const d of e.templeDrawables(w))items.push({key:d.key,draw:()=>blit(art[d.part],d.x-art.ax,d.y-art.ay),shadow:d.part==='base'&&(()=>blit(art.shadow,d.x-art.ax,d.y-art.ay))});}
const g=w.layout.gate;if(g){const art=e.gateArt(g);for(const d of e.gateDrawables(w)){const b=art.box,img=d.part==='arch'?art.arch:art.legs[d.part==='leg0'?0:1];items.push({key:d.key,draw:()=>blit(img,d.x-b.ax,d.y-b.ay),shadow:d.part==='leg0'&&(()=>blit(art.shadow,d.x-art.shadowBox.ax,d.y-art.shadowBox.ay))});}}
const pit=e.pitStopGeometry(A,w.layout);if(pit){const art=e.pitArt(pit);for(const d of e.pitDrawables(w))items.push({key:d.key,draw:()=>blit(art[d.part],d.x-art.ax,d.y-art.ay),shadow:d.part==='base'&&(()=>blit(art.shadow,d.x-art.ax,d.y-art.ay))});}
for(const d of e.propDrawables(w)){const art=e.propArt(w.layout.props[d.i]);items.push({key:d.key,draw:()=>blit(art.sprite,d.x-art.ax,d.y-art.ay),shadow:()=>blit(art.shadow,d.x-art.ax,d.y-art.ay)});}
const cone=e.coneSprite(),coneShadow=e.coneShadowSprite();
for(const o of w.cones){const x=Math.round(o.x),y=Math.round(o.y*e.K);
 if(o.kind==='cart'){const a=e.frameIndex(o.a,e.CART_FRAMES)*e.TAU/e.CART_FRAMES,s=e.cartSprite(a),sh=e.cartShadowSprite(a);items.push({key:y,draw:()=>blit(s,x-16,y-20),shadow:()=>blit(sh,x-16,y-20)});}
 else items.push({key:y,draw:()=>blit(cone,x-10,y-14),shadow:()=>blit(coneShadow,x-10,y-14)});}
{const c=e.carDrawable(w),p=w.p,a=e.frameIndex(w.car.a,e.FRAMES)*e.TAU/e.FRAMES,s=e.carSprite(p,a),sh=e.carShadow(p,a),b=p.sprite;
 items.push({key:c.key,car:1,draw:()=>blit(s,c.x-b.ax,c.y-b.ay),shadow:()=>blit(sh,c.x-b.ax,c.y-b.ay)});}
for(const o of items)if(o.shadow)o.shadow();
items.sort((a,b)=>a.key-b.key||(a.car||0)-(b.car||0));for(const o of items)o.draw();

// Crop, nearest-neighbour scale and write an RGB PNG.
const [l,t,r,b]=crop?crop.split(',').map(Number):[0,0,W,H],OW=Math.round((r-l)*scale),OH=Math.round((b-t)*scale),raw=Buffer.alloc((OW*3+1)*OH);
for(let y=0;y<OH;y++){raw[y*(OW*3+1)]=0;for(let x=0;x<OW;x++){const i=((t+Math.floor(y/scale))*W+l+Math.floor(x/scale))*3,o=y*(OW*3+1)+1+x*3;raw[o]=px[i];raw[o+1]=px[i+1];raw[o+2]=px[i+2];}}
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=buf=>{let c=0xffffffff;for(const v of buf)c=table[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const chunk=(type,data)=>{const head=Buffer.alloc(4),body=Buffer.concat([Buffer.from(type),data]),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE(crc(body));return Buffer.concat([head,body,tail]);};
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(OW,0);ihdr.writeUInt32BE(OH,4);ihdr[8]=8;ihdr[9]=2;
fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
fs.writeFileSync(out,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
console.log('Wrote '+out+' ('+OW+'x'+OH+', '+track+')');
