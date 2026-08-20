// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0faf1',
          100: '#d9f2dc',
          200: '#b3e5b9',
          300: '#7dd087',
          400: '#45b552',
          500: '#22a130',
          600: '#0c831f',
          700: '#0a6e1a',
          800: '#085817',
          900: '#064713',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}