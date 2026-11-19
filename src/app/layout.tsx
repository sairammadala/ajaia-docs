import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ajaia Docs", template: "%s · Ajaia Docs" },
  description: "Write, share and refine documents with your team.",
};

export const viewport: Viewport = { themeColor: "#f7f5f0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
