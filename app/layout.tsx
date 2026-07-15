import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { ThemeInitScript } from "@/components/theme-init-script";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DAIEGO Store — POS e inventario",
  description: "Sistema de punto de venta e inventario por organización, creado por DAIEGO",
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
      <body className="liquid-app relative h-full min-h-dvh font-sans antialiased">
        <ThemeInitScript />
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}
