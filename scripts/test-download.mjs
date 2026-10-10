import assert from 'node:assert/strict'
import worker from '../worker/index.js'
const data = [new TextEncoder().encode('MZnative'), new TextEncoder().encode('Edon executable')]
const manifest = { filename: 'Edon-0.2.0-win-x64.exe', bytes: data.reduce((n,p)=>n+p.length,0), sha256: 'testhash', chunks: data.map((p,i)=>({path:'/downloads/edon-abcdef123456-'+i+'.part',bytes:p.length})) }
const assets = new Map([['/downloads/release.json', JSON.stringify(manifest)], ...manifest.chunks.map((c,i)=>[c.path,data[i]])])
const env = { ASSETS: { async fetch(request) {
  const path = new URL(request.url).pathname
  const body = assets.get(path)
  if(!body) return new Response('Not found', { status: 404 })
  return new Response(body, { headers: { 'Content-Type':path.endsWith('json')?'application/json':'application/octet-stream' } })
} } }
const request = (suffix='', method='GET', headers={}) => new Request('https://edon.test/download/Edon-0.2.0-win-x64.exe'+suffix,{method,headers})
const response = await worker.fetch(request(),env)
assert.equal(response.status,200)
assert.equal(response.headers.get('content-disposition'),'attachment; filename="Edon-0.2.0-win-x64.exe"')
assert.equal(await response.text(),'MZnativeEdon executable')
const head = await worker.fetch(request('', 'HEAD'),env)
assert.equal(head.headers.get('content-length'),String(manifest.bytes))
assert.equal(await head.text(),'')
assert.equal((await worker.fetch(request('', 'GET', {'If-None-Match':'"testhash"'}),env)).status,304)
assert.equal((await worker.fetch(request('', 'POST'),env)).status,405)
assert.equal((await worker.fetch(request('.invalid'),env)).status,404)
assets.delete(manifest.chunks[1].path)
await assert.rejects(async()=>{await (await worker.fetch(request(),env)).arrayBuffer()})
console.log('Download tests passed: concatenated bytes, headers, HEAD, ETag, invalid routes, methods and missing assets.')

const proxyResponse=await worker.fetch(request(),{DOWNLOADS:{fetch:()=>new Response('independent release')},ASSETS:{fetch:()=>{throw Error('website assets must not serve EXE')}}});
assert.equal(await proxyResponse.text(),'independent release');
const metaResponse=await worker.fetch(new Request('https://edon.test/downloads/release.json'),{DOWNLOADS:{fetch:()=>Response.json(manifest)}});
assert.equal((await metaResponse.json()).filename,manifest.filename);
console.log('Download isolation passed: releases survive website asset replacement.');

assets.set(manifest.chunks[1].path,data[1]);
const all=new Uint8Array([...data[0],...data[1]]);
for(const range of ['bytes=2-12','bytes=9-','bytes=-5']){const r=await worker.fetch(request('','GET',{range}),env);assert.equal(r.status,206);const actual=new Uint8Array(await r.arrayBuffer());const expected=range==='bytes=2-12'?all.slice(2,13):range==='bytes=9-'?all.slice(9):all.slice(-5);assert.deepEqual(actual,expected);assert.equal(r.headers.get('content-length'),String(expected.length));}
assert.equal((await worker.fetch(request('','GET',{range:'bytes=999-'}),env)).status,416);
console.log('Resumable download tests passed: cross-chunk, open and suffix ranges.');
assert.equal((await worker.fetch(new Request('https://edon.test/download/Edon-0.1.0-win-x64.exe'),env)).status,307);
assert.equal((await worker.fetch(new Request('https://edon.test/download/latest'),env)).headers.get('location'),'https://edon.test/download/'+manifest.filename);
