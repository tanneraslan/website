import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { useMDXComponents as getThemeComponents } from 'nextra-theme-blog'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  const themeComponents = getThemeComponents() as MDXComponents;

  return {
    ...themeComponents,
    h1: ({ children }) => <h1 style={{ fontSize: "48px", fontWeight: 700 }}>{children}</h1>,

    a: ({ href, children, ...props }: any) => {
      const isExternal = href?.startsWith('http');

      if (!isExternal) {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        );
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },

    ...components,
  };
}
