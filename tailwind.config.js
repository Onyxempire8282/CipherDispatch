/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme base colors (from current design)
        'brand-dark': {
          900: '#1a202c',
          800: '#2d3748',
          700: '#4a5568',
          600: '#718096',
        },
        'brand-light': {
          100: '#e2e8f0',
          200: '#cbd5e0',
          300: '#a0aec0',
          400: '#718096',
        },
        // Status colors
        'status-scheduled': '#2196F3',
        'status-progress': '#FF9800',
        'status-completed': '#4CAF50',
        'status-canceled': '#ef4444',
        'status-unassigned': '#9E9E9E',
        // Firm colors (from firmColors.ts)
        'firm-sedgwick': '#9CA3AF',
        'firm-acd': '#F59E0B',
        'firm-claim-solution': '#8B5CF6',
        'firm-ccs': '#EF4444',
        'firm-doan': '#10B981',
        'firm-legacy': '#3B82F6',
        'firm-ama': '#FACC15',
        'firm-ianet': '#92400E',
        'firm-ateam': '#06B6D4',
        'firm-hea': '#6366F1',
        'firm-frontline': '#1F2937',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
        'gradient-purple': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0,0,0,0.5)',
        'card-hover': '0 6px 12px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
}
