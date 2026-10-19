/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        erp: {
          dark: '#0c120f',
          card: '#141d18',
          border: '#1f2e26',
          muted: '#8ba295',
          accent: '#10b981',
          hover: '#192b21'
        }
      }
    },
  },
  plugins: [],
}
