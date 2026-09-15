/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontSize: {
        xs: ['1rem', { lineHeight: '1.5' }],
        sm: ['1.0625rem', { lineHeight: '1.55' }],
        base: ['1.125rem', { lineHeight: '1.65' }],
        lg: ['1.3125rem', { lineHeight: '1.45' }],
        xl: ['1.5rem', { lineHeight: '1.35' }],
        '2xl': ['1.75rem', { lineHeight: '1.3' }],
        '3xl': ['2.125rem', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
};
