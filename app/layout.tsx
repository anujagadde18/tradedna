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
  description: "Paste any prediction question. Get AI confidence scores from news, social, and market signals. Find your edge before you bet.",
  openGraph: {
    title: "PlayPicks AI — Find Your Edge in Prediction Markets",
    description: "AI-powered analysis for Polymarket. Real signals from news, Metaculus forecasts, and live odds. Free to try.",
    url: "https://tradedna.vercel.app",
    siteName: "PlayPicks AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayPicks AI",
    description: "Find edges in prediction markets with AI signal analysis. Free to try.",
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
