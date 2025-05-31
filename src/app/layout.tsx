import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from 'next/font/google'
import Footer from '@/app/components/footer';
import React from "react";

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '600', '700'],
    variable: '--font-poppins',
    display: 'swap',
})

export const metadata: Metadata = {
  title: "SkymDev's Portfolio",
  description: "Portfolio de Yannis PERRIER",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <>
          <html lang="fr">
          <body className={`${poppins.className}`}>
          {children}
          </body>
          </html>
          <Footer/>
      </>
  );
}
