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
        trading: {
          bg: '#0a0a0f',
          card: '#141419',
          border: '#2a2a35',
          text: '#e4e4e7',
          muted: '#71717a',
          green: '#22c55e',
          red: '#ef4444',
          accent: '#3b82f6',
          gold: '#f59e0b',
          bitcoin: '#f7931a',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}