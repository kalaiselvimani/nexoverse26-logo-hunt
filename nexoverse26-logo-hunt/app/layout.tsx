import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "NEXOVERSE'26 — LOGO HUNT",
  description: "Live Logo Hunt game platform",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}