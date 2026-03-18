/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        espresso: 'rgb(var(--espresso) / <alpha-value>)',
        caramel: 'rgb(var(--caramel) / <alpha-value>)',
        oat: 'rgb(var(--oat) / <alpha-value>)',
        cocoa: 'rgb(var(--cocoa) / <alpha-value>)',
        cream: 'rgb(var(--cream) / <alpha-value>)',
        mint: 'rgb(var(--mint) / <alpha-value>)',
        sand: 'rgb(var(--sand) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        obsidian: 'rgb(var(--obsidian) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      boxShadow: {
        card: '0 12px 30px rgba(59,36,23,0.12)',
        cardHover: '0 18px 36px rgba(59,36,23,0.18)',
      },
      borderRadius: {
        xl2: '18px',
        xl3: '28px',
      },
    },
  },
  plugins: [],
}
