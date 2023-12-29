"use client";
import { Clock } from "./Clock";
import ThemeSwitch from "./ThemeToggle";

export const Top = () => {
  return (
    <div className="fixed flex items-center justify-between top-0 left-0 z-20 right-0 md:p-6 p-4">
      <Clock />
      <ThemeSwitch />
    </div>
  );
};
