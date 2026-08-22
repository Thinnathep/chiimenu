export default defineNuxtPlugin(() => {
  const { initFontSize } = useFontSize()
  initFontSize()
})
