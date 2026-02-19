import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E30613',
          dark: '#1D1D1B',
          light: '#F8F8F8',
        },
        // Alias for convenience
        kokohin: {
          red: '#E30613',
          black: '#1D1D1B',
          light: '#F8F8F8',
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(227, 6, 19, 0.39)',
        'brand-hover': '0 6px 20px rgba(227, 6, 19, 0.23)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config