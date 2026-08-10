export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  
  if (!user.value) {
    return navigateTo('/login')
  }

  // Basic check for admin path - the real security is RLS and PIN verification
  // But this prevents regular merchants from accidentally navigating to /admin
  const client = useSupabaseClient()
  
  try {
    const { data: profile } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single()
      
    if (!profile || profile.role !== 'super_admin') {
      return navigateTo('/')
    }
  } catch (e) {
    return navigateTo('/')
  }
})
