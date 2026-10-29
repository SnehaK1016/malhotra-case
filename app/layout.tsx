import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/caveat";
import PageCurtain from "@/components/PageCurtain";
import Cursor from "@/components/Cursor";

export const metadata: Metadata = {
  title: "The Malhotra Case: a data detective investigation",
  description: "A team-based data analytics murder mystery. Decode evidence, follow the money, and reconstruct the night.",
};
export const viewport: Viewport = { themeColor: "#18181a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" >
      <body>
        {children}
        <PageCurtain />
        <Cursor />
      </body>
    </html>
  );
}
