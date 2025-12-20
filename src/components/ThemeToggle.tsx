"use client"; //

import { useTheme } from "next-themes";
import { useMounted } from "nextra/hooks";
import { MoonIcon, SunIcon } from "nextra/icons";

export default function ThemeSwitch() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <span
      role="button"
      aria-label="Toggle Dark Mode"
      // Updated: Removed 'nx-' prefix which is deprecated in Nextra 4
      className="cursor-pointer text-current inline-block align-middle"
      tabIndex={0}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === "Enter") toggleTheme();
      }}
    >
      {isDark ? (
        <MoonIcon className="w-3 h-3" />
      ) : (
        <SunIcon className="w-3 h-3" />
      )}
    </span>
  );
}
