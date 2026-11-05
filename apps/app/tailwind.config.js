/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Crimson Pro"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Obsidian & warm dark workspace surfaces
        surface: {
          base: '#09090b',
          card: '#101014',
          elevated: '#17171d',
          subtle: '#1f1f26',
        },
        // Accent palette – refined iris / violet
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          muted: 'rgba(99, 102, 241, 0.12)',
          border: 'rgba(99, 102, 241, 0.25)',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      typography: ({ theme }) => ({
        lore: {
          css: {
            '--tw-prose-body': theme('colors.zinc[300]'),
            '--tw-prose-headings': theme('colors.zinc[100]'),
            '--tw-prose-links': theme('colors.indigo[400]'),
            '--tw-prose-code': theme('colors.violet[300]'),
            '--tw-prose-hr': theme('colors.white/10'),
            '--tw-prose-quotes': theme('colors.zinc[400]'),
            fontFamily: theme('fontFamily.serif').join(', '),
            fontSize: '1.0625rem',
            lineHeight: '1.85',
            p: { fontFamily: theme('fontFamily.serif').join(', ') },
            h1: { fontFamily: theme('fontFamily.sans').join(', '), fontWeight: '700' },
            h2: { fontFamily: theme('fontFamily.sans').join(', '), fontWeight: '700' },
            h3: { fontFamily: theme('fontFamily.sans').join(', '), fontWeight: '600' },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

