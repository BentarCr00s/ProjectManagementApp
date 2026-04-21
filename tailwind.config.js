/** @type {import('tailwindcss').Config} */
module.exports = {
  separator: '_',
  content: [
    "./src/views/**/*.pug",
    "./public/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c0d0ff',
          300: '#94b4ff',
          400: '#6390ff',
          500: '#4070ff',
          600: '#2952f5',
          700: '#1c3de1',
          800: '#1c32b6',
          900: '#1c2e8f',
          950: '#141d5c',
        },
        sidebar: {
          bg: '#1a1d2e',
          hover: '#252840',
          active: '#2d3154',
          border: '#2e3150',
          text: '#9ba3c4',
          textActive: '#ffffff',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8f9fc',
          tertiary: '#f0f2f8',
        },
        task: {
          todo: '#6b7280',
          inprogress: '#3b82f6',
          review: '#a855f7',
          done: '#22c55e',
        },
        priority: {
          urgent: '#ef4444',
          high: '#f97316',
          normal: '#3b82f6',
          low: '#9ca3af',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
        'modal': '0 20px 60px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.12)',
        'sidebar': '4px 0 16px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
