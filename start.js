const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST = path.join(__dirname, 'client', 'dist');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, 'index.html'); // SPA fallback
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ============================================');
  console.log('  |                                          |');
  console.log(`  |  思瑞AI助手已启动！                       |`);
  console.log(`  |  本机访问: http://localhost:${PORT}        |`);
  console.log(`  |  局域网访问: http://sirui-ai:${PORT}       |`);
  console.log('  |                                          |');
  console.log('  |  关闭此窗口即可停止服务                  |');
  console.log('  |                                          |');
  console.log('  ============================================');
  console.log('');
});
