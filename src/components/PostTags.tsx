import Link from "next/link";

export default function PostTag({ tags }: { tags: string }) {
  if (!tags) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.split(",").map((tag: string) => {
        const cleanTag = tag.trim();
        return (
          <Link
            key={cleanTag}
            href={`/tags/${encodeURIComponent(cleanTag)}`}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-4 font-mono uppercase text-gray-11 rounded-md px-2 py-0.5 inline-block text-[10px] hover:bg-gray-5 transition-colors no-underline relative"
          >
            {cleanTag}
          </Link>
        );
      })}
    </div>
  );
}
