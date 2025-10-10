/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  safelist: [
    'animate-fadeIn'
  ],
  theme: {
    extend: 
    {
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      animation: {
        fadeIn: 'fadeIn 2s ease-in forwards',
      },
    },
  },
  plugins: 
  [
    require('tailwind-scrollbar')
  ],
};