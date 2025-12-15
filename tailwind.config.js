/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#0e7490', // Cyan 700
        secondary: '#155e75', // Cyan 800
        accent: '#f59e0b', // Amber 500
        danger: '#ef4444',
        success: '#10b981',
      }
    }
  },
  plugins: [],
}