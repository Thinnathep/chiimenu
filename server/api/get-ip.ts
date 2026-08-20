import { networkInterfaces } from 'os'

export default defineEventHandler((event) => {
  // 🛡️ Security Guard: Disabled in production to prevent internal IP disclosure
  if (process.env.NODE_ENV === 'production' && !import.meta.dev) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found'
    })
  }

  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        return { ip: net.address }
      }
    }
  }
  return { ip: 'localhost' }
})
