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
  metadataBase: new URL("https://trycallit.vercel.app"),
  title: "Call It — What are the chances?",
  description: "Ask any question. See one probability built from live market prices, statistical models, and expert forecasts - with every source shown.",
  openGraph: {
    title: "Call It — What are the chances?",
    description: "Transparent probability analysis for any question. Live market prices, models, and expert forecasts - blended in the open. Free to try.",
    url: "https://trycallit.vercel.app",
    siteName: "Call It",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Call It",
    description: "Transparent probability analysis for any question. Every source shown. Free to try.",
    site: "@trycallit",
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
