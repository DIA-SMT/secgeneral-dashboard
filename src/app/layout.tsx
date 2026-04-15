import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ChatDrawer } from "@/components/chat/chat-drawer";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Secretaría General — Dashboard Ejecutivo",
  description:
    "Sistema de seguimiento de la Planificación Operativa Anual — Municipalidad de San Miguel de Tucumán",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} h-full`}>
      <body className="h-full antialiased font-[family-name:var(--font-poppins)]">
        {children}
        <ChatDrawer />
      </body>
    </html>
  );
}
