export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:      '#0d0d0d',
        sidebar: '#131313',
        accent:  '#10a37f',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

