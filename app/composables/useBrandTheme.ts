import { ref } from 'vue'

export interface BrandColorPalette {
  primary: string
  primaryHover: string
  primaryLight: string
  primarySubtle: string
  primaryBorder: string
  primaryContrast: string
  primaryGradient: string
  rawRgb: { r: number; g: number; b: number }
}

const DEFAULT_THEME_COLOR = '#D41244' // Signature ChiiMenu Red
const colorCache = new Map<string, BrandColorPalette>()

/**
 * Fast RGB to HSL conversion
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [h * 360, s, l]
}

/**
 * HSL to RGB conversion
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

/**
 * Convert RGB to Hex String
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * Parse Hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '')
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('')
  }
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

/**
 * Build a full harmonious palette from RGB
 */
function buildPaletteFromRgb(r: number, g: number, b: number): BrandColorPalette {
  const [h, s, rawL] = rgbToHsl(r, g, b)
  
  // Balance lightness for readable contrast (38% - 48%)
  const clampedL = Math.max(0.38, Math.min(0.48, rawL))
  const [pr, pg, pb] = hslToRgb(h, Math.max(0.65, s), clampedL)
  
  // Hover shade (slightly darker)
  const [hr, hg, hb] = hslToRgb(h, Math.max(0.7, s), Math.max(0.3, clampedL - 0.08))
  
  // Secondary gradient shade (slightly shifted hue / deeper tone)
  const [gr, gg, gb] = hslToRgb((h + 12) % 360, Math.max(0.7, s), Math.max(0.28, clampedL - 0.1))

  const primaryHex = rgbToHex(pr, pg, pb)
  const hoverHex = rgbToHex(hr, hg, hb)
  const gradHex = rgbToHex(gr, gg, gb)

  // Relative luminance check for contrast
  const luminance = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255
  const contrast = luminance > 0.65 ? '#111827' : '#ffffff'

  return {
    primary: primaryHex,
    primaryHover: hoverHex,
    primaryLight: `rgba(${pr}, ${pg}, ${pb}, 0.12)`,
    primarySubtle: `rgba(${pr}, ${pg}, ${pb}, 0.05)`,
    primaryBorder: `rgba(${pr}, ${pg}, ${pb}, 0.25)`,
    primaryContrast: contrast,
    primaryGradient: `linear-gradient(135deg, ${primaryHex} 0%, ${gradHex} 100%)`,
    rawRgb: { r: pr, g: pg, b: pb }
  }
}

/**
 * Composable for dynamic brand theme extraction
 */
export function useBrandTheme() {
  const palette = ref<BrandColorPalette>(buildPaletteFromRgb(212, 18, 68)) // default #D41244
  const isExtracting = ref(false)

  /**
   * Extract dominant vibrant color from an image URL using offscreen canvas
   */
  const extractFromImage = async (imageUrl?: string | null, fallbackHex = DEFAULT_THEME_COLOR): Promise<BrandColorPalette> => {
    if (!imageUrl) {
      const fallbackRgb = hexToRgb(fallbackHex)
      const p = buildPaletteFromRgb(fallbackRgb.r, fallbackRgb.g, fallbackRgb.b)
      palette.value = p
      return p
    }

    // Check memory cache first (instant 0ms)
    if (colorCache.has(imageUrl)) {
      const cached = colorCache.get(imageUrl)!
      palette.value = cached
      return cached
    }

    if (typeof window === 'undefined') {
      const fallbackRgb = hexToRgb(fallbackHex)
      return buildPaletteFromRgb(fallbackRgb.r, fallbackRgb.g, fallbackRgb.b)
    }

    isExtracting.value = true

    return new Promise<BrandColorPalette>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.src = imageUrl

      img.onload = () => {
        try {
          // Downsample to 24x24 for ultra-fast <2ms processing
          const canvas = document.createElement('canvas')
          canvas.width = 24
          canvas.height = 24
          const ctx = canvas.getContext('2d', { willReadFrequently: true })

          if (!ctx) {
            throw new Error('Canvas 2D context not available')
          }

          ctx.drawImage(img, 0, 0, 24, 24)
          const imgData = ctx.getImageData(0, 0, 24, 24).data
          
          let totalR = 0, totalG = 0, totalB = 0, count = 0
          let bestScore = -1
          let bestR = 212, bestG = 18, bestB = 68

          for (let i = 0; i < imgData.length; i += 4) {
            const a = imgData[i + 3] ?? 255
            if (a < 128) continue // Ignore transparent pixels

            const r = imgData[i] ?? 0
            const g = imgData[i + 1] ?? 0
            const b = imgData[i + 2] ?? 0

            // Ignore near-white and near-black
            if ((r > 235 && g > 235 && b > 235) || (r < 25 && g < 25 && b < 25)) {
              continue
            }

            const [h, s, l] = rgbToHsl(r, g, b)
            
            // Ignore dull gray / washed out
            if (s < 0.25 || l < 0.15 || l > 0.85) {
              continue
            }

            // Score vibrancy: Higher saturation and warm hues favored for food brands
            let hueBonus = 1
            if ((h >= 340 || h <= 45)) hueBonus = 1.3 // Reds & Oranges
            else if (h >= 45 && h <= 80) hueBonus = 1.2 // Warm Yellows
            else if (h >= 80 && h <= 160) hueBonus = 1.15 // Greens

            const score = s * (1 - Math.abs(l - 0.5) * 1.5) * hueBonus

            if (score > bestScore) {
              bestScore = score
              bestR = r
              bestG = g
              bestB = b
            }

            totalR += r
            totalG += g
            totalB = b
            count++
          }

          const chosenR = bestScore > 0 ? bestR : (count > 0 ? Math.round(totalR / count) : 212)
          const chosenG = bestScore > 0 ? bestG : (count > 0 ? Math.round(totalG / count) : 18)
          const chosenB = bestScore > 0 ? bestB : (count > 0 ? Math.round(totalB / count) : 68)

          const result = buildPaletteFromRgb(chosenR, chosenG, chosenB)
          colorCache.set(imageUrl, result)
          palette.value = result
          isExtracting.value = false
          resolve(result)
        } catch (err) {
          console.warn('[useBrandTheme] Could not sample pixel data (CORS or draw error), using fallback.', err)
          const fallbackRgb = hexToRgb(fallbackHex)
          const fallbackPalette = buildPaletteFromRgb(fallbackRgb.r, fallbackRgb.g, fallbackRgb.b)
          colorCache.set(imageUrl, fallbackPalette)
          palette.value = fallbackPalette
          isExtracting.value = false
          resolve(fallbackPalette)
        }
      }

      img.onerror = () => {
        const fallbackRgb = hexToRgb(fallbackHex)
        const fallbackPalette = buildPaletteFromRgb(fallbackRgb.r, fallbackRgb.g, fallbackRgb.b)
        palette.value = fallbackPalette
        isExtracting.value = false
        resolve(fallbackPalette)
      }
    })
  }

  return {
    palette,
    isExtracting,
    extractFromImage,
    DEFAULT_THEME_COLOR
  }
}
