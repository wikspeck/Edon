const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const log = message => {if(process.env.EDON_DIAGNOSTICS) fs.appendFileSync(process.env.EDON_DIAGNOSTICS, String(message)+'\n');};
process.on('uncaughtException',error=>log(error.stack));
log('main entered');
protocol.registerSchemesAsPrivileged([{ scheme: 'edon', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
app.setName('Edon');
app.setAppUserModelId('dev.edon.desktop');
if (!app.requestSingleInstanceLock()) app.quit();
else {
 let window;
 app.on('second-instance', () => { if(window) { if(window.isMinimized()) window.restore(); window.focus(); } });
 app.whenReady().then(() => {
  log('app ready');
  const root = path.join(app.getAppPath(), 'dist');
  protocol.handle('edon', request => {
   log(request.url);
   const url = new URL(request.url);
   if(url.hostname !== 'app') return new Response('Not found', {status:404});
   let target;
   try { target = path.resolve(root, '.' + decodeURIComponent(url.pathname)); } catch { return new Response('Invalid path',{status:400}); }
   if(target !== root && !target.startsWith(root + path.sep)) return new Response('Forbidden',{status:403});
   if(!fs.existsSync(target) || fs.statSync(target).isDirectory()) target=path.join(root,'index.html');
   return net.fetch(pathToFileURL(target).href).then(response=>{const headers=new Headers(response.headers);headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; media-src 'self' blob: data: https:; connect-src 'self' https:; worker-src 'self' blob:; frame-src 'self' blob: data:; object-src 'none'");return new Response(response.body,{status:response.status,headers});});
  });
  window = new BrowserWindow({show:false,width:1440,height:920,minWidth:900,minHeight:600,title:'Edon',backgroundColor:'#20211f',autoHideMenuBar:true,webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true}});
  window.once('ready-to-show',()=>{log('ready to show');window.show();});
  window.webContents.on('did-finish-load',()=>log('loaded'));
  window.webContents.on('did-fail-load',(_event,code,message,url)=>log([code,message,url].join(' ')));
  window.webContents.on('console-message',(_event,details)=>log(details.message));
  window.webContents.setWindowOpenHandler(({url}) => { if(/^https?:/.test(url)) void shell.openExternal(url); return {action:'deny'}; });
  window.webContents.on('will-navigate',(event,url) => { if(!url.startsWith('edon://app/')) {event.preventDefault(); if(/^https?:/.test(url)) void shell.openExternal(url);} });
  window.webContents.session.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
  window.webContents.session.on('will-download', (_event,item) => {
   item.setSaveDialogOptions({title:'Save export',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))});
  });
  void window.loadURL('edon://app/app').catch(error=>log(error.stack));
 });
 app.on('window-all-closed',()=>app.quit());
}
