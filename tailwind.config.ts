/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F1214",
        vision: {
          dark: "#0F1214",
          card: "#111C44", /* A deep navy for cards */
          primary: "#0075FF", /* Electric Blue */
          secondary: "#A0AEC0", /* Muted Gray text */
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'conic-gradient': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'card-gradient': 'linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
      },
    },
  },
  plugins: [],
};
