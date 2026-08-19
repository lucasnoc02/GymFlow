import { useSyncExternalStore } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return deferred !== null
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

// true cuando la app se ejecuta como instalada (standalone).
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

// true cuando la app ya está instalada (standalone o el navegador la considera instalada).
export function isInstalled(): boolean {
  return isStandalone()
}

// Hook para el botón "Instalar": se habilita cuando el navegador
// emite beforeinstallprompt y lo mantiene vivo hasta que la app se instala.
export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribe, getSnapshot)

  const promptInstall = async (): Promise<boolean> => {
    const evt = deferred
    if (!evt) return false
    await evt.prompt()
    try {
      const choice = await evt.userChoice
      if (choice.outcome === 'accepted') {
        deferred = null
        emit()
        return true
      }
    } catch {
      /* userChoice no disponible en algunos navegadores */
    }
    return false
  }

  return { canInstall, promptInstall }
}