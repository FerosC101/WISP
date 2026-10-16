import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

// Lora: warm editorial serif for headings. Inter: clear, highly legible sans for everything else.
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

// Absolute URLs for link previews: Vercel provides the production domain at build time.
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  applicationName: "WISP",
  title: { default: "WISP — know what to do next", template: "%s · WISP" },
  description:
    "Gentle guidance when something feels off. WISP checks for warning signs first, asks for a short movement check only when it would help, and gives a clear next step. Healthcare prototype, not a diagnosis.",
  appleWebApp: { title: "WISP", capable: true, statusBarStyle: "default" },
  formatDetection: { telephone: false },
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
