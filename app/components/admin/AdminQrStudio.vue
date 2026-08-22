<script setup lang="ts">
import QRCode from 'qrcode'
import JSZip from 'jszip'
import { 
  QrCode, 
  Download, 
  Sparkles, 
  Palette, 
  Layers, 
  Printer, 
  FileCode, 
  Image, 
  FolderArchive, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  RefreshCw, 
  Check, 
  Copy, 
  ExternalLink,
  Store,
  Eye,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2
} from 'lucide-vue-next'

const props = defineProps<{
  stores: any[]
  initialStoreId?: string
}>()

const client = useSupabaseClient()
const selectedStoreId = ref<string>(props.initialStoreId || '')
const currentStore = computed(() => props.stores.find(s => s.id === selectedStoreId.value) || null)

// QR List State
const qrCodes = ref<any[]>([])
const loading = ref(false)
const generating = ref(false)
const batchGenerating = ref(false)
const batchCount = ref(10)
const newQrLabel = ref('')
const newQrTableId = ref('')

// Selected QR for Designer Preview
const selectedQr = ref<any>(null)

// Designer Settings
const qrColor = ref('#E8572E') // Primary dot color
const qrBgColor = ref('#FFFFFF') // Background color
const qrLogoOption = ref<'none' | 'chiimenu' | 'store'>('chiimenu')
const templateStyle = ref<'minimal' | 'table_tent' | 'acrylic_dark' | 'sticker'>('table_tent')
const previewDataUrl = ref('')
const previewSvg = ref('')
const baseUrl = ref('http://localhost:3000')

// Color Presets
const colorPresets = [
  { name: 'Warm Coral', hex: '#E8572E' },
  { name: 'Deep Forest Teal', hex: '#1B4B4A' },
  { name: 'Amber Gold', hex: '#F0A73C' },
  { name: 'Pitch Black', hex: '#000000' },
  { name: 'Royal Indigo', hex: '#4F46E5' },
  { name: 'Ruby Crimson', hex: '#DC2626' }
]

onMounted(async () => {
  if (process.client) {
    baseUrl.value = window.location.origin
    if (import.meta.dev && window.location.hostname === 'localhost') {
      try {
        const { ip } = await $fetch<any>('/api/get-ip')
        if (ip && ip !== 'localhost') {
          baseUrl.value = `http://${ip}:${window.location.port || 3000}`
        }
      } catch (e) {}
    }
  }

  if (!selectedStoreId.value && props.stores.length > 0) {
    selectedStoreId.value = props.stores[0].id
  }

  if (selectedStoreId.value) {
    await fetchQrCodes()
  }
})

watch(() => props.initialStoreId, (newId) => {
  if (newId && newId !== selectedStoreId.value) {
    selectedStoreId.value = newId
    fetchQrCodes()
  }
})

watch(selectedStoreId, () => {
  fetchQrCodes()
})

const fetchQrCodes = async () => {
  if (!selectedStoreId.value) return
  loading.value = true
  try {
    const { data } = await client
      .from('qr_codes')
      .select('*')
      .eq('store_id', selectedStoreId.value)
      .order('created_at', { ascending: true })

    qrCodes.value = data || []
    if (qrCodes.value.length > 0) {
      selectedQr.value = qrCodes.value[0]
      await renderDesignerPreview()
    } else {
      selectedQr.value = null
      previewDataUrl.value = ''
    }
  } catch (err) {
    console.error('Fetch QR error:', err)
  } finally {
    loading.value = false
  }
}

const generateRandomString = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Create Single QR Code
const createSingleQr = async () => {
  if (!selectedStoreId.value) return
  generating.value = true

  const shortCode = generateRandomString(6)
  const label = newQrLabel.value.trim() || `โต๊ะ ${qrCodes.value.length + 1}`
  const tableId = newQrTableId.value.trim() || `${qrCodes.value.length + 1}`

  const { data, error } = await (client as any).from('qr_codes').insert({
    store_id: selectedStoreId.value,
    label,
    table_identifier: tableId,
    short_code: shortCode,
    is_active: true
  }).select().single()

  generating.value = false

  if (!error && data) {
    newQrLabel.value = ''
    newQrTableId.value = ''
    useToast().success(`สร้าง QR Code (${label}) สำเร็จ!`)
    await fetchQrCodes()
    selectedQr.value = data
    await renderDesignerPreview()
  } else {
    useToast().error('ไม่สามารถสร้าง QR Code ได้: ' + (error?.message || ''))
  }
}

