export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#f7f7f8',   // light background
        sidebar: '#ffffff',   // white sidebar
        accent:  '#10a37f',   // green accent
        'bubble-ai':   '#f2f2f2',
        'bubble-user': '#e0f2ff',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

