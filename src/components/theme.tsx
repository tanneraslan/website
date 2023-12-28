import type { NextraThemeLayoutProps } from "nextra";
import Footer from "./Footer";
import { Card, Container, Heading } from "@radix-ui/themes";
import Link from "next/link";
import { compact, sortBy, truncate } from "lodash";
import Image from "next/image";
import { useRouter } from "next/router";
import Theme from "nextra-theme-blog";
import "nextra-theme-blog/style.css";
import ThemeSwitch, { ThemeToggle } from "./ThemeToggle";

export default function Layout({
  children,
  pageOpts,
  ...rest
}: NextraThemeLayoutProps) {
  const { pageMap } = pageOpts;

  const router = useRouter();
  console.log(rest);
  const posts = sortBy(
    compact(pageMap.filter((item) => item.name === "posts")[0].children).filter(
      (item) => item.name !== "index"
    ),
    "frontMatter.date"
  ).reverse();

  return (
    <div className="my-12">
      <ThemeSwitch />
      <Theme pageOpts={{ ...pageOpts, pageMap: [] }} {...rest}>
        {children}
        {router.pathname === "/" && (
          <div className="space-y-4 flex  flex-col mt-8">
            {posts.map((item) =>
              item.frontMatter ? (
                <Link href={item.route}>
                  <Card className="hover:bg-gray-3 relative">
                    {item.frontMatter.image ? (
                      <Image
                        className="rounded-md absolute blur-xl opacity-5 top-0 w-full  !m-0"
                        src={item.frontMatter.image}
                        alt={""}
                        width={300}
                        height={300}
                      />
                    ) : null}
                    <div className="relative grid p-4 grid-cols-5 gap-8 items-center space-x-8">
                      <div
                        className={
                          item.frontMatter.image ? "col-span-3" : "col-span-5"
                        }
                      >
                        <div className="text-lg pb-2 font-bold">
                          {item.frontMatter.title}
                        </div>
                        <div className="text-sm text-gray-11">
                          {truncate(item.frontMatter.description, {
                            length: 140,
                          })}
                        </div>
                      </div>
                      {item.frontMatter.image ? (
                        <div className="col-span-3 col-start-4">
                          <Image
                            className="rounded-md !m-0"
                            src={item.frontMatter.image}
                            alt={""}
                            width={300}
                            height={300}
                          />
                        </div>
                      ) : null}
                    </div>
                  </Card>
                </Link>
              ) : null
            )}
          </div>
        )}
        <Footer />
      </Theme>
    </div>
  );
}
