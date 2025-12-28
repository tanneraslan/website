"use client";
import { useState, useRef, useEffect } from "react";
import {
  PlayIcon,
  EnterFullScreenIcon,
  ExitFullScreenIcon,
  ExclamationTriangleIcon
} from "@radix-ui/react-icons";

interface GameFrameProps {
  src: string;
  title?: string;
  aspectRatio?: "video" | "square" | "portrait";
  width?: string;
  height?: string;
}

export default function GameFrame({
  src,
  title = "Game Demo",
  aspectRatio = "video",
  width,
  height
}: GameFrameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Ref for the container we want to make fullscreen
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 1. Detect Mobile & Handle Fullscreen Events
  useEffect(() => {
    // Check for mobile user agent
    const checkMobile = () => {
      const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };

    // Sync state when ESC is pressed or native fullscreen changes
    const onFullscreenChange = () => {
      // If document.fullscreenElement is null, we have exited fullscreen
      setIsFullscreen(!!document.fullscreenElement);
    };

    checkMobile();
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const handleStart = () => {
    setIsPlaying(true);
    setTimeout(() => {
        iframeRef.current?.contentWindow?.focus();
    }, 100);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        // We don't need to manually setIsFullscreen(true) here
        // The 'fullscreenchange' event listener will handle it
        setTimeout(() => iframeRef.current?.contentWindow?.focus(), 100);
      } catch (err) {
        console.error("Error attempting to enable fullscreen:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  const ratioClass = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[9/16]",
  }[aspectRatio];

  return (
    <div
      ref={containerRef}
      className={`my-8 w-full border border-gray-4 bg-black rounded-lg overflow-hidden shadow-2xl flex flex-col ${isFullscreen ? 'bg-black' : ''}`}
    >
      <div
        className={`relative w-full ${isFullscreen ? 'flex-grow h-full' : (width ? '' : ratioClass)}`}
        style={isFullscreen ? {} : { width, height }}
      >
        {!isPlaying ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-12/10 backdrop-blur-sm p-6 text-center">

            {/* Mobile Warning */}
            {isMobile && (
              <div className="mb-6 flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-200 text-xs">
                 <ExclamationTriangleIcon />
                 <span>Mobile rendering is experimental. Desktop recommended.</span>
              </div>
            )}

            <button
              onClick={handleStart}
              className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
            >
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg group-hover:bg-blue-500 transition-colors">
                <PlayIcon className="w-8 h-8 text-white" />
              </div>
              <span className="text-white font-bold tracking-widest uppercase text-sm drop-shadow-md">
                Load Engine
              </span>
            </button>
            <p className="mt-4 text-gray-3 text-xs max-w-[200px]">
                Click to load the WebGL context and capture input.
            </p>
          </div>
        ) : null}

        {isPlaying && (
            <iframe
            ref={iframeRef}
            src={src}
            title={title}
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            />
        )}
      </div>

      <div className="bg-gray-3 border-t border-gray-4 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-mono text-gray-10 shrink-0">
        <div className="flex items-center gap-4">
            <span>{title}</span>
            <span className={isPlaying ? "text-green-500" : "text-gray-8"}>
                ● {isPlaying ? "Running" : "Standby"}
            </span>
        </div>

        <button
          onClick={toggleFullscreen}
          className="hover:text-white transition-colors flex items-center gap-1"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
             <>
               <ExitFullScreenIcon className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Exit</span>
             </>
          ) : (
             <>
               <EnterFullScreenIcon className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Fullscreen</span>
             </>
          )}
        </button>
      </div>
    </div>
  );
}
