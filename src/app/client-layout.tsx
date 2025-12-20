"use client";

import { usePathname } from "next/navigation";
import { type PageMapItem, Folder, FrontMatter, MdxFile } from "nextra";
import { Top } from "@/components/Top";
import { BottomNav } from "@/components/BottomNav";
import { Grid } from "@/components/Grid";
import Footer from "@/components/Footer";
import PostList from "@/components/PostList";
import PostHeader from "@/components/PostHeader";
import { Layout } from "nextra-theme-blog";
import { compact, sortBy } from "lodash";

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
