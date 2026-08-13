import { ref } from 'vue'

export type AlertOptions = {
  title: string
  text?: string
  icon?: 'warning' | 'error' | 'success' | 'info'
  showCancelButton?: boolean
  confirmButtonText?: string
  cancelButtonText?: string
  confirmButtonColor?: string
  cancelButtonColor?: string
  timer?: number
  showConfirmButton?: boolean
}

const alertState = ref({
  isOpen: false,
  options: null as AlertOptions | null,
  resolve: null as ((value: { isConfirmed: boolean }) => void) | null,
  timerId: null as any
})

export const useAlert = () => {
  const fire = (options: AlertOptions | string, text?: string, icon?: AlertOptions['icon']): Promise<{ isConfirmed: boolean }> => {
    return new Promise((resolve) => {
      let parsedOptions: AlertOptions
      if (typeof options === 'string') {
        parsedOptions = { title: options, text, icon }
      } else {
        parsedOptions = options
      }
      
      const finalOptions = {
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancel',
        icon: 'info' as const,
        showConfirmButton: true,
        ...parsedOptions
      }

      alertState.value.options = finalOptions
      alertState.value.resolve = resolve
      alertState.value.isOpen = true

      if (alertState.value.timerId) {
        clearTimeout(alertState.value.timerId)
      }
      
      if (finalOptions.timer) {
        alertState.value.timerId = setTimeout(() => {
          close(false)
        }, finalOptions.timer)
      }
    })
  }

  const close = (isConfirmed: boolean) => {
    alertState.value.isOpen = false
    if (alertState.value.timerId) {
      clearTimeout(alertState.value.timerId)
      alertState.value.timerId = null
    }
    if (alertState.value.resolve) {
      alertState.value.resolve({ isConfirmed })
      alertState.value.resolve = null
    }
    
    setTimeout(() => {
      if (!alertState.value.isOpen) {
        alertState.value.options = null
      }
    }, 300)
  }

  return {
    alertState,
    fire,
    close
  }
}
