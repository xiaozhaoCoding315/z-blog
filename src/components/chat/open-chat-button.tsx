"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OpenChatButton({ label = "AI 问答" }: { label?: string }) {
  return (
    <Button
      size="lg"
      variant="ghost"
      className="rounded-full px-6 text-primary"
      onClick={() => window.dispatchEvent(new CustomEvent("blog:open-chat"))}
    >
      <Sparkles className="size-4" /> {label}
    </Button>
  );
}