// Batch Generate Tables 1 to N
const batchGenerateTables = async () => {
  if (!selectedStoreId.value) return
  if (!confirm(`คุณต้องการสร้าง QR Code ประจำโต๊ะ 1 ถึง ${batchCount.value} สำหรับร้านนี้ใช่หรือไม่?`)) return

  batchGenerating.value = true
  const rows = []
  for (let i = 1; i <= batchCount.value; i++) {
    rows.push({
      store_id: selectedStoreId.value,
      label: `โต๊ะ ${i}`,
      table_identifier: `${i}`,
      short_code: generateRandomString(6),
      is_active: true
    })
  }

  const { error } = await (client as any).from('qr_codes').insert(rows)
  batchGenerating.value = false

  if (!error) {
    useToast().success(`สร้าง QR Code จำนวน ${batchCount.value} โต๊ะเรียบร้อยแล้ว!`)
    await fetchQrCodes()
  } else {
    useToast().error('Batch generate error: ' + error.message)
  }
}

const toggleQrStatus = async (qr: any) => {
  const newStatus = !qr.is_active
  qr.is_active = newStatus
  await (client as any).from('qr_codes').update({ is_active: newStatus }).eq('id', qr.id)
  useToast().info(newStatus ? 'เปิดใช้งาน QR แล้ว' : 'ระงับการใช้งาน QR แล้ว')
}

const deleteQr = async (id: string) => {
  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ QR Code นี้?')) return
  await (client as any).from('qr_codes').delete().eq('id', id)
  useToast().success('ลบ QR Code เรียบร้อยแล้ว')
  await fetchQrCodes()
}

// Watch designer changes to update preview
watch([qrColor, qrBgColor, qrLogoOption, templateStyle, selectedQr], () => {
  renderDesignerPreview()
})

const getTargetUrl = (qr: any) => {
  if (!qr) return `${baseUrl.value}/m/demo`
  let url = `${baseUrl.value}/m/${qr.short_code}`
  if (qr.table_identifier) {
    url += `?t=${encodeURIComponent(qr.table_identifier)}`
  }
  return url
}

// Render Designer Preview
const renderDesignerPreview = async () => {
  if (!selectedQr.value) {
    previewDataUrl.value = ''
    return
  }

  const url = getTargetUrl(selectedQr.value)

  try {
    const rawQrDataUrl = await QRCode.toDataURL(url, {
      width: 600,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: qrColor.value,
        light: qrBgColor.value === 'transparent' ? '#00000000' : qrBgColor.value
      }
    })

    previewSvg.value = await QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: qrColor.value,
        light: qrBgColor.value === 'transparent' ? '#ffffff00' : qrBgColor.value
      }
    })

    previewDataUrl.value = await drawCompositeCard(rawQrDataUrl, selectedQr.value, templateStyle.value)
  } catch (e) {
    console.error('Render QR error:', e)
  }
}

