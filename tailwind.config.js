/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        navy: '#265C7F',
        'navy-light': '#347895',
        brand: '#265C7F',
        'brand-soft': '#DDF3FE',
        turquoise: '#469DB0',
        action: '#E18641',
        'action-soft': '#FFF0E2',
        ink: '#1F2730',
        slate: '#526471',
        muted: '#6F8090',
        border: '#D7E4EB',
        canvas: '#F8FBFD',
        danger: '#B91C1C',
      },
    },
  },
  plugins: [],
};
