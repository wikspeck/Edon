import fs from 'node:fs'
import { tools } from '../plugins/edon-mcp/tools.mjs'
const spec=JSON.parse(fs.readFileSync(new URL('../openapi/edon-public-api.v1.json',import.meta.url),'utf8'))
function resolve(s) {
 if(Array.isArray(s))return s.map(resolve)
 if(!s || typeof s!=='object')return s
 if(s.$ref)return resolve(spec.components.schemas[s.$ref.split('/').at(-1)])
 if(s.allOf){const parts=s.allOf.map(resolve);return {...Object.assign({},...parts),type:'object',properties:Object.assign({},...parts.map(p=>p.properties??{})),required:[...new Set(parts.flatMap(p=>p.required??[]))],additionalProperties:false}}
 return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,resolve(v)]))
}
const inputs={create_project:'CreateProject',create_document:'CreateDocument',create_slide:'CreateSlide',create_element:'CreateElement',update_element:'UpdateElement',apply_operations:'ApplyOperations'}
for(const t of tools)if(inputs[t.name]){t.inputSchema.properties.input=resolve(spec.components.schemas[inputs[t.name]]);if(t.name.startsWith('create_')||t.name==='apply_operations')t.inputSchema.properties.input.properties.idempotencyKey={type:'string',minLength:8,maxLength:128}}
const id=resolve(spec.components.schemas.Id)
if(!tools.some(t=>t.name==='export_ui'))tools.push({name:'export_ui',description:'Export a UI page as standalone HTML, CSS and interactive animations. Returns source, not a screenshot.',inputSchema:{type:'object',properties:{documentId:id,slideId:id},required:['documentId'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}})
const output='export const tools = '+JSON.stringify(tools,null,2)+';\n'
const target=new URL('../plugins/edon-mcp/tools.mjs',import.meta.url)
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==output)throw Error('MCP schemas are stale. Run npm run sync:mcp.')}else fs.writeFileSync(target,output)
