import type { Metadata } from "next";
// import Script from "next/script";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "rune",
  description: "ASCII art animations for React",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("rune-theme");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistMono.variable} ${geistMono.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
