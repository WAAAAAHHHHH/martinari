/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0F1115', // Matte charcoal
        'bg-elevated': '#16181D', // Slightly elevated surface
        'bg-card': 'rgba(22, 24, 29, 0.6)', // Glass card
        'bg-hover': 'rgba(255, 255, 255, 0.04)',

        border: 'rgba(255, 255, 255, 0.08)',
        'border-strong': 'rgba(255, 255, 255, 0.15)',
        'border-focus': 'rgba(255, 255, 255, 0.3)',

        primary: '#FFFFFF',
        secondary: '#A1A1AA', // Zinc-400
        muted: '#52525B', // Zinc-600

        accent: '#FFFFFF', // Pure white accent for Apple feel
        'accent-dim': 'rgba(255, 255, 255, 0.1)',
        'accent-hover': '#E4E4E7',

        success: '#34C759', // Apple green
        danger: '#FF3B30', // Apple red
        warning: '#FFCC00', // Apple yellow
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-hover': '0 12px 48px 0 rgba(0, 0, 0, 0.4), inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
};