// Draw Composite Canvas Card
const drawCompositeCard = (qrDataUrl: string, qr: any, style: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return resolve(qrDataUrl)

    const qrImg = new window.Image()
    qrImg.crossOrigin = 'anonymous'
    qrImg.onload = () => {
      if (style === 'minimal') {
        canvas.width = 800
        canvas.height = 950
        ctx.fillStyle = qrBgColor.value === 'transparent' ? '#FFFFFF' : qrBgColor.value
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.drawImage(qrImg, 100, 80, 600, 600)

        ctx.fillStyle = '#111827'
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(qr.label || `โต๊ะ ${qr.table_identifier || ''}`, canvas.width / 2, 740)

        ctx.fillStyle = '#6B7280'
        ctx.font = '20px sans-serif'
        ctx.fillText(`${baseUrl.value}/m/${qr.short_code}`, canvas.width / 2, 790)

        resolve(canvas.toDataURL('image/png', 1.0))
      } else if (style === 'table_tent') {
        canvas.width = 1200
        canvas.height = 1800

        ctx.fillStyle = '#FBF6EE'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
        gradient.addColorStop(0, '#E8572E')
        gradient.addColorStop(1, '#F0A73C')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, 240)

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 64px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('🥢 ChiiMenu', canvas.width / 2, 110)

        ctx.font = '30px sans-serif'
        ctx.fillText('Tourist-Ready Smart Ordering', canvas.width / 2, 170)

        ctx.fillStyle = '#1B4B4A'
        ctx.font = 'bold 52px sans-serif'
        ctx.fillText('สแกนสั่งอาหาร', canvas.width / 2, 350)

        ctx.fillStyle = '#E8572E'
        ctx.font = 'bold 38px sans-serif'
        ctx.fillText('Scan to Order • 扫码点餐', canvas.width / 2, 410)

        ctx.fillStyle = '#FFFFFF'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)'
        ctx.shadowBlur = 30
        ctx.shadowOffsetY = 12
        roundRect(ctx, 150, 480, 900, 900, 40)
        ctx.fill()
        ctx.shadowColor = 'transparent'

        ctx.drawImage(qrImg, 200, 530, 800, 800)

        ctx.fillStyle = '#1B4B4A'
        roundRect(ctx, canvas.width / 2 - 200, 1420, 400, 100, 30)
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 44px sans-serif'
        ctx.fillText(qr.label || `โต๊ะ ${qr.table_identifier || '01'}`, canvas.width / 2, 1485)

        ctx.fillStyle = '#4B5563'
        ctx.font = '28px sans-serif'
        ctx.fillText('🇹🇭 เมนูไทย  •  🇺🇸 English Menu  •  🇨🇳 中文菜单', canvas.width / 2, 1600)

        ctx.fillStyle = '#9CA3AF'
        ctx.font = '22px sans-serif'
        ctx.fillText('ไม่ต้องโหลดแอป • ออเดอร์ส่งตรงเข้าครัวทันที', canvas.width / 2, 1660)

        ctx.fillStyle = '#E8572E'
        ctx.font = 'bold 24px sans-serif'
        ctx.fillText('Powered by ChiiMenu', canvas.width / 2, 1740)

        resolve(canvas.toDataURL('image/png', 1.0))
      } else if (style === 'acrylic_dark') {
        canvas.width = 1200
        canvas.height = 1700

        ctx.fillStyle = '#0F1E1E'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.strokeStyle = '#E8572E'
        ctx.lineWidth = 12
        roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 50)
        ctx.stroke()

        ctx.fillStyle = '#F0A73C'
        ctx.font = 'bold 50px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('🥢 DIGITAL MENU & ORDER', canvas.width / 2, 160)

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 56px sans-serif'
        ctx.fillText(currentStore.value?.name || 'ChiiMenu Restaurant', canvas.width / 2, 260)

        ctx.fillStyle = '#9CA3AF'
        ctx.font = '32px sans-serif'
        ctx.fillText('Scan with Camera or LINE • 扫码点单', canvas.width / 2, 330)

        ctx.fillStyle = '#FFFFFF'
        roundRect(ctx, 160, 400, 880, 880, 40)
        ctx.fill()

        ctx.drawImage(qrImg, 200, 440, 800, 800)

        ctx.fillStyle = '#E8572E'
        roundRect(ctx, canvas.width / 2 - 220, 1340, 440, 110, 30)
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 50px sans-serif'
        ctx.fillText(`TABLE ${qr.table_identifier || '01'}`, canvas.width / 2, 1415)

        ctx.fillStyle = '#6EE7B7'
        ctx.font = '26px sans-serif'
        ctx.fillText('✓ Instant Kitchen Dispatch  ✓ AI Translation', canvas.width / 2, 1540)

        resolve(canvas.toDataURL('image/png', 1.0))
      } else {
        canvas.width = 1000
        canvas.height = 1000
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.strokeStyle = '#E8572E'
        ctx.lineWidth = 16
        roundRect(ctx, 30, 30, 940, 940, 60)
        ctx.stroke()

        ctx.drawImage(qrImg, 100, 80, 800, 800)

        ctx.fillStyle = '#1B4B4A'
        ctx.font = 'bold 44px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`${qr.label || 'โต๊ะ ' + (qr.table_identifier || '')} • Scan to Order`, canvas.width / 2, 930)

        resolve(canvas.toDataURL('image/png', 1.0))
      }
    }
    qrImg.src = qrDataUrl
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2
  if (h < 2 * r) r = w / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Single Exports
