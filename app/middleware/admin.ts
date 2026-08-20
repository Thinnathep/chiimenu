export default defineNuxtRouteMiddleware(async (to, from) => {
  const client = useSupabaseClient()
  const config = useRuntimeConfig()
  
  const { data: authData } = await client.auth.getUser()
  const user = authData?.user

  if (!user?.id) {
    return navigateTo('/login')
  }

  // 1. Check ADMIN_EMAILS whitelist from runtimeConfig
  const adminEmails = (config.public?.adminEmails || '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean)

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return // Allowed!
  }

  // 2. Check public.admins database table
  try {
    const { data: adminData } = await client
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (adminData?.id) {
      return // Allowed!
    }
  } catch (e) {
    console.warn('[Admin Middleware] Error checking admins table:', e)
  }

  // 3. Check public.profiles role
  try {
    const { data: profileData } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileData?.role === 'admin') {
      return // Allowed!
    }
  } catch (e) {
    console.warn('[Admin Middleware] Error checking profiles table:', e)
  }

  // Not an admin -> Redirect to home
  return navigateTo('/')
})
