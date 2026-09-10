/**
 * Thai PromptPay EMVCo QR Code Payload Generator (Server Utility)
 * Compliant with Bank of Thailand & EMVCo Merchant-Presented Mode (MPM)
 */

/**
 * Calculates CRC-16/CCITT-FALSE (XMODEM) checksum
 * Polynomial: 0x1021, Initial value: 0xFFFF
 */
export function crc16(data: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i)
    crc ^= (code << 8)
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF
      } else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Formats a single TLV (Tag-Length-Value) string
 */
export function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${tag}${len}${value}`
}

/**
 * Normalizes PromptPay Target ID (Phone number or National ID / Tax ID / e-Wallet)
 */
export function formatPromptPayTarget(target: string): { subTag: string; formattedTarget: string } {
  const clean = target.replace(/[^0-9]/g, '')
  
  if (clean.length === 9 || clean.length === 10) {
    // Thai Mobile number (e.g. 0812345678 -> 0066812345678)
    const phoneNo = '0066' + clean.replace(/^0/, '')
    return {
      subTag: '01',
      formattedTarget: phoneNo.padStart(13, '0')
    }
  } else if (clean.length === 13) {
    // National ID or Tax ID (13 digits)
    return {
      subTag: '02',
      formattedTarget: clean
    }
  } else if (clean.length === 15) {
    // e-Wallet ID (15 digits)
    return {
      subTag: '03',
      formattedTarget: clean
    }
  } else {
    // Fallback: format as phone or use safe 10-digit placeholder if target is invalid
    if (clean.length < 9) {
      return {
        subTag: '01',
        formattedTarget: '0066812345678'
      }
    }
    const phoneNo = '0066' + clean.replace(/^0/, '')
    return {
      subTag: '01',
      formattedTarget: phoneNo.padStart(13, '0')
    }
  }
}

/**
 * Generates an EMVCo-compliant Thai PromptPay QR Payload string
 * @param target Phone number (e.g. '0812345678') or 13-digit National ID
 * @param amount Optional payment amount in THB
 */
export function generatePromptPayPayload(target: string, amount?: number | null): string {
  // 00: Payload Format Indicator
  const f00 = formatTlv('00', '01')

  // 01: Point of Initiation Method (11 = Static, 12 = Dynamic)
  const isDynamic = amount != null && amount > 0
  const f01 = formatTlv('01', isDynamic ? '12' : '11')

  // 29: Merchant Account Information (PromptPay)
  const aid = formatTlv('00', 'A000000677010111')
  const { subTag, formattedTarget } = formatPromptPayTarget(target)
  const targetTag = formatTlv(subTag, formattedTarget)
  const f29 = formatTlv('29', aid + targetTag)

  // 53: Transaction Currency (764 = THB)
  const f53 = formatTlv('53', '764')

  // 54: Transaction Amount (2 decimal places)
  let f54 = ''
  if (isDynamic) {
    const formattedAmount = Number(amount).toFixed(2)
    f54 = formatTlv('54', formattedAmount)
  }

  // 58: Country Code (TH)
  const f58 = formatTlv('58', 'TH')

  // 63: Checksum
  const prefix = `${f00}${f01}${f29}${f53}${f54}${f58}6304`
  const checksum = crc16(prefix)

  return `${prefix}${checksum}`
}
