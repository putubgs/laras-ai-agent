export default function PlayCircleIcon({ className }: { className?: string }) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path
          d="M10.25 8.25v7.5L16.5 12l-6.25-3.75z"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    );
  }