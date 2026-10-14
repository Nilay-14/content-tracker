import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Toaster } from "@/components/toaster";
import { APP_NAME, APP_SHORT_NAME, THEME_COLOR, THEME_COLOR_DARK, THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Daily social media content tracker",
  // Private app: never show up in search results.
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The inline script adds the `dark` class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <BottomTabBar />
        <Toaster />
      </body>
    </html>
  );
}
