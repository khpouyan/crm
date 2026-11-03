import localFont from "next/font/local"
import { cn } from "cn"

// Persian: our custom Vazirmatn cut (built by scripts/build-vazirmatn-subset.py
// from the upstream variable font). Variable weights 100 900, digits 0-9
// kept, Arabic/Persian kept, Latin LETTERS removed — so English falls
// through to the English font and body ss01 turns typed digits
// into Farsi. This font is LOCAL ONLY: the file is ours, nothing on Google
// Fonts matches it.
const Vazirmatn = localFont({
  src: "../app/_assets/fonts/Vazirmatn.woff2",
  weight: "100 900",
  variable: "--font-fa",
  display: "swap",
  fallback: [],
  adjustFontFallback: false,
})

const Geist = localFont({
  src: "../app/_assets/fonts/Geist.woff2",
  weight: "100 900",
  variable: "--font-geist",
  display: "swap",
  fallback: [],
  adjustFontFallback: false,
})

const GeistMono = localFont({
  src: "../app/_assets/fonts/GeistMono.woff2",
  weight: "100 900",
  variable: "--font-mono-geist-mono",
  display: "swap",
  fallback: [],
  adjustFontFallback: false,
})

export const fontVariables = cn(
  Vazirmatn.variable,
  Geist.variable,
  GeistMono.variable,
)