const downloadSinglePng = async (qr: any) => {
  const url = getTargetUrl(qr)
  const highResUrl = await QRCode.toDataURL(url, {
    width: 2048,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: qrColor.value, light: qrBgColor.value }
  })
  const link = document.createElement('a')
  link.download = `ChiiMenu-QR-${qr.label || qr.short_code}-300DPI.png`
  link.href = highResUrl
  link.click()
  useToast().success(`ดาวน์โหลด Ultra High-Res PNG (${qr.label}) สำเร็จ!`)
}

const downloadSingleSvg = async (qr: any) => {
  const url = getTargetUrl(qr)
  const svgString = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: qrColor.value, light: qrBgColor.value }
  })
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `ChiiMenu-QR-${qr.label || qr.short_code}-Vector.svg`
  link.href = blobUrl
  link.click()
  URL.revokeObjectURL(blobUrl)
  useToast().success(`ดาวน์โหลด Vector SVG (${qr.label}) สำเร็จ!`)
}

const downloadSingleStandee = () => {
  if (!previewDataUrl.value || !selectedQr.value) return
  const link = document.createElement('a')
  link.download = `ChiiMenu-Standee-${selectedQr.value.label || selectedQr.value.short_code}.png`
  link.href = previewDataUrl.value
  link.click()
  useToast().success(`ดาวน์โหลด Standee Card สำหรับพิมพ์สำเร็จ!`)
}

