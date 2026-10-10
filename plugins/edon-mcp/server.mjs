import readline from 'node:readline';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { tools } from './tools.mjs';

const descriptor = process.env.EDON_MCP_CONNECTION ?? path.join(process.env.APPDATA ?? path.join(os.homedir(), '.config'), 'Edon', 'mcp-connection.json');
async function call(name, args) {
 if (!tools.some(tool => tool.name === name)) throw new Error('Unknown Edon tool');
 let connection;
 try { connection = JSON.parse(await fs.readFile(descriptor, 'utf8')); } catch { throw new Error('Start the Edon desktop app and open its workspace.'); }
 if (!Number.isInteger(connection.port) || connection.port < 1 || connection.port > 65535 || !/^[a-f0-9]{64}$/.test(connection.token)) throw new Error('Invalid Edon connection descriptor');
 const response = await fetch(`http://127.0.0.1:${connection.port}/invoke`, { method: 'POST', headers: { Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, arguments: args ?? {} }), signal: AbortSignal.timeout(18000) });
 const result = await response.json();
 if (!response.ok || result.error) throw new Error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
 if (name === 'get_preview') {
  const { data, ...metadata } = result.result;
  return { content: [{type:'image',mimeType:'image/png',data},{type:'text',text:JSON.stringify(metadata)}], structuredContent: metadata };
 }
 return { content: [{ type: 'text', text: JSON.stringify(result.result) }], structuredContent: { result: result.result }, isError: false };
}
export async function handle(message) {
 switch (message.method) {
  case 'initialize': return { protocolVersion: ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'].includes(message.params?.protocolVersion) ? message.params.protocolVersion : '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'edon', version: '1.0.0' }, instructions: 'Work on real local Edon designs. Inspect IDs and revisions before editing. Use apply_operations with dryRun for complex edits. Open Edon desktop first. Each batch is one undo step.' };
  case 'ping': return {};
  case 'tools/list': return { tools };
  case 'tools/call': try { return await call(message.params?.name, message.params?.arguments); } catch (error) { return { content: [{ type: 'text', text: error.message }], isError: true }; }
  default: throw Object.assign(new Error('Method not found'), { code: -32601 });
 }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
 const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
 let queue = Promise.resolve();
 lines.on('line', line => { queue = queue.then(async () => {
  let message;
  try { if (Buffer.byteLength(line) > 2 * 1024 * 1024) throw new Error('Request too large'); message = JSON.parse(line); } catch { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON' } }) + '\n'); return; }
  if (message.id === undefined) return;
  try { const result = await handle(message); process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }) + '\n'); }
  catch (error) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: error.code ?? -32603, message: error.message } }) + '\n'); }
 }); });
}
