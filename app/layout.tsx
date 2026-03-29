import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { ThemeInitScript } from "@/components/theme-init-script";
import { ThemeToggle } from "@/components/theme-toggle";
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
      <body className="relative min-h-full flex flex-col font-sans">
        {children}
        <div className="pointer-events-none fixed right-4 top-4 z-200 sm:right-5 sm:top-5">
          <div className="pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>
      </body>
    </html>
  );
}
