/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#EB4A26',
        peach: '#FFDAD1',
        canvas: '#F3F4EF',
      },
      spacing: {
        18: '4.5rem',
      },
    },
  },
  plugins: [],
}
