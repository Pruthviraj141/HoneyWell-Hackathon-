/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Core accent — single teal accent per §4 rule
        accent:       '#00A3A3',
        accentHover:  '#0FB9B9',
        accentMuted:  '#0F3A3A',

        // Semantic status
        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#DC2626',
        info:    '#38BDF8',

        // Severity scale (§4.3)
        'sev-critical': '#DC2626',
        'sev-high':     '#EA580C',
        'sev-medium':   '#F59E0B',
        'sev-low':      '#38BDF8',
        'sev-info':     '#22C55E',
        'sev-unknown':  '#64748B',

        // Dark theme surfaces (§4.2)
        base:           '#0B1220',
        surface:        '#131C2B',
        surfaceElevated:'#182334',
        borderDefault:  '#2D3748',
        borderSubtle:   '#1E293B',

        // Light theme surfaces (§4.4)
        'base-light':   '#F8FAFC',
        'surface-light':'#FFFFFF',
        'border-light': '#E2E8F0',

        // Text (§4.2)
        textPrimary:   { light: '#0F172A', dark: '#F8FAFC' },
        textSecondary: { light: '#475569', dark: '#94A3B8' },
        textMuted:     { light: '#64748B', dark: '#64748B' },
      },

      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      fontSize: {
        'caption':  ['12px', { lineHeight: '16px' }],
        'body':     ['13px', { lineHeight: '20px' }],
        'body-lg':  ['14px', { lineHeight: '20px' }],
        'section':  ['16px', { lineHeight: '24px' }],
        'page':     ['20px', { lineHeight: '28px' }],
      },

      boxShadow: {
        'card':       '0 1px 2px rgba(0,0,0,0.24)',
        'card-hover': '0 2px 4px rgba(0,0,0,0.18)',
        'none':       'none',
      },

      borderRadius: {
        'card': '8px',
        'btn':  '6px',
        'pill': '9999px',
      },

      spacing: {
        '4.5': '18px',
        '18':  '72px',
      },

      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },

      animation: {
        'fade-in':  'fadeIn 0.2s ease both',
        'slide-up': 'slideUp 0.2s ease both',
      },

      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
