// Loose on purpose: digits and spaces with an optional leading +, e.g. +353 87 123 4567.
export function isValidPhone(value: string) {
  return /^\+?[\d\s]{7,20}$/.test(value.trim())
}
