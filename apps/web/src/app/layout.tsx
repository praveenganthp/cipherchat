import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/navbar";
import { DemoBanner } from "@/components/layout/demo-banner";

export const metadata: Metadata = {
  title: "CipherChat — Privacy-First End-to-End Encrypted Messaging",
  description:
    "An open-source, zero-knowledge, end-to-end encrypted messaging platform featuring Web Crypto ECDH P-256, AES-256-GCM, disappearing messages, and limited-view media.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-background text-foreground antialiased flex flex-col overflow-hidden selection:bg-emerald-500/20 selection:text-emerald-300">
        <Providers>
          <DemoBanner />
          <Navbar />
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
