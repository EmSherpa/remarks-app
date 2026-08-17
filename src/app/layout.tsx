import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Remarks Generator",
  description: "Quarterly report card remarks, generated from unit plans and marks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <nav>
  <a href="/sections">Sections</a>
  <a href="/students">Students</a>
  <a href="/quarters">Quarters</a>
  <a href="/units">1. Units & rubrics</a>
  <a href="/marks">2. Enter marks</a>
  <a href="/generate">3. Generate & export</a>
</nav>
        <main><ToastProvider>{children}</ToastProvider></main>
      </body>
    </html>
  );
}