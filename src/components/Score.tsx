"use client";
import { SpinnerIcon } from "nextra/icons";
import { Fragment, useEffect, useRef, useState } from "react";
import WebMscore from "webmscore";
import Spinner from "./Spinner";
import { useMediaQuery } from "@/utils/useMediaQuery";

export const Score = (props: any) => {
  const mobile = useMediaQuery("(max-width: 768px)");

  console.log("score");
  const [svg, setSvg] = useState([]);
  const ref = useRef(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const source = useRef<AudioBufferSourceNode | null>(null);

  function playOggFromBuffer(buffer) {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    audioContext.decodeAudioData(buffer.buffer, (decodedBuffer) => {
      source.current = audioContext.createBufferSource();
      source.current.buffer = decodedBuffer;
      source.current.connect(audioContext.destination);
    });
  }

  const init = async () => {
    await WebMscore.ready;
    const data = await fetch(`/music/${props.id}.mscz`);
    const buffer = await data.arrayBuffer();
    const score = await WebMscore.load("mscz", new Uint8Array(buffer));

    let elms = [];
    const n = await score.npages();
    const arr = new Array(n).fill("");
    setSvg(arr);
    setCount(n);
    for (let i = 0; i < n; i++) {
      const svg = await score.saveSvg(i, true);
      setLoading(false);

      setSvg((cur) => {
        return cur.map((s, j) => (j === i ? svg : s));
      });
    }

    // const sf = await fetch("/music/FluidR3Mono_GM.sf3");
    // const soundFont = await sf.arrayBuffer();

    // await score.setSoundFont(new Uint8Array(soundFont));

    // const ogg = await score.saveAudio("ogg");
    console.log("loaded");
    // playOggFromBuffer(ogg);
  };

  useEffect(() => {
    init();
  }, [ref]);

  const playSong = () => {
    // source.current.start(0);
  };
  return (
    <div>
      {loading ? (
        <Spinner />
      ) : (
        <div
          className={`w-full inline-flex m-auto relative gap-${mobile ? 1 : 4} music `}
          style={{
            overflowX: "auto",
            scrollBehavior: "smooth",
            whiteSpace: "nowrap",
            scrollSnapType: "x mandatory",
            gridTemplateColumns: `repeat(${count}, ${mobile ? "100" : "50"}%)`,
          }}
          ref={ref}
        >
          {svg.map((svgString, index) => (
            <div
              style={{ scrollSnapAlign: "center" }}
              key={index}
              style={{ marginLeft: index ? "" : "auto", marginRight: index === (svg.length - 1) ? "auto" : ""}}
              dangerouslySetInnerHTML={{ __html : svgString }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Score;
