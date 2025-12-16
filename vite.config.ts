import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Haal de Google API Key op. Netlify gebruikt vaak 'API_KEY', lokaal vaak 'VITE_API_KEY'.
  // We mappen deze naar een globale constante __GOOGLE_API_KEY__.
  const googleKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || '';
  
  // We loggen even of de keys gevonden zijn (veilig, alleen boolean loggen)
  console.log(`Build config: Google Key present: ${!!googleKey}, Supabase URL present in env: ${!!env.VITE_SUPABASE_URL}`);

  return {
    plugins: [react()],
    define: {
      // Alleen de Google Key mappen we handmatig omdat die mogelijk geen VITE_ prefix heeft in Netlify
      __GOOGLE_API_KEY__: JSON.stringify(googleKey),
      // We definiëren process.env leeg om crashes in sommige libraries te voorkomen
      'process.env': {}
    },
  };
});