"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { times } from "lodash";

export const Grid = () => {
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 1000], [1.1, 1]);
  const opacity = useTransform(scrollY, [0, 1000], [1, 0]);
  
  return (
    <motion.div
      className="fixed z-0 top-0 left-0 right-0 grid bottom-0 "
      style={{
        scale,
        opacity,
        perspectiveOrigin: "50% 50%",
      }}
    >
      <div
        className="sm:grid hidden absolute z-0 top-0 left-0 right-0  bottom-0"
        style={{
          transform: `translateX(25%) translateY(-25%) scale(1.5) rotateX(45deg) rotateZ(45deg)`,
          gridTemplateColumns: "repeat(40, 2vw)",
          gridTemplateRows: "repeat(40, 2vw)",
        }}
      >
        {times(40, (i) =>
          times(40, (j) => (
            <div className="w-full h-full transition transition-all duration-500 hover:duration-0 active:bg-gray-4 hover:bg-gray-3 border-[0.1px] border-gray-3 aspect-square border"
                 key={`${i}-${j}`} />
          ))
        )}
      </div>
      <div className="pointer-events-none bg-gradient-to-b from-transparent to-gray-1 absolute top-0 left-0 right-0 bottom-0" />
    </motion.div>
  );
};
