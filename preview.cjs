const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const page = path.join(__dirname,'dist','index.html');
http.createServer((req,res)=>{
 if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync(page));
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
