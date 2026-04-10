import type {Metadata} from "next";
import "./globals.css";
import Footer from "./components/footer";
import SiteSky from "./components/SiteSky";
import ThemeProvider from "./components/ThemeProvider";
import {Poppins} from "next/font/google";
import React from "react";

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SkymDev's Portfolio",
  description: "Portfolio de Yannis PERRIER",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html
          lang="fr"
          className={poppins.className}
          data-scroll-behavior="smooth"
          suppressHydrationWarning
        >
        <head>
          {/* Inline script to set data-theme before first paint to avoid CSS flash */}
          <script dangerouslySetInnerHTML={{__html: `(function(){var h=new Date().getHours();document.documentElement.setAttribute('data-theme',h>=8&&h<18?'day':'night');})();`}} />
        </head>
        <body>
        <ThemeProvider>
          <SiteSky/>
          {children}
          <Footer/>
        </ThemeProvider>
        </body>
        </html>
    )
}
