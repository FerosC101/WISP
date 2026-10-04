import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

// Atkinson Hyperlegible was designed for low-vision readers.
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "WISP — self-triage and care navigation",
  description: "Wireless Intelligent Sensing for Personalized Self-Triage",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" className={`${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
