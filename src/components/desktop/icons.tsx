import type { ReactNode, SVGProps } from "react";
import type { IconKey } from "@/config/apps";

type BaseProps = SVGProps<SVGSVGElement> & { children: ReactNode };

function Base({ children, ...props }: BaseProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

const PATHS: Record<IconKey, ReactNode> = {
  terminal: (
    <>
      <path d="m5 7 4 5-4 5" />
      <path d="M11 17h8" />
    </>
  ),
  life: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="1" />
      <path d="M7 3v3M17 3v3M3.5 9h17" />
      <path d="M7.5 13h3M13.5 13h3M7.5 16.5h3M13.5 16.5h3" />
    </>
  ),
  gallery: (
    <>
      <rect x="3.5" y="5" width="13" height="11" rx="1" />
      <path d="m7 13 2.5-3 2 2.2 1.7-2 2.8 3.3" />
      <circle cx="7.8" cy="8.4" r="1" />
      <path d="M8 19h11.5a1 1 0 0 0 1-1V8" />
    </>
  ),
  projects: (
    <>
      <rect x="3.5" y="4.5" width="5" height="15" rx="1" />
      <rect x="9.5" y="4.5" width="5" height="10" rx="1" />
      <rect x="15.5" y="4.5" width="5" height="13" rx="1" />
    </>
  ),
  snippets: (
    <>
      <path d="m8.5 8-4 4 4 4" />
      <path d="m15.5 8 4 4-4 4" />
      <path d="m13 5-2 14" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M15 3.5V8h4" />
      <path d="M8.5 12h7M8.5 15.5h7" />
    </>
  ),
  shelf: (
    <>
      <path d="M4 4.5h4v15H4zM10 4.5h4v15h-4z" />
      <path d="m16.5 5.2 3.2-.8 3 14.5-3.2.8z" />
    </>
  ),
  playlist: (
    <>
      <circle cx="7" cy="17" r="2.5" />
      <circle cx="18" cy="15" r="2.5" />
      <path d="M9.5 17V7l11-2v10" />
    </>
  ),
  letters: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  more: (
    <>
      <path d="M3.5 7.5a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
    </>
  ),
  assistant: (
    <>
      <rect x="3.5" y="5.5" width="17" height="12" rx="1" />
      <path d="m7 10 2.5 2L7 14" />
      <path d="M12 15h4" />
      <path d="M12 5.5v-2" />
    </>
  ),
  journal: (
    <>
      <path d="M5 3.5h14v17H5z" />
      <path d="M8.5 3.5v17M11.5 8h4M11.5 12h4M11.5 16h2.5" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19c.5-3 2.5-5 5.5-5s5 2 5.5 5" />
      <circle cx="17" cy="10" r="2.2" />
      <path d="M15.5 19c.3-2 1.5-3.5 3.5-3.5 1.2 0 2.2.6 2.8 1.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M5.9 5.9l1.4 1.4M16.7 16.7l1.4 1.4M18.1 5.9l-1.4 1.4M7.3 16.7l-1.4 1.4" />
    </>
  ),
  write: (
    <>
      <path d="M4 20h4l11-11-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3.5 20 7v5c0 4.5-3.2 7.5-8 8.5-4.8-1-8-4-8-8.5V7z" />
      <path d="m8.5 12 2.3 2.3 4.7-5" />
    </>
  ),
  login: (
    <>
      <path d="M14 4h5v16h-5" />
      <path d="m10 8 4 4-4 4" />
      <path d="M14 12H3.5" />
    </>
  ),
};

export function AppIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconKey }) {
  return <Base {...props}>{PATHS[name]}</Base>;
}
