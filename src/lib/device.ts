interface UAEntry {
  brand: string
  version: string
}
interface NavigatorWithUAData extends Navigator {
  userAgentData?: { brands?: UAEntry[]; mobile?: boolean }
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  const uaData = (navigator as NavigatorWithUAData).userAgentData
  if (uaData && uaData.brands) {
    if (uaData.brands.some((b) => /Android/i.test(b.brand))) return true
  }
  return /Android/i.test(navigator.userAgent)
}

export function applyDeviceClasses(): void {
  if (isAndroid()) {
    document.body.classList.add('is-android')
  }
}