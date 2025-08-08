import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"

export const metadata: Metadata = {
  title: "Music Player App",
  description: "Mini-Spotify built with Next.js",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
