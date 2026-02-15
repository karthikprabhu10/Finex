/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // iOS Color System
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          indigo: '#5856D6',
          orange: '#FF9500',
          pink: '#FF2D55',
          purple: '#AF52DE',
          red: '#FF3B30',
          teal: '#5AC8FA',
          yellow: '#FFCC00',
          gray: {
            50: '#F2F2F7',
            100: '#E5E5EA',
            200: '#D1D1D6',
            300: '#C7C7CC',
            400: '#AEAEB2',
            500: '#8E8E93',
            600: '#636366',
            700: '#48484A',
            800: '#3A3A3C',
            900: '#2C2C2E',
            950: '#1C1C1E',
          },
        },
        // Semantic colors
        primary: {
          DEFAULT: '#007AFF',
          light: '#5AC8FA',
          dark: '#0A84FF',
        },
        success: '#34C759',
        warning: '#FF9500',
        destructive: '#FF3B30',
        background: {
          light: '#F2F2F7',
          dark: '#000000',
          card: '#FFFFFF',
          'card-dark': '#1C1C1E',
        },
      },
      borderRadius: {
        'ios': '12px',
        'ios-lg': '16px',
        'ios-xl': '20px',
        'ios-2xl': '24px',
      },
      boxShadow: {
        'ios': '0 2px 10px rgba(0, 0, 0, 0.08)',
        'ios-lg': '0 4px 20px rgba(0, 0, 0, 0.12)',
        'ios-xl': '0 8px 30px rgba(0, 0, 0, 0.15)',
        'ios-inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
      },
      backdropBlur: {
        'ios': '20px',
        'ios-lg': '30px',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        'ios-xs': ['11px', { lineHeight: '13px', fontWeight: '400' }],
        'ios-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'ios-base': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        'ios-lg': ['17px', { lineHeight: '22px', fontWeight: '400' }],
        'ios-xl': ['20px', { lineHeight: '25px', fontWeight: '600' }],
        'ios-2xl': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'ios-3xl': ['34px', { lineHeight: '41px', fontWeight: '700' }],
      },
      spacing: {
        'ios-xs': '4px',
        'ios-sm': '8px',
        'ios-md': '12px',
        'ios': '16px',
        'ios-lg': '20px',
        'ios-xl': '24px',
        'ios-2xl': '32px',
      },
      animation: {
        'bounce-subtle': 'bounce-subtle 0.3s ease-out',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};