import downloadWorker from './index.js'
export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname
    if (pathname === '/downloads/release.json') {
      const response = await env.ASSETS.fetch(new Request(new URL('/release.json', request.url), request))
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'no-store')
      return new Response(response.body, {status:response.status,headers})
    }
    if (!pathname.startsWith('/download/')) return new Response('Not found', {status:404})
    return downloadWorker.fetch(request, {ASSETS:{fetch: assetRequest => {
      const url = new URL(assetRequest.url)
      url.pathname = url.pathname.replace(/^\/downloads\//, '/')
      return env.ASSETS.fetch(new Request(url, assetRequest))
    }}})
  }
}
