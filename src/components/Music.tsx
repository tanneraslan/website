"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const Score = dynamic(() => import("./Score"), { ssr: false });

export const Music = () => {
  const { query } = useRouter();
  return <div>{query.id ? <Score id={query.id} /> : null}</div>;
};
