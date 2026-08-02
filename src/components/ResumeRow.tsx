import React from "react";

interface RowLink {
  label: string;
  href: string;
}

interface RowProps {
  left: string;
  right: string;
  extras?: string;
  href?: string;
  links?: RowLink[];
}

export default function Row({ left, right, extras, href, links }: RowProps) {
  return (
    <div className="flex justify-between items-center mb-1">
      <div>
        <span className="font-semibold">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer">
              {left}
            </a>
          ) : (
            left
          )}
        </span>
        {links?.map((link) => (
          <span key={link.href} className="text-sm">
            {" | "}
            <a href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          </span>
        ))}
        {extras && (
          <span className="text-sm text-gray-500">{" | " + extras}</span>
        )}
      </div>
      <span className="text-sm text-gray-500">{right}</span>
    </div>
  );
}
