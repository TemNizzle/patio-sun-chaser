import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "Patio Sun Chaser — Find sunny patios in Toronto",
    template: "%s | Patio Sun Chaser",
  },
  description:
    "A live directory of Toronto bars and restaurants with patios, showing which ones are in the sun right now and when the sun comes around.",
  openGraph: {
    title: "Patio Sun Chaser",
    description:
      "Find Toronto patios in the sun — right now, or at any time of day.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
