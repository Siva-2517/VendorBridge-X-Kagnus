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
          bg: '#111827',
          sidebar: '#0B1220',
          card: '#1E293B',
          accent: '#36C9A5',
          'accent-hover': '#2db893',
          'accent-subtle': 'rgba(54, 201, 165, 0.12)',
          'accent-border': 'rgba(54, 201, 165, 0.28)',
          text: '#F8FAFC',
          muted: '#94A3B8',
          border: '#334155',
          input: '#111827',
          hover: '#273449',
        },
      },
    },
  },
  plugins: [],
}
