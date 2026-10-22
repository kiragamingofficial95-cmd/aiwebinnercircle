import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "AI Web Design Inner Circle",
  description: "Premium video library and AI assistant for AI Web Design Inner Circle students",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/10 px-3 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
          <Link href="/" className="text-sm font-semibold text-white hover:text-indigo-300">Library</Link>
          <Link href="/ai" className="text-sm font-semibold text-white hover:text-indigo-300">AI Chat</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
