import type { SVGProps } from "react";

export default function BulbIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M10 18h4M9 21h6M12 3a5 5 0 0 0-2 9.5V15h4v-2.5A5 5 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
