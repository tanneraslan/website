"use client";
import React, { useState, useEffect } from "react";

export const Clock = () => {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    // Calculate the current time only on the client side
    setCurrentTime(new Date().toLocaleDateString());
  }, []);

  return (
    <div className="text-xs text-gray-10 font-mono">
      TA2024 • {currentTime || "Loading..."}
    </div>
  );
};
