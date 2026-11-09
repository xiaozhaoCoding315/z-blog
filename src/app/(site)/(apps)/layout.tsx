import { AppFrame } from "@/components/desktop/app-frame";

export default function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppFrame>{children}</AppFrame>;
}
