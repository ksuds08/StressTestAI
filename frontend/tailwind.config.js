export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#ffffff',          // main background
        sidebar: '#f5f5f5',     // sidebar background
        accent: '#10a37f',      // buttons / links
        'bubble-ai': '#e8e8e8', // AI reply bubble
        'bubble-user': '#d1eaff' // user reply bubble
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
