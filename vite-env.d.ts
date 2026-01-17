
/* Fixed error: Cannot find type definition file for 'vite/client' by removing the problematic reference */

interface AppConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_GOOGLE_API_KEY: string;
}

/** Global configuration object injected by Vite */
declare const __APP_CONFIG__: AppConfig;

/** Environment variables available via import.meta.env */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GOOGLE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 
 * Support for process.env.API_KEY as required by the Gemini API implementation.
 * This ensures that the global process object is typed correctly throughout the application.
 * Note: Explicitly declaring 'var process' here causes conflicts if Node types are present;
 * augmenting the NodeJS namespace is the standard and safe way to add process.env types.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
