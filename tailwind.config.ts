import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef1fa',
          100: '#d6deef',
          200: '#aebbe0',
          300: '#8195cf',
          400: '#5570bb',
          500: '#34509f',
          600: '#2c4194',
          700: '#243676',
          800: '#1d2c5e',
          900: '#18244c'
        },
        accent: {
          50: '#fdf2ec',
          100: '#f9dccb',
          200: '#f0b794',
          300: '#e69763',
          400: '#db7e44',
          500: '#cd6d3a',
          600: '#b15a2d',
          700: '#8f4724'
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};

export default config;
