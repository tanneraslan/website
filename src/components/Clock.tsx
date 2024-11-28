"use client";
import React, { useState, useEffect } from "react";

const DEFAULT_DATE = new Date().toLocaleDateString()

export const Clock = () => {
  const [currentTime, setCurrentTime] = useState<string>(DEFAULT_DATE);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleDateString());
  }, []);

  return (
    <div className=" text-xs text-gray-10 font-mono">
      TA2024 • {currentTime}
    </div>
  );
 
};
