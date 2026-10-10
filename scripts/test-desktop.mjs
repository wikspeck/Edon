import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const handlers = new Map()
const folder = fs.mkdtempSync(path.join(path.resolve('artifacts'), 'native-test-'))
const target = path.join(folder, 'project.edon.json')
let contents
class Window {
  constructor() {contents={mainFrame:{url:'edon://app/app'},on(){},setWindowOpenHandler(){},session:{setPermissionRequestHandler(){},on(){}}};this.webContents=contents}
  once(){} loadURL(){return Promise.resolve()} show(){}
}
const electron = {
  app:{setName(){},setAppUserModelId(){},requestSingleInstanceLock:()=>true,on(){},whenReady:()=>Promise.resolve(),getAppPath:()=>process.cwd(),getPath:()=>folder},
  BrowserWindow:Window, protocol:{registerSchemesAsPrivileged(){},handle(){}},net:{},shell:{openPath:async()=>{}},
  ipcMain:{handle:(name,handler)=>handlers.set(name,handler)},
  dialog:{showSaveDialog:async()=>({filePath:target}),showOpenDialog:async()=>({filePaths:[target]})},
}
vm.runInNewContext(fs.readFileSync('desktop/electron/main.cjs','utf8'),{require:name=>name==='electron'?electron:name==='./mcp-bridge.cjs'?{startBridge:async()=>()=>{}}:require(name),process:{env:{},on(){}},__dirname:path.resolve('desktop/electron'),URL,Response,Headers,Buffer,pathToFileURL})
await Promise.resolve()
const event={sender:contents,senderFrame:contents.mainFrame}
const first=JSON.stringify({id:'doc',pages:[],name:'first'})
const second=JSON.stringify({id:'doc',pages:[],name:'second'})
await handlers.get('project:save')(event,'project',first)
assert.equal(fs.readFileSync(target,'utf8'),first)
await handlers.get('project:save')(event,'project',second)
assert.equal(fs.readFileSync(target+'.bak','utf8'),first)
assert.equal((await handlers.get('project:open')(event)).json,second)
await assert.rejects(handlers.get('project:save')({sender:{}},'project',second),/Unauthorized/)
await assert.rejects(handlers.get('project:save')(event,'project','{}'),/Invalid project/)
console.log('Desktop file tests passed: save, overwrite backup, open and sender validation. Native dialogs mocked; filesystem real.')

