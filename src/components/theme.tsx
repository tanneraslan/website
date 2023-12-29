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
import { BottomNav } from "./BottomNav";
import { Clock } from "./Clock";
import { Top } from "./Top";
import { Grid } from "./Grid";

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

  console.log(posts);
  return (
    <div className="md:px-0 px-4 py-12">
      <Top />
      <BottomNav />
      <Grid />

      <div className="theme">
        <Theme pageOpts={{ ...pageOpts, pageMap: [] }} {...rest}>
          <div>{children}</div>

          {router.pathname === "/" && (
            <div className="space-y-4 flex  flex-col mt-8">
              {posts.map((item) =>
                item.frontMatter ? (
                  <Link href={item.route} className="!no-underline">
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
                      <div className="relative flex flex-col justify-start md:grid p-4 grid-cols-5 gap-8 items-center md:space-x-8">
                        <div
                          className={`flex flex-col w-full text-left justify-between flex-1 h-full 
                          ${
                            item.frontMatter.image ? "col-span-3" : "col-span-5"
                          }`}
                        >
                          <div className="flex flex-col ">
                            <div className="no-underline	 text-lg pb-2 font-bold">
                              {item.frontMatter.title}
                            </div>
                            <div className="no-underline	 text-sm text-gray-11">
                              {truncate(item.frontMatter.description, {
                                length: 140,
                              })}
                            </div>
                          </div>
                          <div className="space-x-2 mt-auto py-4">
                            {item.frontMatter.tag.split(",").map((tag) => (
                              <span className="bg-gray-4 font-mono uppercase text-gray-11 rounded-md p-1 inline-block text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        {item.frontMatter.image ? (
                          <div className="col-span-3 col-start-4">
                            <img
                              className="rounded-md w-full !m-0"
                              src={item.frontMatter.image}
                              alt={""}
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
    </div>
  );
}
