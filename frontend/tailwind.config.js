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
        // Brand primaries — Aviation Blue + Indigo
        primary:     '#3B82F6',   // Aviation Blue
        primaryHover:'#2563EB',
        primaryDark: '#1D4ED8',
        brand:       '#4F46E5',   // Indigo brand accent
        brandDark:   '#4338CA',
        secondary:   '#6366F1',   // Soft indigo-violet

        // Status system
        success:  '#10B981',  // Emerald — On-Time
        warning:  '#F59E0B',  // Amber  — Delayed
        danger:   '#EF4444',  // Rose   — Cancelled/Severe

        // Light mode surfaces
        background: {
          light: '#F3F4F6',  // Clean neutral slate
          dark:  '#0F172A',
        },
        surface: {
          light: '#FFFFFF',
          dark:  '#1E293B',
        },
        surfaceAlt: {
          light: '#F8FAFC',  // Very subtle off-white for nested cards
          dark:  '#0F172A',
        },
        borderBase: {
          light: '#E5E7EB',  // Gray-200
          dark:  '#334155',
        },
        borderStrong: {
          light: '#D1D5DB',  // Gray-300
          dark:  '#475569',
        },

        // Text palette
        textPrimary: {
          light: '#111827',  // Gray-900 — crisp black
          dark:  '#F1F5F9',
        },
        textSecondary: {
          light: '#4B5563',  // Gray-600
          dark:  '#94A3B8',
        },
        textMuted: {
          light: '#9CA3AF',  // Gray-400
          dark:  '#64748B',
        },
      },

      fontFamily: {
        sans:    ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', '"Outfit"',            'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      boxShadow: {
        'card':          '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover':    '0 4px 12px 0 rgba(0,0,0,0.10), 0 2px 6px -1px rgba(0,0,0,0.08)',
        'card-lg':       '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -6px rgba(0,0,0,0.06)',
        'glow-primary':  '0 0 20px rgba(59,130,246,0.25)',
        'glow-indigo':   '0 0 20px rgba(79,70,229,0.25)',
        'glow-danger':   '0 0 20px rgba(239,68,68,0.25)',
        'glow-success':  '0 0 15px rgba(16,185,129,0.20)',
        'soft':          '0 4px 20px -2px rgba(0,0,0,0.05)',
        'inner-sm':      'inset 0 1px 3px rgba(0,0,0,0.06)',
      },

      borderRadius: {
        'xl2': '1rem',    // 16px
        'xl3': '1.25rem', // 20px
      },

      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)',
        'gradient-subtle':  'linear-gradient(135deg, #EFF6FF 0%, #EDE9FE 100%)',
        'gradient-success': 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
        'gradient-danger':  'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
      },

      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-r': 'slideInRight 0.35s cubic-bezier(0.16,1,0.3,1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },

      keyframes: {
        fadeIn:       { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:      { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
