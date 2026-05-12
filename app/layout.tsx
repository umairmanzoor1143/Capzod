import type {Metadata} from "next";
import {AuthProvider} from "@/components/auth/AuthProvider";
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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
