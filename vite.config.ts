import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Try to find the key in various locations.
  const rawApiKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY;
  const apiKey = rawApiKey ? rawApiKey.replace(/["']/g, "").trim() : "";
  
  // Load Supabase configuration
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  // Log to the BUILD console
  if (apiKey) {
    console.log("✅ SUCCESS: API_KEY found during build.");
  } else {
    console.warn("⚠️ WARNING: API_KEY not found in environment variables during build.");
  }

  return {
    plugins: [react()],
    define: {
      // Define global variables for the client
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
  };
});