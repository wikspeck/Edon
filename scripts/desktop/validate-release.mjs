import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const root = new URL('../../public/downloads/', import.meta.url)
const release = JSON.parse(await readFile(new URL('release.json', root), 'utf8'))
const hash = createHash('sha256')
let bytes = 0
for (const chunk of release.chunks) {
  if (!/^\/downloads\/edon-[a-f0-9]{12}-\d+\.part$/.test(chunk.path)) throw Error('Invalid release asset')
  const data = await readFile(new URL(chunk.path.slice('/downloads/'.length), root))
  if(data.length !== chunk.bytes) throw Error('Incomplete release asset')
  hash.update(data); bytes += data.length
}
if(bytes !== release.bytes || hash.digest('hex') !== release.sha256) throw Error('Release integrity mismatch')
console.log(`Release validated: ${release.version}, ${bytes} bytes`)
