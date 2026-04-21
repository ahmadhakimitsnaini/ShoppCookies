/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gk: {
          primary: '#1D9E75',
          primaryHover: '#15805E',
          secondary: '#F59E0B',
          secondaryHover: '#D97706',
          success: '#10B981',
          warning: '#FBBF24',
          danger: '#EF4444',
          info: '#3B82F6',
          background: '#F9FAFB',
          surface: '#FFFFFF',
          text: {
            main: '#1F2937',
            muted: '#6B7280',
          },
          border: '#E5E7EB',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
      },
      fontSize: {
        'h1': ['28px', '1.5'],
        'h2': ['22px', '1.5'],
        'h3': ['18px', '1.5'],
        'body': ['14px', '1.7'],
        'small': ['12px', '1.5'],
        'caption': ['11px', '1.5'],
      },
      spacing: {
        '4.5': '1.125rem', // 18px
      }
    },
  },
  plugins: [],
}
