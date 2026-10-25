import type { Metadata } from "next";
import { GuestbookBoard } from "@/components/guestbook/guestbook-board";

export const metadata: Metadata = {
  title: "留言板",
  description: "路过留个脚印：对博客的建议、想看的内容、或者只是打个招呼。",
};

export default function GuestbookPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          留言板
        </h1>
        <p className="mt-2 text-muted-foreground">
          路过留个脚印——建议、想法、或者只是打个招呼
        </p>
      </header>
      <GuestbookBoard />
    </div>
  );
}
