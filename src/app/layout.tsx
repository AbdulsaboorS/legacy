import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Legacy — Keep Your Ramadan Alive",
  description:
    "Don't let your Ramadan habits die. Legacy helps you transition your spiritual momentum into sustainable daily routines with AI-powered guidance and Prophetic motivation.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Legacy",
  },
  openGraph: {
    title: "Legacy — Keep Your Ramadan Alive",
    description:
      "Transform your Ramadan habits into a lasting legacy. AI-powered step-downs, streak tracking, and Prophetic motivation.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9F7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            {children}
            <BottomNav />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
