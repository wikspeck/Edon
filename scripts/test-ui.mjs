import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createServer } from 'vite'
const vite=await createServer({configFile:false,appType:'custom',logLevel:'silent',server:{middlewareMode:true}})
try {
 const {createDocument,createElement,migrateDocument}=await vite.ssrLoadModule('/src/model/document.ts')
 const {createUiWidget,applyUiLayouts,duplicateComponent,defaultAnimation}=await vite.ssrLoadModule('/src/editor/ui-design.ts')
 const {createVectorFill,resolveVectorFills}=await vite.ssrLoadModule('/src/editor/vector-fill.ts')
 const {exportUiHtml}=await vite.ssrLoadModule('/src/editor/ui-export.tsx')
 const {assertElementPatch}=await vite.ssrLoadModule('/src/integrations/public-api/validation.ts')
 const {EdonPublicApiService}=await vite.ssrLoadModule('/src/integrations/public-api/service.ts')
 const {MemoryPublicApiRepository}=await vite.ssrLoadModule('/src/integrations/public-api/repository.ts')
 const document=createDocument('UI QA',640,480,'ui'),page=document.pages[0]
 const root=createElement('group',20,20,500,160);root.ui={role:'container',layout:{direction:'row',gap:12,padding:20,align:'center',justify:'start'}}
 const widgets=[...createUiWidget('button',0,0),...createUiWidget('input',0,0)]
 widgets.filter(e=>e.type==='group').forEach(e=>e.parentId=root.id)
 widgets[0].ui.animation={...defaultAnimation,trigger:'hover'}
 page.elements=applyUiLayouts([root,...widgets])
 assert.equal(page.elements[1].x,40);assert.equal(page.elements[4].x,252)
 assert.equal(page.elements[2].x,40,'nested widget descendants move with root')
 const copies=duplicateComponent(page.elements,widgets[0].id);assert.equal(copies.length,3);assert.equal(copies[1].parentId,copies[0].id);assert.equal(copies[0].ui.component.sourceId,widgets[0].id)
 const path=createElement('path',20,260,100,100);path.pathData='M0 0 L100 0 L50 100 Z';path.closed=true;path.stroke='#000000';path.strokeWidth=4;path.fill='#00000000';path.fillPaint={type:'solid',color:path.fill}
 const fill=createVectorFill(path,'#ff7700',10)
 const linked=resolveVectorFills([path,fill]);assert.equal(linked[0].id,fill.id);assert.equal(linked[0].strokeWidth,4,'bleed cannot cross the opaque stroke');assert.equal(resolveVectorFills([{...path,x:123,width:140},fill])[0].x,123)
 assert.throws(()=>createVectorFill({...path,closed:false,pathData:'M0 0 L100 0'},'#ff7700'))
 assert.equal(resolveVectorFills([fill]).length,0,'deleting contour removes fill from render')
 page.elements.push(path,fill)
 assert.equal(migrateDocument(JSON.parse(JSON.stringify(document))).kind,'ui')
 const html=exportUiHtml(document);assert.match(html,/<button /);assert.match(html,/<input /);assert.match(html,/pointerenter/);assert.match(html,/prefers-reduced-motion/);assert.match(html,/ff7700/)
 const dangerous=structuredClone(document);dangerous.pages[0].elements[1].ui.label='</script><img src=x onerror=alert(1)>';dangerous.pages[0].elements[1].ui.href='javascript:alert(1)';const safe=exportUiHtml(dangerous);assert.ok(!safe.includes('javascript:'));assert.ok(!safe.includes('<img src=x'))
 assertElementPatch({ui:widgets[0].ui});assert.throws(()=>assertElementPatch({ui:{role:'button',script:'eval()'}}));assert.throws(()=>assertElementPatch({ui:{role:'button',href:'javascript:alert(1)'}}));assert.throws(()=>assertElementPatch({ui:{role:'button',animation:{...defaultAnimation,duration:NaN}}}));assert.throws(()=>assertElementPatch({pathData:'<script>'}));assert.throws(()=>assertElementPatch({effects:[{type:'glow',id:'effect_12345678',enabled:true,color:'red',opacity:1,blur:10,spread:0,strength:1}]}))
 const api=new EdonPublicApiService(new MemoryPublicApiRepository());const owner={subject:'test-owner',clientId:'ui-test',scopes:new Set(['documents:read','documents:write'])};const created=api.createDocument(owner,{name:'MCP UI',kind:'ui',width:640,height:480});assert.equal(created.resource.kind,'ui');const made=api.createElement(owner,created.resource.id,created.resource.pages[0].id,{type:'rectangle',x:0,y:0,width:100,height:48,ui:{role:'button',animation:defaultAnimation},ifMatchRevision:1});assert.equal(made.resource.ui.animation.preset,'rise')
 await fs.writeFile('artifacts/ui-qa.html',html)
 console.log('UI checks passed: layout, nested movement, component instances, vector-fill linking/bleed/order, persistence, semantic animated HTML, injection rejection, MCP UI creation.')
}finally{await vite.close()}
