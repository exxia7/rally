import clsx from 'clsx';

// Figma "Suggestion" (2362:28986): tappable prompt chip above the chat input. Outlined like a Secondary button,
// 30px, hugs its label (Regular 12).
export function Suggestion({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex h-[30px] max-w-full shrink-0 items-center gap-1 rounded-control border border-control-border bg-white px-3 py-1.5 text-left hover:bg-hover',
        className
      )}
    >
      <span className="truncate text-[12px] leading-4 tracking-[-0.08px] text-ink">
        {label}
      </span>
    </button>
  );
}
