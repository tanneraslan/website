import localFont from 'next/font/local';
import { Providers } from "./providers"; // Import the new wrapper
import { getPageMap } from 'nextra/page-map';
import { Head } from "nextra/components";
import ClientLayout from "./client-layout";

import "katex/dist/katex.min.css";
import "./globals.css";

const mono = localFont({
  variable: "--font-mono",
  src: [
    {
      path: "./Supply-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./Supply-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
});

const inter = localFont({
  variable: "--font-sans",
  src: [
    {
      path: "./Pangram-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./Pangram-Bold.woff2",
      weight: "700",
      style: "normal",
    },

    {
      path: "./Pangram-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },

    {
      path: "./Pangram-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pageMap = await getPageMap();

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable} font-sans`}>
      <Head />
      <body>
        <Providers>
          <ClientLayout pageMap={pageMap}>
            {children}
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
