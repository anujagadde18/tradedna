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
  description: "What does 62% next to your team actually mean? Call It reads NFL betting prices in plain English - as a chance, as money, and beside what the teams' records alone would say.",
  openGraph: {
    title: "Call It — What are the chances?",
    description: "NFL betting prices, explained for people who have never bet. What the percentage means, what it pays, and what team records alone would say. Free.",
    url: "https://trycallit.vercel.app",
    siteName: "Call It",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Call It",
    description: "NFL betting prices in plain English. What the percentage means, what it pays, and what the records alone would say.",
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
