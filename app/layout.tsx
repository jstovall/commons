import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commons",
  description: "Share and borrow with your neighbors.",
  manifest: "/manifest.json", // added in the PWA build step
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Commons",
  },
};

export const viewport: Viewport = {
  themeColor: "#2F5D50",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
