import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' | 'top-center' | 'bottom-center'

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number
  position?: ToastPosition
  createdAt: number
}

const toasts = ref<ToastItem[]>([])
const globalPosition = ref<ToastPosition>('top-right')

export const useToast = () => {
  const show = (options: {
    message: string
    title?: string
    type?: ToastType
    duration?: number
    position?: ToastPosition
  }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: ToastItem = {
      id,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      duration: options.duration !== undefined ? options.duration : 4000,
      position: options.position || globalPosition.value,
      createdAt: Date.now()
    }

    toasts.value.push(toast)

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, toast.duration)
    }

    return id
  }

  const success = (message: string, title?: string, position?: ToastPosition) => {
    return show({ message, title, type: 'success', position })
  }

  const error = (message: string, title?: string, position?: ToastPosition) => {
    return show({ message, title, type: 'error', duration: 5000, position })
  }

  const warning = (message: string, title?: string, position?: ToastPosition) => {
    return show({ message, title, type: 'warning', duration: 4500, position })
  }

  const info = (message: string, title?: string, position?: ToastPosition) => {
    return show({ message, title, type: 'info', position })
  }

  const dismiss = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const setGlobalPosition = (pos: ToastPosition) => {
    globalPosition.value = pos
  }

  const clearAll = () => {
    toasts.value = []
  }

  return {
    toasts,
    globalPosition,
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    setGlobalPosition,
    clearAll
  }
}
