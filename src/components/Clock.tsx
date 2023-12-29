"use client";
import React, { useState, useEffect } from "react";

export const Clock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString();

  return (
    <div className=" text-xs text-gray-10 font-mono">
      TA 2024 • {formattedTime}
    </div>
  );
};
