import type {Metadata} from "next";
import "./globals.css";
import Footer from "./components/footer";
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
        <html lang="fr" className={poppins.className}>
        <body>
        {children}
        <Footer/>
        </body>
        </html>
    )
}
