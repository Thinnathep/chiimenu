export default defineEventHandler(async (event) => {
  // 🛡️ Security Guard: Disabled in production to prevent internal IP disclosure
  if (process.env.NODE_ENV === 'production' && !import.meta.dev) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found'
    })
  }

  try {
    const os = await import('node:os').catch(() => null)
    if (os && typeof os.networkInterfaces === 'function') {
      const nets = os.networkInterfaces()
      if (nets) {
        for (const name of Object.keys(nets)) {
          const netList = nets[name]
          if (Array.isArray(netList)) {
            for (const net of netList) {
              // Skip over non-IPv4 and internal (i.e. 127.0.0.1)
              if (net && net.family === 'IPv4' && !net.internal) {
                return { ip: net.address }
              }
            }
          }
        }
      }
    }
  } catch {
    // Gracefully handle environments where node:os is unavailable (e.g. Cloudflare Workers / Pages)
  }

  return { ip: 'localhost' }
})
