import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const directory = new URL('../../public/downloads/', import.meta.url)
const { version } = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
const filename = `Edon-${version}-win-x64.exe`
const exe = await readFile(new URL('../../artifacts/electron/' + filename, import.meta.url))
await mkdir(directory, { recursive: true })
for (const name of await readdir(directory)) if (/^edon-.*\.part$/.test(name)) await unlink(new URL(name, directory))
const sha256 = createHash('sha256').update(exe).digest('hex')
const chunks = []
for (let offset = 0, index = 0; offset < exe.length; offset += 20 * 1024 * 1024, index++) {
  const name = 'edon-' + sha256.slice(0, 12) + '-' + index + '.part'
  const chunk = exe.subarray(offset, offset + 20 * 1024 * 1024)
  await writeFile(new URL(name, directory), chunk)
  chunks.push({ path: '/downloads/' + name, bytes: chunk.length })
}
await writeFile(new URL('release.json', directory), JSON.stringify({ version, filename, url: '/download/' + filename, bytes: exe.length, sha256, chunks, signed: false }, null, 2))
console.log('Windows download packaged: ' + exe.length + ' bytes in ' + chunks.length + ' assets.')
