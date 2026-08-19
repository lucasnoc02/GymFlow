import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { toISO } from './dates'

interface DateCtx {
  today: Date
  todayISO: string
}

const DateContext = createContext<DateCtx>({ today: new Date(), todayISO: toISO(new Date()) })

/**
 * Motor central de fechas del sistema. Provee la fecha "de hoy" a todos los
 * módulos dependientes (deudas, recordatorios, asistencia) y se refresca solo.
 */
export function DateProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const tick = () => {
      const now = new Date()
      setToday(now)
      // Reprogramar para el próximo cambio de día (medianoche + 1s)
      const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1).getTime() - now.getTime()
      timeout = setTimeout(tick, msToMidnight)
    }
    // Redundancia de seguridad cada 60s por si el timeout de medianoche falla
    const safety = setInterval(() => setToday(new Date()), 60_000)
    timeout = setTimeout(tick, 30_000)
    return () => {
      clearTimeout(timeout)
      clearInterval(safety)
    }
  }, [])

  return <DateContext.Provider value={{ today, todayISO: toISO(today) }}>{children}</DateContext.Provider>
}

export function useToday(): DateCtx {
  return useContext(DateContext)
}
