import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

// Lora: warm editorial serif for headings. Inter: clear, highly legible sans for everything else.
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WISP — gentle guidance when something feels off",
  description: "Wireless Intelligent Sensing for Personalized Self-Triage",
};

// Mobile-first: fill the screen edge to edge and pad for the iPhone home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf7ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" className={`${lora.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
