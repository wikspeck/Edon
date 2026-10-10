const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');

async function startBridge({ directory, window, ipcMain, checkSender }) {
 const token = randomBytes(32).toString('hex');
 const pending = new Map();
 let ready = false;
 ipcMain.on('mcp:ready', event => { checkSender(event); ready = true; });
 ipcMain.on('mcp:response', (event, id, result) => {
  checkSender(event); const request = pending.get(id); if (request) request(result);
 });
 window.webContents.on('did-start-loading', () => { ready = false; });
 const server = http.createServer(async (request, response) => {
  const reply = (status, body) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)); };
  if (request.headers.origin || request.headers.host !== `127.0.0.1:${server.address().port}` || request.headers.authorization !== `Bearer ${token}`) return reply(403, { error: 'Unauthorized MCP connection' });
  if (request.method !== 'POST' || request.url !== '/invoke') return reply(404, { error: 'Not found' });
  if (!ready || window.isDestroyed()) return reply(503, { error: 'Open the Edon workspace first.' });
  try {
   const chunks = []; let size = 0;
   for await (const chunk of request) { size += chunk.length; if (size > 2 * 1024 * 1024) return reply(413, { error: 'Request exceeds 2 MB' }); chunks.push(chunk); }
   const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
   const id = randomUUID();
   const result = await new Promise(resolve => {
    const timeout = setTimeout(() => { pending.delete(id); resolve({ error: 'Edon did not respond within 15 seconds.' }); }, 15000);
    pending.set(id, result => { clearTimeout(timeout); pending.delete(id); resolve(result); });
    window.webContents.send('mcp:request', id, body);
   });
   reply(200, result);
  } catch { reply(400, { error: 'Invalid JSON request' }); }
 });
 server.requestTimeout = 20000;
 await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
 const descriptor = path.join(directory, 'mcp-connection.json');
 fs.mkdirSync(directory, { recursive: true });
 fs.writeFileSync(descriptor, JSON.stringify({ port: server.address().port, token }), { mode: 0o600 });
 return () => { server.close(); if (fs.existsSync(descriptor) && JSON.parse(fs.readFileSync(descriptor, 'utf8')).token === token) fs.unlinkSync(descriptor); };
}
module.exports = { startBridge };
