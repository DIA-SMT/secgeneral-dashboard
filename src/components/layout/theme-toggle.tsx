"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.add("light");
      setLight(true);
    }
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    if (next) {
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }
  }

  return (
    <button
      onClick={toggle}
      className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-primary/30 transition-colors"
      title={light ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
    >
      {light ? (
        <span className="text-sm">◑</span>
      ) : (
        <span className="text-sm">◐</span>
      )}
    </button>
  );
}
