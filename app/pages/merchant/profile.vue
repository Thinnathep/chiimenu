<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(true)
const savingProfile = ref(false)
const savingPassword = ref(false)

const profileError = ref('')
const profileSuccess = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')

const profileForm = ref({
  full_name: '',
  phone: '',
  login_id: ''
})

const passwordForm = ref({
  new_password: '',
  confirm_password: ''
})

onMounted(async () => {
  if (user.value) {
    let email = user.value.email || ''
    if (email.endsWith('@phone.chiimenu.com')) {
      profileForm.value.login_id = email.replace('@phone.chiimenu.com', '')
    } else {
      profileForm.value.login_id = email
    }
    
    // Fetch profile
    try {
      const { data, error } = await (client as any)
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.value.id)
        .single()
        
      if (data) {
        profileForm.value.full_name = data.full_name || ''
        profileForm.value.phone = data.phone || ''
      }
    } catch (e) {
      console.error('Error fetching profile:', e)
    } finally {
      loading.value = false
    }
  }
})

const updateProfile = async () => {
  if (!user.value) return
  savingProfile.value = true
  profileError.value = ''
  profileSuccess.value = ''
  
  try {
    const { error } = await (client as any)
      .from('profiles')
      .update({
        full_name: profileForm.value.full_name,
        phone: profileForm.value.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.value.id)
      
    if (error) throw error
    
    profileSuccess.value = 'อัปเดตข้อมูลส่วนตัวสำเร็จ'
    setTimeout(() => { profileSuccess.value = '' }, 3000)
  } catch (error: any) {
    profileError.value = error.message || 'เกิดข้อผิดพลาดในการอัปเดต'
  } finally {
    savingProfile.value = false
  }
}

const updatePassword = async () => {
  if (passwordForm.value.new_password.length < 6) {
    passwordError.value = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
    return
  }
  
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    passwordError.value = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน'
    return
  }
  
  savingPassword.value = true
  passwordError.value = ''
  passwordSuccess.value = ''
  
  try {
    const { error } = await client.auth.updateUser({
      password: passwordForm.value.new_password
    })
    
    if (error) throw error
    
    passwordSuccess.value = 'อัปเดตรหัสผ่านสำเร็จ'
    passwordForm.value.new_password = ''
    passwordForm.value.confirm_password = ''
    setTimeout(() => { passwordSuccess.value = '' }, 3000)
  } catch (error: any) {
    passwordError.value = error.message || 'เกิดข้อผิดพลาดในการอัปเดตรหัสผ่าน'
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-foreground">โปรไฟล์ส่วนตัว</h1>
      <p class="text-muted-foreground mt-1">จัดการข้อมูลบัญชีผู้ใช้และรหัสผ่าน</p>
    </div>

    <div v-if="loading" class="p-8 text-center text-muted-foreground bg-card rounded-lg border">
      กำลังโหลดข้อมูล...
    </div>

    <div v-else class="space-y-12">
      
      <!-- Profile Details -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-1">
          <h2 class="text-lg font-medium text-foreground">ข้อมูลบัญชีผู้ใช้</h2>
          <p class="text-sm text-muted-foreground mt-1">จัดการชื่อ นามสกุล และเบอร์โทรศัพท์ที่ใช้สำหรับการติดต่อ</p>
        </div>
        <form @submit.prevent="updateProfile" class="lg:col-span-2 bg-card shadow-sm border rounded-lg overflow-hidden">
          <div class="p-6">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              
              <div class="sm:col-span-2">
                <label for="login_id" class="block text-sm font-medium text-foreground">บัญชีเข้าสู่ระบบ (Login ID)</label>
                <input v-model="profileForm.login_id" type="text" id="login_id" disabled class="mt-1 block w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                <p class="mt-1 text-xs text-muted-foreground">ชื่อบัญชีที่ใช้สำหรับเข้าสู่ระบบ (อีเมลหรือเบอร์โทรศัพท์) ไม่สามารถเปลี่ยนแปลงได้</p>
              </div>

              <div>
                <label for="full_name" class="block text-sm font-medium text-foreground">ชื่อ-นามสกุล <span class="text-destructive">*</span></label>
                <input v-model="profileForm.full_name" type="text" id="full_name" required class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              </div>

              <div>
                <label for="phone" class="block text-sm font-medium text-foreground">เบอร์โทรศัพท์</label>
                <input v-model="profileForm.phone" type="text" id="phone" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              </div>

            </div>

            <div v-if="profileError" class="mt-6 rounded-md bg-destructive/10 p-4 border border-destructive/20">
              <p class="text-sm font-medium text-destructive">{{ profileError }}</p>
            </div>
            <div v-if="profileSuccess" class="mt-6 rounded-md bg-green-50 p-4 border border-green-200">
              <p class="text-sm font-medium text-green-800">{{ profileSuccess }}</p>
            </div>
          </div>
          
          <div class="bg-muted/50 px-6 py-4 flex justify-end border-t">
            <button type="submit" :disabled="savingProfile" class="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
              {{ savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
            </button>
          </div>
        </form>
      </div>

      <div class="hidden sm:block border-t border-border"></div>

      <!-- Password Update -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-1">
          <h2 class="text-lg font-medium text-foreground">เปลี่ยนรหัสผ่าน</h2>
          <p class="text-sm text-muted-foreground mt-1">อัปเดตรหัสผ่านใหม่เพื่อความปลอดภัยของบัญชี</p>
        </div>
        <form @submit.prevent="updatePassword" class="lg:col-span-2 bg-card shadow-sm border rounded-lg overflow-hidden">
          <div class="p-6">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              
              <div class="sm:col-span-2 max-w-md">
                <label for="new_password" class="block text-sm font-medium text-foreground">รหัสผ่านใหม่ <span class="text-destructive">*</span></label>
                <input v-model="passwordForm.new_password" type="password" id="new_password" required minlength="6" placeholder="อย่างน้อย 6 ตัวอักษร" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              </div>

              <div class="sm:col-span-2 max-w-md">
                <label for="confirm_password" class="block text-sm font-medium text-foreground">ยืนยันรหัสผ่านใหม่ <span class="text-destructive">*</span></label>
                <input v-model="passwordForm.confirm_password" type="password" id="confirm_password" required minlength="6" placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              </div>

            </div>

            <div v-if="passwordError" class="mt-6 rounded-md bg-destructive/10 p-4 border border-destructive/20 max-w-md">
              <p class="text-sm font-medium text-destructive">{{ passwordError }}</p>
            </div>
            <div v-if="passwordSuccess" class="mt-6 rounded-md bg-green-50 p-4 border border-green-200 max-w-md">
              <p class="text-sm font-medium text-green-800">{{ passwordSuccess }}</p>
            </div>
          </div>
          
          <div class="bg-muted/50 px-6 py-4 flex justify-end border-t">
            <button type="submit" :disabled="savingPassword || !passwordForm.new_password || !passwordForm.confirm_password" class="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
              {{ savingPassword ? 'กำลังอัปเดต...' : 'เปลี่ยนรหัสผ่าน' }}
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</template>
