import { useEffect, useState, useSyncExternalStore } from 'react'
import type { AttendanceRecord } from '../types'

const QUEUE_KEY = 'gymflow-offline-attendance-v1'
const SYNC_EVENT = 'gymflow-sync-changed'

// URL opcional del backend en la nube (ej: Supabase). Si se define,
// las asistencias pendientes se envían allí al recuperar conexión.
const SYNC_URL = (import.meta.env.VITE_CLOUD_SYNC_URL as string | undefined)?.trim() ?? ''

export function getPendingAttendance(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AttendanceRecord[]) : []
  } catch {
    return []
  }
}

function emitChange() {
  window.dispatchEvent(new Event(SYNC_EVENT))
}

function persist(queue: AttendanceRecord[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    /* storage unavailable */
  }
  emitChange()
}

// Registra una asistencia local pendiente de sincronizar con la nube.
export function queueAttendance(record: AttendanceRecord) {
  const next = [
    ...getPendingAttendance().filter((r) => !(r.memberId === record.memberId && r.date === record.date)),
    record,
  ]
  persist(next)
}

export function clearPendingAttendance() {
  try {
    localStorage.removeItem(QUEUE_KEY)
  } catch {
    /* storage unavailable */
  }
  emitChange()
}

function subscribeSync(cb: () => void) {
  window.addEventListener(SYNC_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(SYNC_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

export function usePendingCount(): number {
  return useSyncExternalStore(subscribeSync, () => getPendingAttendance().length)
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// Envía las asistencias pendientes al backend y limpia la cola local.
// Devuelve cuántas se sincronizaron. Si no hay backend configurado,
// la cola se vacía (los registros ya viven en la base local).
export async function flushPendingAttendance(): Promise<number> {
  const pending = getPendingAttendance()
  if (pending.length === 0) return 0

  if (!SYNC_URL) {
    clearPendingAttendance()
    return pending.length
  }

  try {
    const res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendance: pending }),
    })
    if (!res.ok) return 0
    clearPendingAttendance()
    return pending.length
  } catch {
    return 0 // sigue la cola, se reintentará al volver la conexión
  }
}