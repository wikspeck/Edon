export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/download/')) return env.ASSETS.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    const releaseResponse = await env.ASSETS.fetch(new Request(new URL('/downloads/release.json', url), { headers: { Accept: 'application/json' } }))
    if (!releaseResponse.ok || !releaseResponse.headers.get('content-type')?.includes('json')) return new Response('Windows release unavailable', { status: 404 })
    const release = await releaseResponse.json()
    if (url.pathname !== '/download/' + release.filename || !/^Edon-[\d.]+-win-x64\.exe$/.test(release.filename) || !Array.isArray(release.chunks) || !release.chunks.length || release.chunks.length > 20 || release.chunks.some(c => !/^\/downloads\/edon-[a-f0-9]{12}-\d+\.part$/.test(c.path) || !Number.isInteger(c.bytes) || c.bytes <= 0)) return new Response('Release not found', { status: 404 })
    const headers = {
      'Content-Type': 'application/vnd.microsoft.portable-executable',
      'Content-Disposition': 'attachment; filename="' + release.filename + '"',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'ETag': '"' + release.sha256 + '"',
    }
    if (request.headers.get('if-none-match') === headers.ETag) return new Response(null, { status: 304, headers })
    if (request.method === 'HEAD') return new Response(null, { headers: { ...headers, 'Content-Length': String(release.bytes) } })
    // Pull one asset at a time; backpressure keeps the EXE out of Worker memory.
    let index = 0, reader, chunkBytes = 0
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            if (!reader) {
              if (index >= release.chunks.length) { controller.close(); return }
              const chunk = release.chunks[index++]
              const response = await env.ASSETS.fetch(new Request(new URL(chunk.path, url), { headers: { 'Accept-Encoding': 'identity' } }))
              if (!response.ok || !response.body) throw new Error('Download asset unavailable')
              chunkBytes = 0
              reader = response.body.getReader()
            }
            const { done, value } = await reader.read()
            if (done) {
              if (chunkBytes !== release.chunks[index - 1].bytes) throw new Error('Download asset size mismatch')
              reader.releaseLock(); reader = undefined; continue
            }
            chunkBytes += value.byteLength
            controller.enqueue(value); return
          }
        } catch (error) { controller.error(error) }
      },
      async cancel(reason) { if (reader) await reader.cancel(reason) },
    })
    return new Response(stream, { headers })
  },
}
