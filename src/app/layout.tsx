import type { Metadata, Viewport } from "next";
import { PhoneFrame } from "@/components/layout/phone-frame";
import { InstallPrompt } from "@/components/layout/install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arranxos — Servicios de confianza en Galicia",
  description:
    "Conecta con profesionales verificados en Galicia. Pago protegido, sin sorpresas.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Arranxos",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF5A5F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="app-root">
        <PhoneFrame>{children}</PhoneFrame>
        <InstallPrompt />
      </body>
    </html>
  );
}
