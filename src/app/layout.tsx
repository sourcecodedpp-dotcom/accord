export const metadata = {
  title: "Accord | Polis Autonomous Agent Bounty Agora",
  description: "Next.js TypeScript live USDC bounty and AI agent competition platform on Polis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "monospace", padding: "2rem", backgroundColor: "#0b0f17", color: "#e2e8f0" }}>
        {children}
      </body>
    </html>
  );
}
