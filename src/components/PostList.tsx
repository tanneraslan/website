import { Card } from "@radix-ui/themes";
import Link from "next/link";
import type { FrontMatter, MdxFile } from "nextra";
import PostTags from "@/components/PostTags";
import { truncate } from "lodash";
import { useRouter } from "next/navigation";

export default function PostList({ posts }: { posts: MdxFile<FrontMatter>[] }) {
  const router = useRouter();

  return (
    <div className="space-y-4 flex flex-col mt-8 pointer-events-auto">
      {posts.map((item) => (
        <div
          key={item.name}
          className="group relative cursor-pointer"
          onClick={() => router.push(item.route)}
        >
          <Card className="group-hover:bg-gray-3 transition-colors relative overflow-hidden border border-gray-4 bg-gray-2">
            {item.frontMatter?.image && (
              <div
                className="absolute inset-0 opacity-10 dark:opacity-10 blur-3xl scale-110 pointer-events-none"
                style={{
                  backgroundImage: `url(${item.frontMatter.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}

            <Link
              href={item.route}
              className="absolute inset-0"
              aria-label={item.frontMatter?.title}
            />

            <div className="relative flex flex-col justify-start md:grid p-4 grid-cols-5 gap-8 items-center md:space-x-8 pointer-events-none">
              <div className={`flex flex-col w-full text-left justify-between flex-1 h-full ${item.frontMatter?.image ? "col-span-3" : "col-span-5"}`}>
                <div className="text-lg pb-2 font-bold">{item.frontMatter?.title}</div>
                <div className="text-sm text-gray-11 mb-4">
                  {truncate(item.frontMatter?.description, { length: 140 })}
                </div>

                <div className="pointer-events-auto">
                   <PostTags tags={item.frontMatter?.tag}/>
                </div>
              </div>

              {item.frontMatter?.image && (
                <div className="col-span-2">
                  <img className="rounded-md w-full !m-0 border border-gray-4" src={item.frontMatter.image} alt="" />
                </div>
              )}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
