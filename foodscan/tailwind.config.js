/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        scaffold: "#f0f2f5",
        "scan-red": "#f44336",
        "scan-gray": "#495057",
      },
      fontFamily: {
        sans: ["Noto Sans KR", "sans-serif"],
      },
      boxShadow: {
        "scan-frame": "0 10px 40px rgba(0,0,0,0.2)",
        "scan-button": "0 4px 15px rgba(244, 67, 54, 0.4)",
      },
      keyframes: {
        scan: {
          "0%, 100%": { top: "0" },
          "50%": { top: "calc(100% - 4px)" },
        },
      },
      animation: {
        scan: "scan 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
