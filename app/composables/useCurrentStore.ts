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

      // Fetch store and admin status in parallel
      const [storeRes, adminRes] = await Promise.all([
        client
          .from('stores')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
        client
          .from('admins')
          .select('id')
          .eq('id', userId)
          .maybeSingle()
      ])

      store.value = storeRes.data?.[0] || null
      isAdmin.value = !!adminRes.data
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
