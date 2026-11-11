import clsx from 'clsx';
import { useEffect, type ReactNode } from 'react';

// Modal dialog (Figma "Scrim" + "Rerun modal", frame 4.1b, 2362:27129): a 30% ink scrim over the whole frame,
// the dialog centred: 460px, white, 1px line border, 14px radius, 24px top/sides, 20px bottom, 16px gaps,
// 0/16/40 shadow. Escape and a click on the scrim close it. Never wider than the viewport minus 32px.
export function Modal({
  open,
  onClose,
  label,
  width = 460,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  width?: number;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,18,20,0.3)] p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        style={{ width }}
        className={clsx(
          'flex max-h-full max-w-[calc(100vw-32px)] shrink-0 flex-col items-start gap-4 overflow-y-auto rounded-[14px] border border-line bg-white px-6 pt-6 pb-5 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.18)] max-md:px-5',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
