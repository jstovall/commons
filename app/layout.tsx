import type { Metadata, Viewport } from "next";
import { Caveat, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";


const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Commons",
  description: "Share and borrow with your neighbors.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Commons",
  },
};

export const viewport: Viewport = {
  themeColor: "#7C97A3",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
return (

    <html lang="en" className={`${caveat.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="min-h-screen bg-commons-page font-body text-commons-ink antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>

);
}