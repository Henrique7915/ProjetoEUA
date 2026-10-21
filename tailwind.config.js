/** @type {import('tailwindcss').Config} */
// As cores principais vêm de variáveis CSS (src/index.css), assim o tema troca sem recarregar.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`
const scale = (name, steps) => Object.fromEntries(steps.map((s) => [s, v(`${name}-${s}`)]))

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: v('ink'),
        paper: v('paper'),
        surface: v('surface'),
        shell: v('shell'),
        line: v('line'),
        onbrand: v('onbrand'),
        brand: scale('brand', [50, 100, 200, 300, 400, 500, 600, 700]),
        accent: scale('accent', [100, 400, 500, 600]),
        mint: { 500: '#1F9E7A', 600: '#17805F' },
        sun: { 400: '#F2B53A', 600: '#A8770F' },
        danger: { 500: '#DC3F44', 600: '#B92F34' },
        lilac: { 500: '#8B63D0', 600: '#7048B8' },
        sky: { 500: '#2F8FD6', 600: '#1F72B0' },
        rosy: { 500: '#E0558A', 600: '#C23E72' }
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 0 rgb(var(--ink) / .04), 0 8px 24px -16px rgb(var(--brand-700) / .3)',
        sheet: '0 -16px 40px -24px rgb(var(--ink) / .35)'
      }
    }
  },
  plugins: []
}
