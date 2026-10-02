const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 50344;
const baseDir = path.resolve(__dirname, '..');
const webDir = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
    let reqUrl = decodeURI(req.url.split('?')[0]);
    if (reqUrl === '/') reqUrl = '/index.html';

    let cleanPath = reqUrl.replace(/^\/+/, '');
    if (cleanPath === 'assets/items/poke_ball.png') {
        cleanPath = 'assets/items/pokeball_stardew.png';
    }
    let filePath;
    if (cleanPath.startsWith('assets/')) {
        filePath = path.join(baseDir, cleanPath);
    } else {
        filePath = path.join(webDir, cleanPath);
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`404 Not Found: ${reqUrl}`);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const isStaticAsset = cleanPath.startsWith('assets/');
        const cacheControl = isStaticAsset ? 'public, max-age=86400' : 'no-cache, no-store, must-revalidate';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': cacheControl,
            'Access-Control-Allow-Origin': '*'
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Pelipper Town Web Server running at http://127.0.0.1:${PORT}`);
});
