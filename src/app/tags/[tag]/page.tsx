import { getPageMap } from "nextra/page-map";
import ClientLayout from "@/app/client-layout";
import TagPageContent from "@/components/TagPageContent";
import type { Folder, MdxFile, FrontMatter } from "nextra";
import { sortBy, compact } from "lodash";

export default async function Page(props: { params: Promise<{ tag: string }> }) {
  const params = await props.params;
  const pageMap = await getPageMap();

  const pagePosts = pageMap.find((item) => 'name' in item && item.name === "posts") as Folder;
  const posts = (pagePosts ? sortBy(
    compact(pagePosts.children).filter((item) => 'frontMatter' in item && item.name !== "index"),
    "frontMatter.date"
  ).reverse() : []) as MdxFile<FrontMatter>[];

  return (
    <ClientLayout pageMap={pageMap}>
      <TagPageContent posts={posts} />
    </ClientLayout>
  );
}
