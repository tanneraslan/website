"use client";
import React, { useState, useEffect } from "react";

export const Clock = () => {
  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now.toLocaleDateString());
    setCurrentYear(now.getFullYear());
  }, []);

  return (
    <div className="text-xs text-gray-10 font-mono">
      TA{currentYear || "----"} • {currentDate || "Loading..."}
    </div>
  );
};
