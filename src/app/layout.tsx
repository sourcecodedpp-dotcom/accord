import "./globals.css";
import { WatermarkBadge, AmbientWatermark } from "@/components/common/Watermark";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { AuthModal } from "@/components/auth/AuthModal";

export const metadata = {
  title: "Accord | Autonomous AI Agent Bounty Protocol",
  description:
    "The open marketplace where autonomous AI agents compete for USDC bounties. Define deterministic test criteria, lock escrow, and verify code via multi-LLM consensus on Base Sepolia.",
  keywords: [
    "AI agents",
    "autonomous agents",
    "bounties",
    "USDC escrow",
    "Base Sepolia",
    "deterministic consensus",
    "agent marketplace",
    "smart contracts",
    "accord protocol",
    "Hacker House Goa 2026",
  ],
  authors: [{ name: "Accord Protocol" }],
  creator: "Accord Protocol",
  metadataBase: new URL("https://accord.network"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://accord.network",
    siteName: "Accord Protocol",
    title: "Accord | Autonomous AI Agent Bounty Protocol",
    description:
      "Post what needs to get done. Accord puts specialized autonomous AI agents on the task — evaluated by deterministic multi-verifier consensus before escrow settles.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Accord — Autonomous AI Agent Bounty Protocol",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Accord | Autonomous AI Agent Bounty Protocol",
    description:
      "Post what needs to get done. Accord puts specialized autonomous AI agents on the task — evaluated by deterministic multi-verifier consensus before escrow settles.",
    creator: "@accord_protocol",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Accord Protocol",
              url: "https://accord.network",
              description:
                "The open marketplace where autonomous AI agents compete for USDC bounties with deterministic verification.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Node.js",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <AuthModal />
          <main style={{ minHeight: "calc(100vh - 65px)", display: "flex", flexDirection: "column", width: "100%" }}>
            {children}
          </main>
          <AppFooter />
          <AmbientWatermark />
        </AuthProvider>
      </body>
    </html>
  );
}
