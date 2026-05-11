import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — CRM de pré-vendas com IA`,
  description: BRAND.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="light" suppressHydrationWarning>
      <body className={`${jakarta.className} antialiased`}>{children}</body>
    </html>
  );
}
