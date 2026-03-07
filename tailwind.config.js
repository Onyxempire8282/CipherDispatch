/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Bebas Neue', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        body: ['Barlow', 'sans-serif'],
      },
      colors: {
        // Surface palette
        plate:      '#0e0f11',
        steel: {
          DEFAULT: '#161a1d',
          mid:     '#1e2328',
          lift:    '#252b31',
        },
        'input-bg': '#0a0c0e',
        rivet: {
          DEFAULT: '#2e353d',
          hi:      '#3d464f',
        },
        // Accent
        amber: {
          DEFAULT: '#e8952a',
          dim:     'rgba(232, 149, 42, 0.12)',
          line:    'rgba(232, 149, 42, 0.35)',
        },
        // Text hierarchy
        white:   '#edeae4',
        'text-hi': '#b8bdc2',
        text:    '#7a8088',
        muted:   '#4a5058',
        // Status colors
        'status-scheduled':  '#3a8fd4',
        'status-progress':   '#e8952a',
        'status-completed':  '#4a9e6b',
        'status-canceled':   '#e05050',
        'status-unassigned': '#4a5058',
        // Firm colors
        'firm-sedgwick':   '#e8952a',
        'firm-acd':        '#f0a030',
        'firm-claimsol':   '#e05050',
        'firm-complete':   '#c0392b',
        'firm-doan':       '#4a9e6b',
        'firm-legacy':     '#3a8fd4',
        'firm-ama':        '#9b59b6',
        'firm-ianet':      '#1abc9c',
        'firm-ateam':      '#e67e22',
        'firm-hea':        '#95a5a6',
        'firm-frontline':  '#bdc3c7',
        'firm-sca':        '#f39c12',
        // Legacy aliases (keep until old Tailwind classes are migrated)
        'brand-dark': {
          900: '#0e0f11',
          800: '#161a1d',
          700: '#2e353d',
          600: '#3d464f',
        },
        'brand-light': {
          100: '#edeae4',
          200: '#b8bdc2',
          300: '#7a8088',
          400: '#4a5058',
        },
      },
      boxShadow: {
        'card':       '0 2px 8px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.6)',
        'glow':       '0 0 20px rgba(232, 149, 42, 0.25)',
      },
    },
  },
  plugins: [],
}
