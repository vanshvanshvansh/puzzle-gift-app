/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        script: ['"Dancing Script"', 'cursive'],
        familyserif: ['"Cormorant Garamond"', 'serif'],
        handwritten: ['Caveat', 'cursive'],
        fun: ['Fredoka', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#050b1a',
          900: '#081026',
          800: '#0b1730',
          700: '#0f2049',
        },
        blue: {
          600: '#2f6fed',
          500: '#3f8bff',
        },
        cyan: {
          400: '#4dd6e8',
          200: '#b8f3fa',
        },
        gift: {
          400: '#ffd166',
          500: '#ffbd3d',
        },
      },
      keyframes: {
        breathe: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0px 0px rgba(255,209,102,0.0)' },
          '50%': { boxShadow: '0 0 40px 12px rgba(255,209,102,0.45)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        breathe: 'breathe 12s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
