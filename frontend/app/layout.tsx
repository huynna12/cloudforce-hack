import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heidi — Turn any lecture into a study session",
  description:
    "Paste a YouTube lecture URL. Get a structured outline, summaries, flashcards, and semantic search — instantly.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Heidi",
    description: "Turn any lecture into a personalized study environment.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAFAFA] text-[#111827]">
        {children}
      </body>
    </html>
  );
}
