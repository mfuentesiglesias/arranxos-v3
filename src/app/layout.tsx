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
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
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
