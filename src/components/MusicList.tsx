import { Card } from "@radix-ui/themes";
import Link from "next/link";
import type { FrontMatter, MdxFile } from "nextra";
import { useRouter } from "next/navigation";
import { truncate } from "lodash";

interface MusicFrontMatter extends FrontMatter {
  genre?: string | string[];
}

export default function MusicList({ music }: { music: MdxFile<FrontMatter>[] }) {
  const router = useRouter();

  return (
    <div className="space-y-4 flex flex-col mt-8 pointer-events-auto">
      {music.map((item) => {
        const fm = item.frontMatter as MusicFrontMatter;

        const genres = Array.isArray(fm?.genre)
          ? fm.genre
          : [fm?.genre].filter(Boolean);

        return (
          <div
            key={item.route}
            className="group relative cursor-pointer"
            onClick={() => router.push(item.route)}
          >
            <Card className="group-hover:bg-gray-3 transition-colors relative overflow-hidden border border-gray-4 bg-gray-2">
              <Link
                href={item.route}
                className="absolute inset-0 z-10"
                aria-label={fm?.title}
              />

              <div className="relative z-20 flex flex-col p-4 gap-2">
                <div className="flex justify-between items-start">
                  <div className="text-lg font-bold">{fm?.title}</div>
                  <time className="text-xs text-gray-10 font-mono mt-1">
                    {new Date(fm?.date).getFullYear()}
                  </time>
                </div>
                {fm?.description && <div className="text-sm text-gray-11 mb-4">
                  {truncate(fm?.description, { length: 140 })}
                </div>}

                <div className="flex flex-wrap gap-2 mt-2 pointer-events-none">
                  {genres.map((g) => (
                    <span
                      key={g}
                      className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-gray-5 bg-gray-3 text-gray-11"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
