import type { Metadata } from "next"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: "KRYPTOS — Blockchain Intelligence Dashboard",
  description:
    "Full-stack blockchain intelligence platform combining ML, graph neural networks, and on-chain data analysis across 14 EVM chains.",
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
