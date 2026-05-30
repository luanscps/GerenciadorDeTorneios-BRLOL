import type { Config } from "tailwindcss";
import flattenColorPalette from "tailwindcss/lib/util/flattenColorPalette";

// Plugin do Aceternity UI: expõe cada cor Tailwind como variável CSS
// ex: var(--sky-500), var(--neutral-800)
function addVariablesForColors({ addBase, theme }: any) {
  const allColors = flattenColorPalette(theme("colors"));
  const newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );
  addBase({ ":root": newVars });
}

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C8A84B",
          light:   "#E8D48B",
          dark:    "#8B6914",
        },
        lol: {
          blue:   "#0BC4E3",
          dark:   "#0A1428",
          darker: "#050D1A",
          card:   "#112240",
          border: "#1E3A5F",
        },
        tremor: {
          brand: {
            faint:    "#050D1A",
            muted:    "#112240",
            subtle:   "rgba(200,168,75,0.15)",
            DEFAULT:  "#C8A84B",
            emphasis: "#E8D48B",
            inverted: "#050D1A",
          },
          background: {
            muted:    "#0A1428",
            subtle:   "#112240",
            DEFAULT:  "#0D1B2E",
            emphasis: "#1E3A5F",
          },
          border: {
            DEFAULT: "rgba(30,58,95,0.9)",
          },
          ring: {
            DEFAULT: "#C8A84B",
          },
          content: {
            subtle:   "#4B5563",
            DEFAULT:  "#94A3B8",
            emphasis: "#F1F5F9",
            strong:   "#FFFFFF",
            inverted: "#050D1A",
          },
        },
      },
      fontFamily: {
        display: ["Sora", "Inter", "sans-serif"],
        body:    ["Inter", "sans-serif"],
      },
      animation: {
        shimmer:             "shimmer 1.5s ease-in-out infinite",
        float:               "float 3s ease-in-out infinite",
        "background-shine":  "background-shine 2s linear infinite",
        meteor:              "meteor 5s linear infinite",
        spotlight:           "spotlight 2s ease .75s 1 forwards",
        scroll:              "scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0"  },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        "background-shine": {
          from: { backgroundPosition: "0 0" },
          to:   { backgroundPosition: "-200% 0" },
        },
        meteor: {
          "0%":   { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%":  { opacity: "1" },
          "100%": { transform: "rotate(215deg) translateX(-500px)", opacity: "0" },
        },
        spotlight: {
          "0%":   { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: "1", transform: "translate(-50%,-40%) scale(1)" },
        },
        scroll: {
          to: { transform: "translate(calc(-50% - 0.5rem))" },
        },
      },
    },
  },
  plugins: [addVariablesForColors],
};

export default config;
