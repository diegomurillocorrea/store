import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { ThemeInitScript } from "@/components/theme-init-script";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Store — POS e inventario",
  description: "Sistema de punto de venta e inventario por organización",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeInitScript />
      </head>
      <body className="liquid-app relative h-full min-h-dvh font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
