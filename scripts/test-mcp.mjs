import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { spawn } from 'node:child_process'
import readline from 'node:readline'
import { createServer } from 'vite'
const require = createRequire(import.meta.url)
const { startBridge } = require('../desktop/electron/mcp-bridge.cjs')
const vite = await createServer({configFile:false,appType:'custom',logLevel:'silent',server:{middlewareMode:true}})
let close, child
try {
 const { MemoryPublicApiRepository } = await vite.ssrLoadModule('/src/integrations/public-api/repository.ts')
 const { createMcpHandler } = await vite.ssrLoadModule('/src/integrations/mcp.ts')
 const repository = new MemoryPublicApiRepository(undefined, 'local-mcp-user')
 let opened
 const handler = createMcpHandler(repository, id => { opened = id })
 const ipcMain = new EventEmitter()
 const webContents = new EventEmitter()
 const window = { webContents, isDestroyed:()=>false }
 webContents.send = (_channel,id,request) => { try { ipcMain.emit('mcp:response',{},id,{result:handler(request)}) } catch(error) { ipcMain.emit('mcp:response',{},id,{error:error.message}) } }
 const directory = await fs.mkdtemp(path.resolve('artifacts/mcp-test-'))
 close = await startBridge({directory, window, ipcMain, checkSender:()=>{}})
 const descriptor = JSON.parse(await fs.readFile(path.join(directory,'mcp-connection.json')))
 const url = `http://127.0.0.1:${descriptor.port}/invoke`
 assert.equal((await fetch(url,{method:'POST'})).status,403)
 assert.equal((await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${descriptor.token}`,Origin:'https://evil.example'}})).status,403)
 assert.equal((await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${descriptor.token}`}})).status,503)
 ipcMain.emit('mcp:ready',{})
 child = spawn(process.execPath,['plugins/edon-mcp/server.mjs'],{env:{...process.env,EDON_MCP_CONNECTION:path.join(directory,'mcp-connection.json')},stdio:['pipe','pipe','pipe']})
 const pending = new Map(); let id = 0
 readline.createInterface({input:child.stdout}).on('line',line=>{const message=JSON.parse(line);pending.get(message.id)?.(message);pending.delete(message.id)})
 const request = (method,params={}) => new Promise((resolve,reject)=>{const requestId=++id;const timer=setTimeout(()=>reject(new Error('MCP request timeout')),5000);pending.set(requestId,result=>{clearTimeout(timer);if(result.error)reject(new Error(result.error.message));else resolve(result.result)});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:requestId,method,params})+'\n')})
 const call = async (name,args={}) => { const result = await request('tools/call',{name,arguments:args});return {error:result.isError,result:JSON.parse(result.content[0].text)} }
 assert.equal((await request('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}})).protocolVersion,'2025-06-18')
 child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n')
 assert.equal((await request('tools/list')).tools.length,18)
 assert.equal((await call('get_connection')).result.connected,true)
 const created = await call('create_document',{input:{name:'MCP integration test',width:800,height:600,idempotencyKey:'test-once'}})
 const document=created.result.resource,slideId=document.pages[0].id
 const retry=await call('create_document',{input:{name:'MCP integration test',width:800,height:600,idempotencyKey:'test-once'}})
 assert.equal(retry.result.resource.id,document.id)
 const ops=[{op:'create_element',slideId,element:{type:'rectangle',x:20,y:30,width:200,height:100,fill:'#ff8800'}}]
 assert.equal((await call('apply_operations',{documentId:document.id,input:{ifMatchRevision:1,operations:ops,dryRun:true}})).result.created,1)
 assert.equal(repository.read().documents[0].revision,1)
 const applied=await call('apply_operations',{documentId:document.id,input:{ifMatchRevision:1,operations:ops}})
 assert.equal(applied.result.documentRevision,2)
 const conflict=await request('tools/call',{name:'apply_operations',arguments:{documentId:document.id,input:{ifMatchRevision:1,operations:ops}}})
 assert.equal(conflict.isError,true)
 assert.equal(repository.read().documents[0].pages[0].elements.length,1)
 const rollback=await request('tools/call',{name:'apply_operations',arguments:{documentId:document.id,input:{ifMatchRevision:2,operations:[...ops,{op:'delete_slide',slideId:'missing-slide'}]}}})
 assert.equal(rollback.isError,true)
 assert.equal(repository.read().documents[0].pages[0].elements.length,1)
 await call('open_document',{documentId:document.id});assert.equal(opened,document.id)
 console.log('MCP tests passed: stdio initialize/discovery, authenticated loopback, 18 tools, real service mutations, retry, dry run, revision conflict, atomic rollback, open document. Renderer simulated.')
} finally { child?.kill();close?.();await vite.close() }
