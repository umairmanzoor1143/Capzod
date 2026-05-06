import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subly - Animated Subtitle Video Generator",
  description: "Convert scripts into animated subtitle videos with Remotion."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
