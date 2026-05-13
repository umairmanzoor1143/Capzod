import type {Metadata, Viewport} from "next";
import {Inter} from "next/font/google";
import {AuthProvider} from "@/components/auth/AuthProvider";
import {MobileAppNav} from "@/components/layout/MobileAppNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app",
});

export const metadata: Metadata = {
  title: "Capzod - Animated Subtitle Video Generator",
  description: "Convert scripts into animated subtitle videos with Remotion."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.className} min-h-[100dvh] bg-slate-50 antialiased text-slate-900 tracking-tight`}
      >
        <AuthProvider>
          {children}
          <MobileAppNav />
        </AuthProvider>
      </body>
    </html>
  );
}
