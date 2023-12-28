import { useRouter } from "next/router";
import React from "react";
import { Theme } from "@radix-ui/themes";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { MDXProvider } from "@mdx-js/react";

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

export default function App({ Component, pageProps }: any) {
  const router = useRouter();
  React.useEffect(() => {
    if (router.pathname === "/") {
      const elm = document.querySelector("h1");
      if (elm) elm.innerText = "Tanner Aslan";
    }
  }, [router.pathname]);
  return (
    <main className={`${inter.variable} font-sans`}>
      <ThemeProvider defaultTheme="dark" attribute="class">
        <Theme>
          <MDXProvider components={{ pre: () => <div>asd</div> }}>
            <Component {...pageProps} />
          </MDXProvider>
        </Theme>
      </ThemeProvider>
    </main>
  );
}
