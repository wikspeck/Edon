import {spawn} from 'node:child_process'
import readline from 'node:readline'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import sharp from 'sharp'
const child=spawn(process.execPath,['plugins/edon-mcp/server.mjs'],{stdio:['pipe','pipe','pipe']});let next=0;const pending=new Map()
readline.createInterface({input:child.stdout}).on('line',s=>{const r=JSON.parse(s);pending.get(r.id)?.(r.result);pending.delete(r.id)})
const call=(name,args)=>new Promise((resolve,reject)=>{const id=++next,t=setTimeout(()=>reject(Error('Timeout')),25000);pending.set(id,r=>{clearTimeout(t);if(r.isError)reject(Error(JSON.stringify(r)));else resolve(r)});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method:'tools/call',params:{name,arguments:args}})+'\n')})
const value=r=>JSON.parse(r.content.find(c=>c.type==='text').text)
const qa=JSON.parse(await fs.readFile('artifacts/ui-desktop-qa.json','utf8'))
let original, surface, revision
try{
 const doc=value(await call('get_document',{documentId:qa.documentId}));revision=doc.revision;surface=doc.pages[0].elements.find(e=>e.name==='Surface');original=surface.effects
 await call('open_document',{documentId:qa.documentId})
 for(const shape of ['contour','rectangle','circle']){
  const r=value(await call('update_element',{documentId:doc.id,slideId:qa.slideId,elementId:surface.id,input:{ifMatchRevision:revision,patch:{effects:[{...original[0],shape,color:'#ff0000',opacity:1,blur:24,spread:8,strength:3,falloff:1}]}}}));revision=r.revision
  const png=(await call('get_preview',{documentId:doc.id})).content.find(c=>c.type==='image');const bytes=Buffer.from(png.data,'base64');await fs.writeFile(`artifacts/glow-${shape}.png`,bytes)
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});let red=0
  for(let y=150;y<255;y++)for(let x=50;x<330;x++){if(x>=80&&x<300&&y>=180&&y<228)continue;const i=(y*info.width+x)*4;if(data[i]>data[i+1]+40&&data[i]>data[i+2]+40)red++}
  assert.ok(red>50,`${shape} glow must visibly render outside its source: ${red}`);console.log(`${shape} glow: ${red} visible colored pixels`)
 }
 const grid=Buffer.alloc(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4,c=(x+y)%2?0:255;grid[i]=grid[i+1]=grid[i+2]=c;grid[i+3]=255}
 const image=await sharp(grid,{raw:{width:16,height:16,channels:4}}).png().toBuffer()
 const made=value(await call('create_element',{documentId:qa.documentId,slideId:qa.slideId,input:{type:'raster',name:'Pixel sharpness QA',x:392,y:292,width:16,height:16,imageUrl:'data:image/png;base64,'+image.toString('base64'),ifMatchRevision:revision}}));revision=made.revision
 console.log('Sharpness fixture added for actual desktop zoom inspection.')
}finally{
 if(original&&surface){try{await call('update_element',{documentId:qa.documentId,slideId:qa.slideId,elementId:surface.id,input:{ifMatchRevision:revision,patch:{effects:original}}})}catch(e){console.error('Restore failed:',e.message)}}
 child.kill()
}

