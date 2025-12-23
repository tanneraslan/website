"use client";
import { useState, useRef, useLayoutEffect, ReactNode } from "react";
import ShaderCanvas from "./ShaderCanvas";

interface ShaderBlockProps {
  children: ReactNode;
  fullShader: string;
  maxHeight?: number;
}

export default function ShaderBlock({
  children,
  fullShader,
  maxHeight = 300
}: ShaderBlockProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("code");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (activeTab === "code" && contentRef.current) {
      if (contentRef.current.scrollHeight > maxHeight) {
        setIsOverflowing(true);
      } else {
        setIsOverflowing(false);
      }
    }
  }, [activeTab, maxHeight, children]);

  return (

    <div className="my-6 rounded-md overflow-hidden ring-1 ring-inset ring-gray-300 dark:ring-neutral-700 bg-white dark:bg-black shadow-sm group">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("code")}
            className={`text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === "code"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Code
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === "preview"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Preview
          </button>
        </div>
        <span className="text-[10px] text-gray-400 font-mono uppercase">GLSL</span>
      </div>

      <div className="relative w-full">
        {activeTab === "preview" ? (
          <div className="p-0 flex justify-center bg-black border-b border-gray-200 dark:border-neutral-800">
            <div className="w-full h-full aspect-square">
              <ShaderCanvas frag={fullShader} />
            </div>
          </div>
        ) : (
          <div
            ref={contentRef}
            style={{ maxHeight: isExpanded ? "none" : `${maxHeight}px` }}
            className={`relative overflow-hidden transition-all duration-300`}
          >
            <div className="grid w-full overflow-x-auto text-[.9em]">
              <div className="p-4 min-w-0">
                {children}
              </div>
            </div>

            {isOverflowing && !isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-black to-transparent pointer-events-none" />
            )}
          </div>
        )}
      </div>

      {activeTab === "code" && isOverflowing && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-200 dark:border-neutral-800 transition-colors"
        >
          {isExpanded ? "COLLAPSE CODE" : "VIEW FULL CODE"}
        </button>
      )}
    </div>
  );
}
