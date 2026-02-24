import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import AppProviders from "@/context/AppProviders";
import PWAProvider from "@/app/components/PWAProvider";

// Initialize auto-cleanup scheduler for ImageKit (server only)
if (typeof window === "undefined") {
  import("@/lib/cleanup-scheduler");
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Cuanify — Bikin Bisnis Makin Cuan",
  description: "Platform cerdas untuk UMKM Indonesia — POS kasir, inventori FIFO, kasbon, AI assistant, dan analytics real-time. Gratis selamanya.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cuanify",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-152x152.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders>{children}</AppProviders>

        {/* PWA: Service Worker + Offline Detection + Install Prompt */}
        <PWAProvider />

        {/* 🔥 Toast System */}
        <Toaster richColors position="top-right" />

        {/* Midtrans Script */}
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