// BATCH ZIP EXPORT
const isExportingZip = ref(false)
const downloadAllAsZip = async () => {
  if (qrCodes.value.length === 0) {
    useToast().warning('ไม่มีรายการ QR Code ให้ดาวน์โหลด')
    return
  }

  isExportingZip.value = true
  useToast().info('กำลังเรนเดอร์และแพ็กเกจไฟล์ ZIP ทุกโต๊ะ...')

  try {
    const zip = new JSZip()
    const folderPng = zip.folder('1_PNG_HighRes_300DPI')
    const folderSvg = zip.folder('2_SVG_Vector')
    const folderCards = zip.folder('3_Standee_PrintReady')

    for (let i = 0; i < qrCodes.value.length; i++) {
      const qr = qrCodes.value[i]
      const url = getTargetUrl(qr)
      const sanitizedName = (qr.label || `Table_${qr.table_identifier || i + 1}`).replace(/[^a-zA-Z0-9ก-๙_-]/g, '_')

      const pngData = await QRCode.toDataURL(url, {
        width: 2048,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: qrColor.value, light: qrBgColor.value }
      })
      const pngBase64 = pngData.replace(/^data:image\/png;base64,/, '')
      folderPng?.file(`${sanitizedName}_300DPI.png`, pngBase64, { base64: true })

      const svgString = await QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: qrColor.value, light: qrBgColor.value }
      })
      folderSvg?.file(`${sanitizedName}_Vector.svg`, svgString)

      const cardData = await drawCompositeCard(pngData, qr, templateStyle.value)
      const cardBase64 = cardData.replace(/^data:image\/png;base64,/, '')
      folderCards?.file(`${sanitizedName}_StandeeCard.png`, cardBase64, { base64: true })
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipUrl = URL.createObjectURL(zipBlob)
    const storeSlug = currentStore.value?.slug || 'Store'
    const link = document.createElement('a')
    link.download = `ChiiMenu-${storeSlug}-All-Tables-QRs.zip`
    link.href = zipUrl
    link.click()
    URL.revokeObjectURL(zipUrl)

    useToast().success(`ดาวน์โหลดไฟล์ ZIP ครบทุกโต๊ะ (${qrCodes.value.length} โต๊ะ) สำเร็จ!`)
  } catch (err: any) {
    console.error('ZIP Export error:', err)
    useToast().error('เกิดข้อผิดพลาดในการสร้างไฟล์ ZIP: ' + err.message)
  } finally {
    isExportingZip.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Top Store Selector Banner -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#132525] border border-[#E8E2D9] dark:border-[#1B4B4A] shadow-sm transition-colors">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E8572E] to-[#F0A73C] p-0.5 shadow-md shrink-0">
          <div class="w-full h-full bg-white dark:bg-[#0c1818] rounded-xl flex items-center justify-center text-[#E8572E]">
            <QrCode class="w-5 h-5" />
          </div>
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Advanced QR Studio & Export Suite
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            ออกแบบ ตกแต่ง และดาวน์โหลด QR Code ความละเอียดสูงพิเศษ (300 DPI / SVG / Standee Card / ZIP)
          </p>
        </div>
      </div>

      <!-- Store Dropdown Selector -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">เลือกร้านค้า:</label>
        <select 
          v-model="selectedStoreId"
          class="px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#E8572E] outline-none transition-colors"
        >
          <option v-for="s in stores" :key="s.id" :value="s.id">
            {{ s.name }} ({{ s.slug }})
          </option>
        </select>
      </div>
    </div>

    <!-- MAIN TWO-COLUMN STUDIO LAYOUT -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- LEFT COLUMN: QR Designer Controls & Settings (5 Cols) -->
      <div class="lg:col-span-5 space-y-6">
        
        <!-- Designer Styling Card -->
        <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#132525] border border-[#E8E2D9] dark:border-[#1B4B4A] shadow-sm space-y-5 transition-colors">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
            <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
              <Palette class="w-4 h-4 text-[#E8572E]" />
              ปรับแต่งดีไซน์ QR Code (Live Visual Customizer)
            </h3>
            <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-[#E8572E]/10 text-[#E8572E] font-bold">300 DPI Ready</span>
          </div>

          <!-- Color Presets -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-800 dark:text-gray-200">สีจุด QR Code (Dot Color)</label>
            <div class="flex flex-wrap items-center gap-2">
              <button 
                v-for="p in colorPresets" 
                :key="p.hex"
                @click="qrColor = p.hex"
                class="w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer shadow-sm hover:scale-105"
                :style="{ backgroundColor: p.hex, borderColor: qrColor === p.hex ? '#E8572E' : 'transparent' }"
                :title="p.name"
              >
                <Check v-if="qrColor === p.hex" class="w-3.5 h-3.5 text-white drop-shadow" />
              </button>

              <!-- Custom Color Input -->
              <div class="flex items-center gap-1.5 ml-auto">
                <span class="text-xs text-gray-500">Hex:</span>
                <input 
                  v-model="qrColor" 
                  type="text" 
                  class="w-24 px-2 py-1 text-xs rounded-lg bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white font-mono text-center uppercase outline-none focus:border-[#E8572E]"
                />
              </div>
            </div>
          </div>

          <!-- Background Color -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-800 dark:text-gray-200">สีพื้นหลัง (Background)</label>
            <div class="grid grid-cols-3 gap-2">
              <button 
                @click="qrBgColor = '#FFFFFF'"
                class="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer"
                :class="qrBgColor === '#FFFFFF' ? 'border-[#E8572E] bg-[#E8572E]/10 text-[#E8572E]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-700 dark:text-gray-300'"
              >
                ขาว (White)
              </button>
              <button 
                @click="qrBgColor = '#FBF6EE'"
                class="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer"
                :class="qrBgColor === '#FBF6EE' ? 'border-[#E8572E] bg-[#E8572E]/10 text-[#E8572E]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-700 dark:text-gray-300'"
              >
                ครีม (Warm Cream)
              </button>
              <button 
                @click="qrBgColor = 'transparent'"
                class="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer"
                :class="qrBgColor === 'transparent' ? 'border-[#E8572E] bg-[#E8572E]/10 text-[#E8572E]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-700 dark:text-gray-300'"
              >
                โปร่งใส (Alpha)
              </button>
            </div>
          </div>

          <!-- Standee Template Selector -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-800 dark:text-gray-200">รูปแบบป้ายตั้งโต๊ะ (Standee & Frame Template)</label>
            <div class="grid grid-cols-2 gap-2">
              <button 
                @click="templateStyle = 'table_tent'"
                class="p-3 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer"
                :class="templateStyle === 'table_tent' ? 'border-[#E8572E] bg-[#E8572E]/10 ring-1 ring-[#E8572E]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 hover:border-gray-300'"
              >
                <div class="text-xs font-bold text-gray-900 dark:text-white">1. ChiiMenu Table Tent</div>
                <p class="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">ป้าย 4x6" / A6 มาตรฐาน 3 ภาษา</p>
              </button>

              <button 
                @click="templateStyle = 'acrylic_dark'"
                class="p-3 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer"
                :class="templateStyle === 'acrylic_dark' ? 'border-[#E8572E] bg-[#E8572E]/10 ring-1 ring-[#E8572E]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 hover:border-gray-300'"
              >
                <div class="text-xs font-bold text-gray-900 dark:text-white">2. Dark Acrylic Standee</div>
                <p class="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">กรอบสีทีลหรูหรา สำหรับโต๊ะอาหาร</p>
              </button>

              <button 
                @click="templateStyle = 'minimal'"
                class="p-3 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer"
                :class="templateStyle === 'minimal' ? 'border-[#E8572E] bg-[#E8572E]/10 ring-1 ring-[#E8572E]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 hover:border-gray-300'"
              >
                <div class="text-xs font-bold text-gray-900 dark:text-white">3. Clean Minimalist</div>
                <p class="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">เน้น QR Code พร้อมเลขโต๊ะเรียบง่าย</p>
              </button>

              <button 
                @click="templateStyle = 'sticker'"
                class="p-3 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer"
                :class="templateStyle === 'sticker' ? 'border-[#E8572E] bg-[#E8572E]/10 ring-1 ring-[#E8572E]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 hover:border-gray-300'"
              >
                <div class="text-xs font-bold text-gray-900 dark:text-white">4. Compact Square</div>
                <p class="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">สติกเกอร์จัตุรัส 1:1 ติดแก้ว/โต๊ะ</p>
              </button>
            </div>
          </div>
        </div>

        <!-- Create New Tables & Batch Generate Card -->
        <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#132525] border border-[#E8E2D9] dark:border-[#1B4B4A] shadow-sm space-y-4 transition-colors">
          <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
            <Plus class="w-4 h-4 text-emerald-500" />
            สร้าง QR Code ประจำโต๊ะ (Table Management)
          </h3>

          <!-- Single Table Form -->
          <form @submit.prevent="createSingleQr" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-gray-500 dark:text-gray-400 mb-1 font-medium">ชื่อป้าย / Label</label>
                <input 
                  v-model="newQrLabel"
                  type="text" 
                  placeholder="เช่น โต๊ะ 1, บาร์"
                  class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-[#E8572E] outline-none transition-colors"
                />
              </div>
              <div>
                <label class="block text-[11px] text-gray-500 dark:text-gray-400 mb-1 font-medium">รหัสโต๊ะ (Identifier)</label>
                <input 
                  v-model="newQrTableId"
                  type="text" 
                  placeholder="เช่น 1, A1"
                  class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-[#E8572E] outline-none transition-colors"
                />
              </div>
            </div>

            <button 
              type="submit"
              :disabled="generating"
              class="w-full py-2.5 px-4 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold text-xs shadow-md shadow-[#E8572E]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw v-if="generating" class="w-3.5 h-3.5 animate-spin" />
              <Plus v-else class="w-3.5 h-3.5" />
              {{ generating ? 'กำลังสร้าง...' : 'สร้าง QR โต๊ะใหม่' }}
            </button>
          </form>

          <!-- Batch Generator Divider -->
          <div class="pt-3 border-t border-gray-100 dark:border-white/10">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-bold text-gray-900 dark:text-white">⚡ Batch Generate Tables 1 to N</div>
                <p class="text-[10px] text-gray-500 dark:text-gray-400">สร้าง QR Code โต๊ะ 1 ถึง N ในคลิกเดียว</p>
              </div>

              <div class="flex items-center gap-2">
                <input 
                  v-model.number="batchCount" 
                  type="number" 
                  min="1" 
                  max="50"
                  class="w-16 px-2 py-1.5 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs font-bold text-center"
                />
                <button 
                  @click="batchGenerateTables"
                  :disabled="batchGenerating"
                  class="px-3.5 py-1.5 rounded-xl bg-[#1B4B4A] hover:bg-[#1B4B4A]/90 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  {{ batchGenerating ? 'กำลังสร้าง...' : 'สร้างชุด' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Global Batch ZIP Export Action Card -->
        <div class="p-5 rounded-2xl bg-gradient-to-br from-[#1B4B4A] via-[#132525] to-[#0c1818] border border-[#1B4B4A] text-white shadow-xl space-y-3">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <FolderArchive class="w-5 h-5 text-[#F0A73C]" />
                <span class="font-bold text-sm">Batch Download All Tables (ZIP)</span>
              </div>
              <p class="text-xs text-gray-300">
                รวมไฟล์ PNG 300 DPI, Vector SVG, และการ์ด Standee ครบทุกโต๊ะ ({{ qrCodes.length }} โต๊ะ) บรรจุลง ZIP เดียว
              </p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full bg-white/15 text-white font-mono font-bold">
              {{ qrCodes.length }} โต๊ะ
            </span>
          </div>

          <button 
            @click="downloadAllAsZip"
            :disabled="isExportingZip || qrCodes.length === 0"
            class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#E8572E] to-[#F0A73C] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#E8572E]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw v-if="isExportingZip" class="w-4 h-4 animate-spin" />
            <Download v-else class="w-4 h-4" />
            {{ isExportingZip ? 'กำลังสร้างไฟล์ ZIP...' : 'ดาวน์โหลด QR ทุกโต๊ะเป็นไฟล์ ZIP (.zip)' }}
          </button>
        </div>

      </div>

      <!-- RIGHT COLUMN: Live Interactive Preview & Table List (7 Cols) -->
      <div class="lg:col-span-7 space-y-6">
        
        <!-- Live Visual Preview Showcase Card -->
        <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#132525] border border-[#E8E2D9] dark:border-[#1B4B4A] shadow-sm space-y-4 transition-colors">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-white/10 pb-3">
            <div class="flex items-center gap-2">
              <Eye class="w-4 h-4 text-[#E8572E]" />
              <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                Live Preview: <span class="text-[#E8572E]">{{ selectedQr?.label || 'เลือกโต๊ะที่ต้องการดูตัวอย่าง' }}</span>
              </h3>
            </div>

            <!-- Export Buttons for Currently Selected QR -->
            <div v-if="selectedQr" class="flex flex-wrap items-center gap-2">
              <button 
                @click="downloadSinglePng(selectedQr)"
                class="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 transition-all cursor-pointer font-medium"
                title="ดาวน์โหลดเฉพาะรูป QR ความละเอียด 2048px (300 DPI)"
              >
                <Image class="w-3.5 h-3.5 text-blue-500" />
                <span>PNG 300DPI</span>
              </button>

              <button 
                @click="downloadSingleSvg(selectedQr)"
                class="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 transition-all cursor-pointer font-medium"
                title="ดาวน์โหลดไฟล์เวกเตอร์ SVG สำหรับ Illustrator / Canva / Photoshop"
              >
                <FileCode class="w-3.5 h-3.5 text-emerald-500" />
                <span>SVG Vector</span>
              </button>

              <button 
                @click="downloadSingleStandee"
                class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold shadow-md shadow-[#E8572E]/20 transition-all cursor-pointer"
                title="ดาวน์โหลดการ์ด Standee พร้อมส่งพิมพ์"
              >
                <Printer class="w-3.5 h-3.5" />
                <span>โหลดป้าย Standee</span>
              </button>
            </div>
          </div>

          <!-- Preview Canvas Frame -->
          <div class="flex items-center justify-center p-6 bg-gray-50 dark:bg-black/40 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 min-h-[380px] transition-colors">
            <div v-if="previewDataUrl" class="max-w-xs sm:max-w-sm rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <img :src="previewDataUrl" alt="QR Preview" class="w-full h-auto object-contain" />
            </div>
            <div v-else class="text-center text-gray-400 p-8">
              <QrCode class="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p class="text-xs">ไม่มีตัวอย่าง QR Code ให้แสดงผล</p>
            </div>
          </div>

          <!-- Target Scan Link Callout -->
          <div v-if="selectedQr" class="p-3 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
            <div class="truncate text-gray-600 dark:text-gray-400">
              <strong class="text-gray-900 dark:text-white">URL ปลายทาง:</strong> {{ getTargetUrl(selectedQr) }}
            </div>
            <a 
              :href="getTargetUrl(selectedQr)" 
              target="_blank" 
              class="shrink-0 text-[#E8572E] hover:underline flex items-center gap-1 font-bold"
            >
              เปิดทดสอบ <ExternalLink class="w-3 h-3" />
            </a>
          </div>
        </div>

        <!-- Table QR Directory Grid -->
        <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#132525] border border-[#E8E2D9] dark:border-[#1B4B4A] shadow-sm space-y-4 transition-colors">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
              <QrCode class="w-4 h-4 text-[#F0A73C]" />
              รายการ QR Code ทั้งหมดในร้าน ({{ qrCodes.length }} จุด)
            </h3>
            <span class="text-xs text-gray-500 dark:text-gray-400">คลิกเลือกโต๊ะเพื่อดูตัวอย่างด้านบน</span>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="p-8 text-center text-gray-400">
            <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-[#E8572E]" />
            <span class="text-xs">กำลังโหลด QR Codes...</span>
          </div>

          <!-- Empty State -->
          <div v-else-if="qrCodes.length === 0" class="p-8 text-center text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
            <QrCode class="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p class="text-xs">ยังไม่มี QR Code สำหรับร้านนี้ คลิกสร้างโต๊ะใหม่ด้านซ้ายได้เลย</p>
          </div>

          <!-- Grid of QR Codes -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-1">
            <div 
              v-for="qr in qrCodes" 
              :key="qr.id"
              @click="selectedQr = qr"
              class="p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3"
              :class="selectedQr?.id === qr.id ? 'border-[#E8572E] bg-[#E8572E]/10 shadow-md ring-1 ring-[#E8572E]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 hover:border-gray-300 dark:hover:border-white/20'"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h4 class="font-bold text-gray-900 dark:text-white text-sm truncate" :title="qr.label">
                    {{ qr.label || 'โต๊ะ ' + (qr.table_identifier || '') }}
                  </h4>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold">
                      #{{ qr.short_code }}
                    </span>
                    <span v-if="qr.table_identifier" class="text-[10px] px-1.5 py-0.5 rounded bg-[#E8572E]/15 text-[#E8572E] font-bold">
                      Table {{ qr.table_identifier }}
                    </span>
                  </div>
                </div>

                <!-- Status Badge -->
                <span 
                  class="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  :class="qr.is_active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'"
                >
                  {{ qr.is_active ? 'Active' : 'Suspended' }}
                </span>
              </div>

              <!-- Quick Actions -->
              <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10 text-xs">
                <div class="flex items-center gap-1">
                  <button 
                    @click.stop="downloadSinglePng(qr)"
                    class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    title="โหลด PNG 300 DPI"
                  >
                    <Download class="w-3.5 h-3.5" />
                  </button>
                  <button 
                    @click.stop="downloadSingleSvg(qr)"
                    class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    title="โหลด SVG Vector"
                  >
                    <FileCode class="w-3.5 h-3.5" />
                  </button>
                </div>

                <div class="flex items-center gap-1">
                  <button 
                    @click.stop="toggleQrStatus(qr)"
                    class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer"
                    :class="qr.is_active ? 'text-amber-500' : 'text-emerald-500'"
                    :title="qr.is_active ? 'ระงับ QR' : 'เปิดใช้งาน QR'"
                  >
                    <ToggleRight v-if="qr.is_active" class="w-4 h-4" />
                    <ToggleLeft v-else class="w-4 h-4" />
                  </button>
                  <button 
                    @click.stop="deleteQr(qr.id)"
                    class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 cursor-pointer"
                    title="ลบ QR Code"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
