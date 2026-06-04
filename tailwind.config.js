/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: '#0a0e17',
          panel: '#0f1623',
          border: '#1a2332',
          cyan: '#00f0ff',
          blue: '#0066ff',
          red: '#ff0040',
          green: '#00ff88',
          muted: '#4a5568',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flash-red': 'flash-red 0.6s ease-in-out infinite',
        'slide-in': 'slide-in 0.4s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 102, 255, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 240, 255, 0.8)' },
        },
        'flash-red': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-red': '0 0 25px rgba(255, 0, 64, 0.6)',
        'glow-blue': '0 0 30px rgba(0, 102, 255, 0.5)',
      },
    },
  },
  plugins: [],
};
