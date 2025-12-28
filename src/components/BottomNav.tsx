"use client";
import Link from "next/link";
import Home from "./home.svg";
import Note from "./note.svg";

import {
  easeInOut,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useState } from "react";
import { useRect } from "@/utils/useRect";
import Picture from "./picture.svg";
import User from "./user.svg";
import Mail from "./mail.svg";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

const Button = (props: any) => {
  const [rect, ref] = useRect();
  const mo = useMotionValue(props.offsetX);
  const distance = rect
    ? Math.abs(props.offsetX - (rect?.left + rect?.width / 2))
    : 0;
  const dis = useMotionValue(distance);
  const spring = useSpring(dis, { stiffness: 300, damping: 15 });

  const scale = useTransform(spring, [rect?.width * 2, 0], [1, 1.5]);
  useEffect(() => {
    dis.set(props.hover ? distance : rect?.width * 2);
  }, [dis, distance, props.hover]);
  return (
    <motion.div
      className="relative"
      style={{ zIndex: distance < rect?.width ? 100 : 0, scale }}
      transition={{ type: "linear" }}
      ref={ref}
    >
      <Link
        className="h-10 w-10 text-gray-11 rounded-full bg-gray-3 relative border border-gray-4 flex items-center justify-center"
        href={props.href}
        target={ props.openNewTab ? "_blank" : undefined}
      >
        {props.children}
      </Link>
    </motion.div>
  );
};
export const BottomNav = (props: any) => {
  const [offsetX, setoffsetX] = useState(0);
  const [hover, setHover] = useState(false);
  const [barRect, ref] = useRect();

  const handleMouseOver = (event: any) => {
    const offsetX = event.clientX;
    setoffsetX(offsetX);
  };
  return (
    <motion.div
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseOver={handleMouseOver}
      className="fixed transform -translate-x-1/2 flex items-center justify-center left-1/2 mb-6 bottom-0 z-50"
    >
      <motion.div
        initial="initial"
        whileHover="hover"
        variants={{ initial: { scale: 1 }, hover: { scale: 1.2 } }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="border border-gray-3 flex items-center justify-center bg-opacity-50 bg-gray-1 p-2 rounded-full"
      >
        <motion.div
          initial="initial"
          whileHover="hover"
          variants={{ initial: { scale: 1 }, hover: { scale: 0.9 } }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className={`space-x-3  flex items-center justify-center`}
        >
          <Button hover={hover} offsetX={offsetX} href="/">
            <Home />
          </Button>
          <Button hover={hover} offsetX={offsetX} href="/photos">
            <Picture />
          </Button>
          <Button hover={hover} offsetX={offsetX} href="/music">
            <Note />
          </Button>
          <Button hover={hover} offsetX={offsetX} href="/resume">
            <User />
          </Button>
          <Button
            hover={hover}
            offsetX={offsetX}
            href="https://github.com/tanneraslan"
            openNewTab
          >
            <GitHubLogoIcon />
          </Button>
          <Button
            hover={hover}
            offsetX={offsetX}
            href="mailto:contact@tanneraslan.com"
            openNewTab
          >
            <Mail />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
