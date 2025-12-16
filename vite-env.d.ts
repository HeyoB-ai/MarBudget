/// <reference types="vite/client" />

// Globale constante voor de Google API Key
declare const __GOOGLE_API_KEY__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // Google key is via global __GOOGLE_API_KEY__ available, but usually not on env directly if mapped
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
