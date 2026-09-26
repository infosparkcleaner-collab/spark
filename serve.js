// Tiny static server for local preview:  node serve.js  ->  http://localhost:5173
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname, port = process.env.PORT || 5173;
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  // Match Vercel's cleanUrls: /about serves about.html, /about.html and
  // /index.html redirect to their clean form, unknown paths get 404.html.
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  if (/\.html$/.test(p)) {
    const clean = p === '/index.html' ? '/' : p.slice(0, -5);
    res.writeHead(308, { Location: clean + q }).end(); return;
  }
  if (p === '/') p = '/index.html';
  else if (!path.extname(p) && fs.existsSync(path.join(root, p + '.html'))) p += '.html';
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.stat(f,(e,stat)=>{
    if (e) { res.writeHead(404,{'Content-Type':'text/html'}); fs.createReadStream(path.join(root,'404.html')).pipe(res); return; }
    if(!stat.isFile()){res.writeHead(404).end();return;}
    const headers={'Content-Type':types[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
    let start=0,end=stat.size-1,status=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}
      if(!match[1])start=Math.max(0,stat.size-Number(match[2]));
      else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
      if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
    if(req.method==='HEAD'||!stat.size){res.end();return;}
    const stream=fs.createReadStream(f,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
  });
}).listen(port,()=>console.log('SPARK dev server → http://localhost:'+port));
