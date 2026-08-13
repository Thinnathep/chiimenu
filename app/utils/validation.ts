export const isValidEmail = (email: string): boolean => {
  if (!email) return false
  // A more robust regex that requires at least 2 characters for the TLD
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

export const isValidPhone = (phone: string): boolean => {
  if (!phone) return false
  // Must start with 0 and be exactly 10 digits
  const phoneRegex = /^0\d{9}$/
  return phoneRegex.test(phone)
}
