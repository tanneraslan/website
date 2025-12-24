"use client";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import {
  PlayIcon,
  PauseIcon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
  SpeakerQuietIcon
} from "@radix-ui/react-icons";

interface WaveformPlayerProps {
  audioSrc: string;
}

export default function WaveformPlayer({ audioSrc }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState("0:00");
  const [currentTime, setCurrentTime] = useState("0:00");

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const getColor = (variable: string) => {
        return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    };

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: getColor("--gray-6") || "#888888",
      progressColor: getColor("--gray-12") || "#000000",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 3,
      barRadius: 2,
      height: 80,
      normalize: true,
      url: audioSrc,
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("timeupdate", (currentTime) => {
      setCurrentTime(formatTime(currentTime));
    });
    wavesurfer.on("ready", (duration) => {
      setDuration(formatTime(duration));
      wavesurfer.setVolume(1);
    });

    const observer = new MutationObserver(() => {
      wavesurfer.setOptions({
        waveColor: getColor("--gray-6"),
        progressColor: getColor("--gray-12"),
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"]
    });

    return () => {
      observer.disconnect();
      wavesurfer.destroy();
    };
  }, [audioSrc]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0 && isMuted) setIsMuted(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const VolumeIcon = isMuted || volume === 0
    ? SpeakerOffIcon
    : volume < 0.5
      ? SpeakerQuietIcon
      : SpeakerLoudIcon;

  return (
    <div className="bg-gray-2 border border-gray-4 rounded-lg p-4 my-6">
      <div className="flex gap-4 items-start">
        <div className="h-[80px] flex items-center shrink-0">
            <button
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-12 text-gray-1 hover:opacity-90 transition-opacity"
            >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
        </div>

        <div className="flex-grow flex flex-col">
           <div ref={containerRef} className="w-full" />
           <div className="flex justify-between text-xs text-gray-10 font-mono mt-2">
             <span>{currentTime}</span>
             <span>{duration}</span>
           </div>
        </div>

        <div className="h-[80px] flex items-center gap-2 shrink-0">
            <button onClick={toggleMute} className="text-gray-11 hover:text-gray-12">
                <VolumeIcon />
            </button>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 accent-gray-12 h-1 cursor-pointer"
                aria-label="Volume"
            />
        </div>

      </div>
    </div>
  );
}
