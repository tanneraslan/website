"use client";

import { useParams } from "next/navigation";
import PostList from "@/components/PostList";

export default function TagPageContent({ posts }: { posts: any[] }) {
  const params = useParams();
  const rawTag = params?.tag as string;
  const tag = rawTag ? decodeURIComponent(rawTag) : "";

  const filteredPosts = posts.filter((post: any) =>
    post.frontMatter?.tag
      ?.split(",")
      .map((t: string) => t.trim())
      .includes(tag)
  );

  return (
    <div className="animate-in">
      <h1 className="text-4xl font-bold mb-8">Posts Tagged with “{tag}”</h1>
      {filteredPosts.length > 0 ? (
        <PostList posts={filteredPosts} />
      ) : (
        <p className="text-gray-11">No posts found with this tag.</p>
      )}
    </div>
  );
}
