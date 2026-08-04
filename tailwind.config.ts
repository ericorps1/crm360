import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Los nombres semánticos existentes (background, primary, muted…) se remapean
 * a los tokens del sistema Atlas para que toda la app comparta el tema claro;
 * la escala `brand-*` expone el acento white-label.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        input: "var(--border-strong)",
        ring: "var(--accent)",
        background: "var(--bg)",
        foreground: "var(--text)",
        subtle: "var(--bg-subtle)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--bg-panel)",
          foreground: "var(--text-2)",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--bg-panel)",
          foreground: "var(--text-3)",
        },
        accent: {
          DEFAULT: "var(--bg-hover)",
          foreground: "var(--text)",
        },
        card: {
          DEFAULT: "var(--bg)",
          foreground: "var(--text)",
        },
        popover: {
          DEFAULT: "var(--bg)",
          foreground: "var(--text)",
        },
        brand: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          tint: "var(--accent-tint)",
          text: "var(--accent-text)",
        },
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        "text-4": "var(--text-4)",
        chat: "var(--chat-bg)",
        "bubble-out": "var(--bubble-out)",
        "bubble-out-text": "var(--bubble-out-text)",
        success: {
          DEFAULT: "var(--success)",
          surface: "var(--success-surface)",
          line: "var(--success-line)",
          ink: "var(--success-ink)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          surface: "var(--warning-surface)",
          line: "var(--warning-line)",
          ink: "var(--warning-ink)",
        },
        danger: {
          surface: "var(--danger-surface)",
          line: "var(--danger-line)",
          ink: "var(--danger-ink)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        pop: "var(--shadow-pop)",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Hanken Grotesk", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [animate],
};

export default config;
