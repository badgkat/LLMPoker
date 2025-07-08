/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        poker: {
          felt: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
          chip: {
            white: '#ffffff',
            red: '#dc2626',
            blue: '#2563eb',
            green: '#16a34a',
            black: '#1f2937',
            purple: '#7c3aed',
            yellow: '#eab308',
            orange: '#ea580c',
          }
        }
      },
      fontFamily: {
        poker: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'card-flip': 'cardFlip 0.6s ease-in-out',
        'chip-slide': 'chipSlide 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        chipSlide: {
          '0%': { 
            transform: 'scale(0.8) translateY(-20px)',
            opacity: '0'
          },
          '100%': { 
            transform: 'scale(1) translateY(0)',
            opacity: '1'
          },
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'poker-card': '0 4px 8px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)',
        'poker-chip': '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'poker-table': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
};