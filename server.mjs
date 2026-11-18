import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { request as requestHttps } from 'node:https'
import { extname, relative, resolve, sep } from 'node:path'

const distDirectory = resolve(process.cwd(), 'dist')
const apiOrigin = new URL(
  process.env.TASKFLOW_API_ORIGIN ?? 'https://task-flow-six-rouge.vercel.app',
)

if (apiOrigin.protocol !== 'https:') {
  throw new Error('TASKFLOW_API_ORIGIN must use HTTPS.')
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

function isApiPath(pathname) {
  return pathname === '/api' || pathname.startsWith('/api/')
}

function proxyApi(request, response, pathname, search) {
  const headers = { ...request.headers }
  const hopByHopHeaders = new Set([
    'connection',
    'host',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'proxy-connection',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-port',
    'x-forwarded-proto',
    'x-real-ip',
  ])

  for (const header of hopByHopHeaders) {
    delete headers[header]
  }
  for (const header of String(request.headers.connection ?? '').split(',')) {
    if (header.trim()) delete headers[header.trim().toLowerCase()]
  }

  const upstream = requestHttps({
    hostname: apiOrigin.hostname,
    port: apiOrigin.port || 443,
    method: request.method,
    path: `${pathname}${search}`,
    headers,
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers)
    upstreamResponse.pipe(response)
  })

  upstream.on('error', () => {
    if (response.headersSent) {
      response.destroy()
      return
    }
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({
      error: { code: 'UPSTREAM_UNAVAILABLE', message: 'TaskFlow is temporarily unavailable.' },
    }))
  })

  request.on('aborted', () => upstream.destroy())
  request.pipe(upstream)
}

async function serveStatic(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' })
    response.end()
    return
  }

  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    response.writeHead(400)
    response.end('Bad request')
    return
  }

  const relativePath = decodedPath === '/' || !extname(decodedPath)
    ? 'index.html'
    : decodedPath.slice(1)
  const filePath = resolve(distDirectory, relativePath)
  const fileRelativeToDist = relative(distDirectory, filePath)

  if (
    fileRelativeToDist.startsWith(`..${sep}`) ||
    fileRelativeToDist === '..' ||
    fileRelativeToDist.startsWith(sep)
  ) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  try {
    const fileInfo = await stat(filePath)
    if (!fileInfo.isFile()) throw new Error('Not a file')

    response.writeHead(200, {
      'Content-Length': fileInfo.size,
      'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    })
    if (request.method === 'HEAD') {
      response.end()
    } else {
      createReadStream(filePath).pipe(response)
    }
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost')

  if (requestUrl.pathname === '/healthz') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end('{"status":"ok"}')
    return
  }

  if (isApiPath(requestUrl.pathname)) {
    proxyApi(request, response, requestUrl.pathname, requestUrl.search)
    return
  }

  void serveStatic(request, response, requestUrl.pathname)
})

const port = Number(process.env.PORT ?? 10000)
server.listen(port, '0.0.0.0', () => {
  console.log(`TaskFlow frontend listening on port ${port}`)
})
