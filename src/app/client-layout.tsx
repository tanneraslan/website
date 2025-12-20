"use client";

import { usePathname } from "next/navigation";
import { type PageMapItem, Folder, FrontMatter, MdxFile } from "nextra";
import { Top } from "@/components/Top";
import { BottomNav } from "@/components/BottomNav";
import { Grid } from "@/components/Grid";
import Footer from "@/components/Footer";
import PostTags from "@/components/PostTags";
import PostHeader from "@/components/PostHeader";
import { Layout } from "nextra-theme-blog";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@radix-ui/themes";
import { compact, sortBy, truncate } from "lodash";

function PostList({ posts }: { posts: MdxFile<FrontMatter>[] }) {
  return (
    <div className="space-y-4 flex flex-col mt-8 pointer-events-auto">
      {posts.map((item) => (
        <Link href={item.route} className="!no-underline" key={item.name}>
          <Card className="hover:bg-gray-3 relative overflow-hidden">
            <div className="relative flex flex-col justify-start md:grid p-4 grid-cols-5 gap-8 items-center md:space-x-8">
              <div className={`flex flex-col w-full text-left justify-between flex-1 h-full ${item.frontMatter?.image ? "col-span-3" : "col-span-5"}`}>
                <div className="no-underline text-lg pb-2 font-bold">{item.frontMatter?.title}</div>
                <div className="no-underline text-sm text-gray-11 mb-4">
                  {truncate(item.frontMatter?.description, { length: 140 })}
                </div>
                <PostTags tags={item.frontMatter?.tag}/>
              </div>
              {item.frontMatter?.image && (
                <div className="col-span-2">
                  <img className="rounded-md w-full !m-0 border border-gray-4" src={item.frontMatter.image} alt="" />
                </div>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function ClientLayout({ children, pageMap }: { children: React.ReactNode, pageMap : PageMapItem[] }) {
  const pathname = usePathname();

  const isFullWidth = ["/photos", "/music/"].some((i) =>
    pathname.startsWith(i)
  );

  const lastSlashIndex = pathname.lastIndexOf('/');
  const pagePosts = pageMap.find((item) => 'name' in item && item.name === "posts") as Folder;
  const posts = (pagePosts ? sortBy(
    compact(pagePosts.children).filter((item) => 'frontMatter' in item && item.name !== "index"),
    "frontMatter.date"
  ).reverse() : []) as MdxFile<FrontMatter>[];

  const currentPostData = pathname.slice(lastSlashIndex - 5, 6) === 'posts' ? posts.find((item) => item.name === pathname.slice(lastSlashIndex + 1)) : undefined;

  return (
    <div className="antialiased relative min-h-screen">
      <div className="fixed pointer-events-auto">
        <Grid />
      </div>

      <div className="relative pointer-events-none">
        <header className="mx-auto max-w-3xl px-6 w-full pt-12">
          <div className="display-contents pointer-events-auto"> <Top />
            <BottomNav />
          </div>
        </header>

        <main className={`w-full ${isFullWidth ? "" : "mx-auto max-w-3xl px-6"}`}>
          <Layout>
            <article
              className={`${isFullWidth ? "mt-4" : "prose dark:prose-invert max-w-none mt-4"} pointer-events-auto`}
            >
              {currentPostData?.frontMatter && (
                <PostHeader postFrontMatter={currentPostData.frontMatter} />
              )}
              {children}
            </article>

            {pathname === "/" && (
              <PostList posts={posts}/>
            )}
          </Layout>
        </main>

        <footer className="mx-auto max-w-3xl px-6 w-full pt-8 pb-12">
          <div className="border-t border-gray-4 pt-8 pointer-events-auto">
            <Footer />
          </div>
        </footer>
      </div>
    </div>
  );
}
