import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rug or Moon | GenLayer",
  description: "The Ultimate Web3 Degen Party Game - AI-powered crypto project guessing game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
