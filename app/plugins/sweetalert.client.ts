import Swal from 'sweetalert2'

export default defineNuxtPlugin((nuxtApp) => {
  // Inject swal globally in Vue and Nuxt
  nuxtApp.provide('swal', Swal)
})
