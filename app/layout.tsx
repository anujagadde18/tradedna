import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlayPicks AI — Prediction Market Analysis",
  description: "Ask any question. See one probability built from live market prices, statistical models, and expert forecasts - with every source shown.",
  openGraph: {
    title: "PlayPicks AI — See Every Source Behind the Answer",
    description: "Transparent probability analysis for any question. Live market prices, models, and expert forecasts - blended in the open. Free to try.",
    url: "https://tradedna.vercel.app",
    siteName: "PlayPicks AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayPicks AI",
    description: "Transparent probability analysis for any question. Every source shown. Free to try.",
    site: "@PlayPicksAI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
