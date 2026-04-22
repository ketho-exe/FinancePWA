import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shared Finance Tracker",
  description: "A simple shared finance tracker for personal budgets, categories, and monthly summaries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
