export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (env.DOWNLOADS && (url.pathname.startsWith('/download/') || url.pathname === '/downloads/release.json')) return env.DOWNLOADS.fetch(request)
    if (!url.pathname.startsWith('/download/')) return env.ASSETS.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    const releaseResponse = await env.ASSETS.fetch(new Request(new URL('/downloads/release.json', url), { headers: { Accept: 'application/json' } }))
    if (!releaseResponse.ok || !releaseResponse.headers.get('content-type')?.includes('json')) return new Response('Windows release unavailable', { status: 404 })
    const release = await releaseResponse.json()
    if (/^Edon-[\d.]+-win-x64\.exe$/.test(release.filename) && url.pathname !== '/download/' + release.filename && (url.pathname === '/download/latest' || /^\/download\/Edon-[\d.]+-win-x64\.exe$/.test(url.pathname))) return Response.redirect(new URL('/download/' + release.filename,url).href,307)
    if (url.pathname !== '/download/' + release.filename || !/^Edon-[\d.]+-win-x64\.exe$/.test(release.filename) || !Array.isArray(release.chunks) || !release.chunks.length || release.chunks.length > 20 || release.chunks.some(c => !/^\/downloads\/edon-[a-f0-9]{12}-\d+\.part$/.test(c.path) || !Number.isInteger(c.bytes) || c.bytes <= 0)) return new Response('Release not found', { status: 404 })
    const headers = {
      'Content-Type': 'application/vnd.microsoft.portable-executable',
      'Content-Disposition': 'attachment; filename="' + release.filename + '"',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'ETag': '"' + release.sha256 + '"',
      'Accept-Ranges': 'bytes',
    }
    if (request.headers.get('if-none-match') === headers.ETag) return new Response(null, { status: 304, headers })
    if (request.method === 'HEAD') return new Response(null, { headers: { ...headers, 'Content-Length': String(release.bytes) } })
    let start = 0, end = release.bytes - 1, status = 200
    const range = request.headers.get('range')
    if (range && (!request.headers.get('if-range') || request.headers.get('if-range') === headers.ETag)) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (!match || (!match[1] && !match[2])) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${release.bytes}`}})
      start = match[1] ? Number(match[1]) : Math.max(0,release.bytes - Number(match[2]))
      end = match[1] && match[2] ? Math.min(Number(match[2]),release.bytes-1) : release.bytes-1
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=release.bytes) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${release.bytes}`}})
      status = 206
      headers['Content-Range'] = `bytes ${start}-${end}/${release.bytes}`
    }
    const length = end - start + 1
    headers['Content-Length'] = String(length)
    // Pull one asset at a time; backpressure keeps the EXE out of Worker memory.
    let index = 0, reader, chunkBytes = 0, position = 0
    while(index < release.chunks.length && position + release.chunks[index].bytes <= start) position += release.chunks[index++].bytes
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            if(position > end) {if(reader)await reader.cancel(); controller.close();return}
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
            const selected = value.subarray(Math.max(0,start-position),Math.min(value.byteLength,end-position+1))
            position += value.byteLength
            if(selected.byteLength) {controller.enqueue(selected); return}
          }
        } catch (error) { controller.error(error) }
      },
      async cancel(reason) { if (reader) await reader.cancel(reason) },
    })
    // Cloudflare requires a fixed-length stream to advertise Content-Length.
    if (typeof FixedLengthStream !== 'undefined') {
      const fixed = new FixedLengthStream(length)
      void stream.pipeTo(fixed.writable).catch(() => {})
      return new Response(fixed.readable,{status,headers})
    }
    return new Response(stream, { status, headers })
  },
}
