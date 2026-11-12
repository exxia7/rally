import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Button } from './Button';

// Not in Figma: a small confirmation after an action whose result isn't otherwise visible (Archive, Duplicate…).
// Built from the Menu surface (white, 1px line-2 border, 12px radius, soft 0/4/16 shadow) with 13px ink text and
// an optional small ghost action. Bottom-centre of the window, above the phone tab bar; hides after 4s.
export type ToastData = {
  message: string;
  action?: { label: string; onClick: () => void };
};

export function useToast(): [ReactNode, (t: ToastData) => void] {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<number>(undefined);
  const show = useCallback((t: ToastData) => {
    window.clearTimeout(timer.current);
    setToast(t);
    timer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = toast && (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-card border border-line-2 bg-white py-2 pr-2 pl-3.5 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)] max-md:bottom-[72px]"
    >
      <p className="min-w-px text-[13px] leading-[18px] font-medium text-ink">
        {toast.message}
      </p>
      {toast.action ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.action!.onClick();
            setToast(null);
          }}
        >
          {toast.action.label}
        </Button>
      ) : (
        <span className="w-1.5" />
      )}
    </div>
  );
  return [node, show];
}
