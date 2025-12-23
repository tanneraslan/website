"use client";

import { usePathname } from "next/navigation";
import { type PageMapItem, Folder, FrontMatter, MdxFile } from "nextra";
import { Top } from "@/components/Top";
import { BottomNav } from "@/components/BottomNav";
import { Grid } from "@/components/Grid";
import Footer from "@/components/Footer";
import PostList from "@/components/PostList";
import PostHeader from "@/components/PostHeader";
import MusicList from "@/components/MusicList";
import MusicLayout from "@/components/MusicLayout";
import { Layout } from "nextra-theme-blog";
import { compact, sortBy } from "lodash";

export default function ClientLayout({ children, pageMap }: { children: React.ReactNode, pageMap : PageMapItem[] }) {
  const pathname = usePathname();

  const isFullWidth = pathname === "/photos" || (pathname.startsWith("/music") && pathname.length > 6);

  const getFiles = (folderName: string) => {
    const folder = pageMap.find((item) => 'name' in item && item.name === folderName) as Folder;
    return folder ? sortBy(
      compact(folder.children).filter((item) => 'frontMatter' in item && item.name !== "index"),
      "frontMatter.date"
    ).reverse() as MdxFile<FrontMatter>[] : [];
  }

  const posts = getFiles("posts");
  const music = getFiles("music");

  const currentPostData = posts.find((item) => item.route === pathname);
  const currentMusicData = music.find((item) => item.route === pathname);

  return (
    <div className="antialiased relative min-h-screen">
      <div className="fixed pointer-events-auto">
        <Grid />
      </div>

      <div className="relative pointer-events-none">
        <header className="mx-auto max-w-3xl px-6 w-full pt-12">
          <div className="display-contents pointer-events-auto">
            <Top />
            <BottomNav />
          </div>
        </header>

        <main className={`w-full z-0 ${isFullWidth ? "" : "mx-auto max-w-3xl px-6"}`}>
          <Layout>
            <article
              className={`${isFullWidth ? "mt-4" : "prose dark:prose-invert max-w-none mt-4"} pointer-events-auto`}
            >
              {/* 3. Conditional Rendering Logic */}
              {currentMusicData ? (
                // If it's a music page, wrap children in MusicLayout
                <MusicLayout frontMatter={currentMusicData.frontMatter as any}>
                  {children}
                </MusicLayout>
              ) : (
                // Otherwise, render standard post header + children
                <>
                  {currentPostData?.frontMatter && (
                    <PostHeader postFrontMatter={currentPostData.frontMatter} />
                  )}
                  {children}
                </>
              )}
            </article>

            {pathname === "/" && (
              <PostList posts={posts}/>
            )}
            {pathname === "/music" && (
              <MusicList music={music}/>
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
