import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "../lib/fonts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roulette Analyzer - Sistema Profissional de Análise de Estratégias",
  description: "Analise 318+ estratégias de roleta em tempo real. Sistema profissional com análise de padrões, cálculo de profit e ranking automático.",
  icons: {
    icon: '/roulette-icon.svg',
    shortcut: '/roulette-icon.svg',
    apple: '/roulette-icon.svg',
  },
  openGraph: {
    title: 'Roulette Analyzer',
    description: 'Sistema profissional de análise de estratégias de roleta com 318+ estratégias',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
