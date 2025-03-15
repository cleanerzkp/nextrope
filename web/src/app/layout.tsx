import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { headers } from 'next/headers'; 
import ContextProvider from "@/context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NextTrope - Secure Escrow Platform",
  description: "Secure escrow service for digital assets and physical goods",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get HTTP headers - headers() is actually synchronous in Next.js 14 and below
  // but will be async in future versions
  const headersList = headers();
  const cookie = headersList.get('cookie') || null;
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ContextProvider cookies={cookie}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </ContextProvider>
      </body>
    </html>
  );
}
