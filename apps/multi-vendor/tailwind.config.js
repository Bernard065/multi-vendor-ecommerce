/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './{src,pages,components,app}/**/*.{ts,tsx,js,jsx,html}',
    '!./{src,pages,components,app}/**/*.{stories,spec}.{ts,tsx,js,jsx,html}',
    //     ...createGlobPatternsForDependencies(__dirname)
  ],
  theme: {
    extend: {
      fontFamily: {
        Roboto: ['var(--font-roboto)'],
        Poppins: ['var(--font-poppins)'],
      },
      colors: {
        primary: '#3489FF',
        border: '#010f1c1a',
        'light-gray': '#f5f5f5',
        'light-bg': '#f5f5f5',
      },
    },
  },
  plugins: [],
};
