import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Try to find the key in various locations.
  // 1. VITE_API_KEY (Standard Vite convention)
  // 2. API_KEY (Standard Netlify convention)
  // 3. process.env.API_KEY (System environment fallback)
  const rawApiKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY;
  
  // Clean up the key (remove quotes if user added them, trim whitespace)
  const apiKey = rawApiKey ? rawApiKey.replace(/["']/g, "").trim() : "";

  // Log to the BUILD console (Netlify logs) so you can verify if it was found
  if (apiKey) {
    console.log("✅ SUCCESS: API_KEY found during build.");
  } else {
    console.warn("⚠️ WARNING: API_KEY not found in environment variables during build. The app will fail to scan receipts.");
  }

  return {
    plugins: [react()],
    define: {
      // Define process.env.API_KEY globally so the SDK can find it.
      // JSON.stringify ensures it is inserted as a string literal into the client code.
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});