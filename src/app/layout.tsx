import type { Metadata, Viewport } from "next";
import { PhoneFrame } from "@/components/layout/phone-frame";
import { InstallPrompt } from "@/components/layout/install-prompt";
import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Arranxos",
  title: "Arranxos — Servicios de confianza cerca de ti",
  description:
    "Conecta con profesionales verificados cerca de ti. Pago protegido, sin sorpresas.",
  manifest: "/manifest.json",
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Arranxos",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF5A5F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
