/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // GitHub-inspired dark theme colors
        gray: {
          900: '#0d1117',
          800: '#161b22',
          700: '#21262d',
          600: '#30363d',
          500: '#656d76',
          400: '#7d8590',
          300: '#f0f6fc',
        },
        blue: {
          500: '#58a6ff',
          600: '#1f6feb',
        },
        green: {
          500: '#3fb950',
          600: '#238636',
        },
        orange: {
          500: '#d29922',
        },
        red: {
          500: '#f85149',
          600: '#da3633',
        }
      },
      fontFamily: {
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-subtle': 'pulse 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
