/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg': '#1e1e1e',
        'sidebar': '#151515',
        'bubble-user': '#2563eb22', // subtle translucent blue
        'bubble-ai': '#374151',     // Tailwind gray-700
        'accent': '#10b981',        // teal/emerald
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
  darkMode: 'class',
};
