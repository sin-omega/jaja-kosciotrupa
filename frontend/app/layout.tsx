import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Wrzuć film",
  description: "Zgłoś film z YouTube Shorts lub TikToka",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
