"use client";

import { ThemeProvider } from "next-themes";
import { Theme as RadixTheme } from "@radix-ui/themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      defaultTheme="dark"
      attribute="class"
      enableSystem={false}
      disableTransitionOnChange
    >
      <RadixTheme>
        {children}
      </RadixTheme>
    </ThemeProvider>
  );
}
