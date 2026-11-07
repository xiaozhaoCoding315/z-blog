"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // SSR 默认按观测台（暗）渲染，客户端挂载后按真实主题渲染（避免水合不匹配）
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const dark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "切到报表模式" : "切到观测台模式"}
      className="text-muted-foreground"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="size-[1.1rem]" /> : <Moon className="size-[1.1rem]" />}
    </Button>
  );
}
