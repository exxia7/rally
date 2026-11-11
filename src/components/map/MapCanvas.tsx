import clsx from 'clsx';
import {
  type PointerEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { ZoomControls } from './CanvasControls';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const STEP = 0.1;
const clamp = (z: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor(z * 1000 + 1e-6) / 1000));

// Figma "ZoomStage": the map canvas. A pannable viewport (scroll, or drag with the mouse) holding the
// stage at its design size (1362×830, the canvas area of a 1440×900 frame), so at 1440×900 it is
// exactly the Figma frame. Zoom controls scale the stage; under 768px it starts fit-to-width.
// `overlay` is pinned to the viewport (Tasks chip, Completed agents), not to the map.
export function MapCanvas({
  stageWidth = 1362,
  stageHeight = 830,
  zoomLabelBase = 83,
  overlay,
  zoomClassName,
  className,
  children,
}: {
  stageWidth?: number;
  stageHeight?: number;
  /** What the Figma zoom readout shows at design size (the frames say 83%). */
  zoomLabelBase?: number;
  overlay?: ReactNode;
  zoomClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? -1 : 1
  );
  const prevZoom = useRef(zoom);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);

  const fit = (mode: 'width' | 'both') => {
    const el = scroller.current;
    if (!el) return 1;
    const w = el.clientWidth / stageWidth;
    const h = el.clientHeight / stageHeight;
    return clamp(mode === 'width' ? w : Math.min(w, h));
  };

  // Resolve the phone default (fit-to-width) once the viewport is measured.
  useLayoutEffect(() => {
    if (zoom === -1) setZoom(fit('width'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for the initial fit
  }, []);

  // Keep the viewport centre steady while zooming.
  useLayoutEffect(() => {
    const el = scroller.current;
    const prev = prevZoom.current;
    prevZoom.current = zoom;
    if (!el || prev <= 0 || zoom <= 0 || prev === zoom) return;
    const r = zoom / prev;
    el.scrollLeft =
      (el.scrollLeft + el.clientWidth / 2) * r - el.clientWidth / 2;
    el.scrollTop =
      (el.scrollTop + el.clientHeight / 2) * r - el.clientHeight / 2;
  }, [zoom]);

  const z = zoom > 0 ? zoom : 1;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button,a,input,[role=button]'))
      return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = scroller.current;
    if (!d || !el || d.id !== e.pointerId) return;
    el.scrollLeft -= e.clientX - d.x;
    el.scrollTop -= e.clientY - d.y;
    drag.current = { ...d, x: e.clientX, y: e.clientY };
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div
      className={clsx(
        'relative min-h-0 w-full min-w-0 flex-1 overflow-clip bg-canvas',
        className
      )}
    >
      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="absolute inset-0 cursor-grab overflow-auto [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex h-max min-h-full w-max min-w-full items-center justify-center">
          <div
            className="relative shrink-0"
            style={{ width: stageWidth * z, height: stageHeight * z }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left overflow-clip"
              style={{
                width: stageWidth,
                height: stageHeight,
                transform: z === 1 ? undefined : `scale(${z})`,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
      {overlay}
      <ZoomControls
        label={`${Math.round(zoomLabelBase * z)}%`}
        onZoomOut={() => setZoom(clamp(z - STEP))}
        onZoomIn={() => setZoom(clamp(z + STEP))}
        onFit={() => setZoom(fit('both'))}
        className={clsx('absolute right-4 bottom-4', zoomClassName)}
      />
    </div>
  );
}
