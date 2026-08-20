import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Particle Rose",
  description: "An interactive 3D particle rose bouquet wrapped in translucent light.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
