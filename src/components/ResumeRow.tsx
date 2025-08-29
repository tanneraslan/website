import React from "react";

interface RowProps {
  left: string;
  right: string;
  extras?: string;
}

export default function Row({ left, right, extras }: RowProps) {
  return (
    <div className="flex justify-between items-center mb-1">
      <div>
        <span className="font-semibold">{left}</span>
        {extras && (
          <>
            <span className="text-sm text-gray-500">{" | " + extras}</span>
          </>
        )}
      </div>
      <span className="text-sm text-gray-500">{right}</span>
    </div>
  );
}
