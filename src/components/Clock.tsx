"use client";
import React, { useState, useEffect } from "react";

export const Clock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  const formattedTime = currentTime.toLocaleDateString();

  return (
    <div className=" text-xs text-gray-10 font-mono">
      TA2024 • {formattedTime}
    </div>
  );
};
