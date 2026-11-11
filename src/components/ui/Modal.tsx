import clsx from 'clsx';
import { useEffect, type ReactNode } from 'react';

// Modal dialog (Figma "Scrim" + "Rerun modal", frame 4.1b, 2362:27129): a 30% ink scrim over the whole frame,
// the dialog centred: 460px, white, 1px line border, 14px radius, 24px top/sides, 20px bottom, 16px gaps,
// 0/16/40 shadow. Escape and a click on the scrim close it. Never wider than the viewport minus 32px.
// `appearance="summary"` is the 5.2 launch summary (2362:25683): no border, 10px radius, 28px padding, 1/3 + 12/32
// shadow, over a 30% #1d1e22 scrim with a 2px backdrop blur. `contained` fills the nearest positioned parent
// (the map canvas) instead of the whole window.
export function Modal({
  open,
  onClose,
  label,
  width = 460,
  children,
  className,
  appearance = 'dialog',
  contained,
}: {
  appearance?: 'dialog' | 'summary';
  contained?: boolean;
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
      className={clsx(
        'inset-0 z-50 flex items-center justify-center p-4',
        contained ? 'absolute' : 'fixed',
        appearance === 'summary'
          ? 'bg-[rgba(29,30,34,0.3)] backdrop-blur-[2px]'
          : 'bg-[rgba(17,18,20,0.3)]'
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        style={{ width }}
        className={clsx(
          'flex max-h-full max-w-[calc(100vw-32px)] shrink-0 flex-col items-start gap-4 bg-white',
          appearance === 'summary'
            ? 'overflow-clip rounded-[10px] p-7 shadow-[0px_1px_3px_0px_rgba(16,18,24,0.06),0px_12px_32px_0px_rgba(16,18,24,0.1)] max-md:p-5'
            : 'overflow-y-auto rounded-[14px] border border-line px-6 pt-6 pb-5 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.18)] max-md:px-5',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
