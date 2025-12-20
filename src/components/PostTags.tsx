export default function PostTag({ tags } : {tags: string}) {
  return (
    <div className="space-x-2">
      {tags.split(",").map((tag: string) =>
        <span key={tag} className="bg-gray-4 font-mono uppercase text-gray-11 rounded-md p-1 inline-block text-xs">{tag.trim()}</span>
      )}
    </div>
  )
}
