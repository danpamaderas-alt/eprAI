/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- Nuestra llave maestra para el modo oscuro
  theme: {
    extend: {},
  },
  plugins: [],
}