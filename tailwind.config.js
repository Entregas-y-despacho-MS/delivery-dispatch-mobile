/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        navy: '#0B1F3A',
        'navy-light': '#173A68',
        brand: '#2563EB',
        'brand-soft': '#E9F0FF',
        ink: '#172033',
        slate: '#617087',
        muted: '#8A97AA',
        border: '#E3E8F0',
        canvas: '#F6F8FC',
        danger: '#B91C1C',
      },
    },
  },
  plugins: [],
};
