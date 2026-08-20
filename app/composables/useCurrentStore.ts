export const useCurrentStore = () => {
  const client = useSupabaseClient()
  const store = useState<any>('current_merchant_store', () => null)
  const isAdmin = useState<boolean>('current_user_is_admin', () => false)
  const loading = useState<boolean>('current_store_loading', () => false)
  const isLoaded = useState<boolean>('current_store_loaded', () => false)

  const fetchStore = async (force = false) => {
    if (isLoaded.value && !force) {
      return { store: store.value, isAdmin: isAdmin.value }
    }

    loading.value = true
    try {
      const { data: authData } = await client.auth.getUser()
      if (!authData?.user?.id) {
        store.value = null
        isAdmin.value = false
        isLoaded.value = true
        return { store: null, isAdmin: false }
      }

      const userId = authData.user.id
      const userEmail = authData.user.email?.toLowerCase() || ''

      // 1. Check ADMIN_EMAILS whitelist from runtimeConfig
      const config = useRuntimeConfig()
      const adminEmails = (config.public?.adminEmails || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean)

      const isEmailAdmin = userEmail ? adminEmails.includes(userEmail) : false

      // 2. Fetch store, admin status, and profile in parallel
      const [storeRes, adminRes, profileRes] = await Promise.all([
        client
          .from('stores')
          .select('*')
          .eq('owner_id', userId)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .limit(1),
        client
          .from('admins')
          .select('id')
          .eq('id', userId)
          .maybeSingle(),
        client
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle()
      ])

      store.value = storeRes.data?.[0] || null
      isAdmin.value = isEmailAdmin || !!adminRes.data || (profileRes.data as any)?.role === 'admin'
      isLoaded.value = true
    } catch (err) {
      console.error('useCurrentStore error:', err)
    } finally {
      loading.value = false
    }

    return { store: store.value, isAdmin: isAdmin.value }
  }

  const setStore = (newStore: any) => {
    store.value = newStore
    isLoaded.value = true
  }

  const clearStore = () => {
    store.value = null
    isAdmin.value = false
    isLoaded.value = false
  }

  return {
    store,
    isAdmin,
    loading,
    isLoaded,
    fetchStore,
    setStore,
    clearStore
  }
}
