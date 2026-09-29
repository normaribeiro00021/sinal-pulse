import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Sinal Pulse — Radar de oportunidades", description: "Dados de demonstração · MOCK" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
