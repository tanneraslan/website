"use client";

import { FrontMatter } from "nextra";
import PostTags from "./PostTags";
import { useState, useEffect } from "react";

export default function PostHeader({ postFrontMatter }: { postFrontMatter: FrontMatter }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const datetime = new Date(postFrontMatter.date);

  const formatted = mounted
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }).format(datetime).replace(/,/g, '')
    : datetime.toDateString();

  return (
    <header className="not-prose mb-10 pointer-events-auto">
      <h1>
        {postFrontMatter.title}
      </h1>

      <div className="flex flex-wrap items-center gap-1 text-gray-11">
        <time dateTime={datetime.toISOString()}>
          Last updated at {formatted}
        </time>

        <span className="text-lg px-1">•</span>

        <PostTags tags={postFrontMatter.tag} />
      </div>
    </header>
  );
}
