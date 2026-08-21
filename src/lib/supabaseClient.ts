import { createClient } from '@supabase/supabase-js'

// Credenciales desde .env.local (Vite expone solo las variables con prefijo VITE_).
// La anon key es una clave pública de cliente; las políticas RLS de las tablas
// autorizan su lectura/escritura en modo desarrollo.
const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const isSupabaseConfigured = Boolean(url && anonKey)

// Instancia única del cliente compartida por toda la app.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null