/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#FFE584',
          sand: '#FFE584',
          orange: '#FF9E4F',
          terracotta: '#E97451',
          espresso: '#5B3228',
          50: '#fffbf0',
          100: '#fffae1',
          200: '#FFE584',
          300: '#ffd066',
          400: '#FF9E4F',
          500: '#E97451',
          600: '#d15e3b',
          700: '#a74326',
          800: '#7a311f',
          900: '#5B3228',
          950: '#381c15',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(233, 116, 81, 0.3)',
      },
    },
  },
  plugins: [],
};
