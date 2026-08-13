export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  
  const { data: authData } = await client.auth.getUser()
  const userId = authData?.user?.id

  if (!userId) {
    return navigateTo('/login')
  }

  // Check admin status from database
  const { data: adminData } = await client
    .from('admins')
    .select('id')
    .eq('id', userId)
    .single()

  if (!adminData) {
    return navigateTo('/')
  }
})
