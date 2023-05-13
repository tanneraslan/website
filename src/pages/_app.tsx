import { useRouter } from "next/router";
import React from "react";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }: any) {
  const router = useRouter();
  React.useEffect(() => {
    console.log(router);
    if (router.pathname === "/") {
      const elm = document.querySelector("h1");
      if (elm) elm.innerText = "Tanner Aslan";
    }
  }, [router.pathname]);
  return (
    <main className={inter.className}>
      <Component {...pageProps} />
    </main>
  );
}
