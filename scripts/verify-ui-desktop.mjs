// End-to-end QA only: creates an explicitly named test file in the running app.
import {spawn} from 'node:child_process'
import readline from 'node:readline'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const child=spawn(process.execPath,['plugins/edon-mcp/server.mjs'],{stdio:['pipe','pipe','pipe']})
let n=0;const pending=new Map()
readline.createInterface({input:child.stdout}).on('line',line=>{const r=JSON.parse(line);pending.get(r.id)?.(r);pending.delete(r.id)})
const call=(name,args={})=>new Promise((resolve,reject)=>{const id=++n;const timer=setTimeout(()=>reject(Error('MCP timeout')),25000);pending.set(id,r=>{clearTimeout(timer);if(r.error||r.result?.isError)reject(Error(JSON.stringify(r)));else resolve(r.result)});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method:'tools/call',params:{name,arguments:args}})+'\n')})
const result=r=>JSON.parse(r.content.find(c=>c.type==='text').text)
try{
 assert.ok(result(await call('get_connection')).features.includes('ui'))
 const doc=result(await call('create_document',{input:{name:'UI integration QA · 0.4.0',kind:'ui',width:800,height:600}})).resource;let revision=doc.revision;const slideId=doc.pages[0].id
 async function create(input){const r=result(await call('create_element',{documentId:doc.id,slideId,input:{...input,ifMatchRevision:revision}}));revision=r.revision;return r.resource}
 const group=await create({type:'group',name:'Continue button',x:80,y:180,width:220,height:48,ui:{role:'button',label:'Continue',animation:{preset:'rise',trigger:'hover',duration:600,delay:0,easing:'ease-out',repeat:false,distance:16},component:{name:'Primary button'}}})
 await create({type:'rectangle',parentId:group.id,name:'Surface',x:80,y:180,width:220,height:48,fill:'#20211f',fillPaint:{type:'solid',color:'#20211f'},cornerRadii:[12,12,12,12],effects:[{id:'effect_12345678',type:'glow',enabled:true,color:'#777777',opacity:.7,blur:16,spread:2,strength:1,shape:'circle',falloff:2,offsetX:0,offsetY:0}]})
 await create({type:'text',parentId:group.id,name:'Label',x:96,y:192,width:160,height:24,text:'Continue',fontSize:16,fill:'#ffffff'})
 await create({type:'text',name:'Heading',x:80,y:60,width:560,height:70,text:'Made in Edon UI',fontSize:42,fill:'#20211f'})
 const contour=await create({type:'path',name:'Vector contour',x:400,y:180,width:160,height:120,pathData:'M0 0 L160 0 L80 120 Z',closed:true,fill:'#00000000',fillPaint:{type:'solid',color:'#00000000'},stroke:'#20211f',strokeWidth:6})
 await create({type:'path',name:'Linked vector fill',x:400,y:180,width:160,height:120,pathData:contour.pathData,closed:true,fill:'#f3b33d',fillPaint:{type:'solid',color:'#f3b33d'},vectorFill:{sourceId:contour.id,overlap:1}})
 await create({type:'group',name:'Email input',x:80,y:270,width:220,height:48,ui:{role:'input',label:'Your email'}})
 await call('open_document',{documentId:doc.id})
 const html=result(await call('export_ui',{documentId:doc.id}));assert.match(html.source,/<button /);assert.match(html.source,/<input /);await fs.writeFile('artifacts/ui-desktop-export.html',html.source)
 const preview=await call('get_preview',{documentId:doc.id});const png=preview.content.find(c=>c.type==='image');assert.ok(png);await fs.writeFile('artifacts/ui-desktop-preview.png',Buffer.from(png.data,'base64'))
 await fs.writeFile('artifacts/ui-desktop-qa.json',JSON.stringify({documentId:doc.id,slideId,revision,groupId:group.id},null,2))
 console.log('Actual Windows MCP UI verified: UI file, components, motion metadata, circle glow, linked vector fill, HTML export and PNG preview. '+doc.id)
}finally{child.kill()}
