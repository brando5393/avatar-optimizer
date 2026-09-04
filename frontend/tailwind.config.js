import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF6EC",
        ink: "#201C18",
        flash: {
          DEFAULT: "#C43F27",
          dark: "#A3331F",
        },
        booth: {
          DEFAULT: "#1F5C5C",
          dark: "#163F3F",
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', "ui-sans-serif", "sans-serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [typography],
};
