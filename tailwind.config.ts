/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pulse: {
          bg:       '#0D0D0D',
          surface:  '#111111',
          elevated: '#161616',
          border:   '#1E1E1E',
          muted:    '#2A2A2A',
          // Accent palette
          gold:     '#C8A97E',
          'gold-light': '#E2C9A0',
          'gold-dark':  '#A88A5E',
          coral:    '#E8835A',
          sage:     '#7EB5A6',
          violet:   '#9B8EC4',
          sky:      '#6BAED6',
          mint:     '#74C476',
          amber:    '#E8C35A',
          rose:     '#F48FB1',
          // Text
          'text-primary':   '#F0EAE0',
          'text-secondary': '#AAA',
          'text-muted':     '#666',
          'text-faint':     '#444',
        }
      },
      fontFamily: {
        display: ["'Playfair Display'", 'Georgia', 'serif'],
        mono:    ["'DM Mono'", "'Fira Code'", 'monospace'],
        sans:    ["'DM Sans'", 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        xs:    ['0.72rem',  { lineHeight: '1.1rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        '4': '4px',
        '6': '6px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in':    'fade-in 0.4s ease-out forwards',
        'slide-up':   'slide-up 0.3s ease-out forwards',
        'typing':     'typing 1.5s steps(40) 1s 1 normal both',
        'skeleton':   'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px #C8A97E44' },
          '50%':       { boxShadow: '0 0 24px #C8A97E99, 0 0 48px #C8A97E33' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'skeleton': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'skeleton-gradient': 'linear-gradient(90deg, #111 25%, #1E1E1E 50%, #111 75%)',
        'gold-gradient':     'linear-gradient(135deg, #C8A97E, #E2C9A0)',
        'dark-mesh':         'radial-gradient(at 40% 20%, #1A1208 0px, transparent 50%), radial-gradient(at 80% 0%, #0A1A0A 0px, transparent 50%)',
      },
      screens: {
        xs: '375px',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }
    },
  },
  plugins: [],
};
