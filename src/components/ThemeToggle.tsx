import { useTheme } from "next-themes";
import { useMounted } from "nextra/hooks";
import { MoonIcon, SunIcon } from "nextra/icons";

export default function ThemeSwitch() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === "dark";

  // @TODO: system theme
  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <span
      role="button"
      aria-label="Toggle Dark Mode"
      className="nx-cursor-pointer  absolute top-0 right-0 mr-6 nx-text-current"
      tabIndex={0}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === "Enter") toggleTheme();
      }}
    >
      {mounted && isDark ? <MoonIcon /> : <SunIcon />}
    </span>
  );
}