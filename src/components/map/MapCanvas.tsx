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
// Phones open at a readable zoom (the readout shows 66%) instead of fit-to-width (~23%), scrolled to `focus`.
const PHONE_ZOOM = 0.8;
const isPhone = () => typeof window !== 'undefined' && window.innerWidth < 768;
const clamp = (z: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor(z * 1000 + 1e-6) / 1000));

// Figma "ZoomStage": the map canvas. A pannable viewport (scroll, or drag with the mouse) holding the
// stage at its design size (1362×830, the canvas area of a 1440×900 frame), so at 1440×900 it is
// exactly the Figma frame. Zoom controls scale the stage; Fit view fits the whole stage. Under 768px it starts at a
// readable zoom, scrolled so `focus` (a stage point, e.g. the active node) is in view.
// `overlay` is pinned to the viewport (Tasks chip, Completed agents), not to the map. Zoom controls sit 16px from
// the bottom-right; planning screens with "What goes out" put them bottom-left (`zoomPosition="left"`).
export function MapCanvas({
  stageWidth = 1362,
  stageHeight = 830,
  zoomLabelBase = 83,
  overlay,
  zoomClassName,
  zoomPosition = 'right',
  focus,
  fitWidth,
  className,
  children,
}: {
  stageWidth?: number;
  stageHeight?: number;
  /** What the Figma zoom readout shows at design size (the frames say 83%). */
  zoomLabelBase?: number;
  overlay?: ReactNode;
  zoomClassName?: string;
  zoomPosition?: 'left' | 'right';
  /** Stage point to scroll into view when a phone opens the map (defaults to the stage centre). */
  focus?: { x: number; y: number };
  /** Desktop: while the viewport is narrower than the stage, scale the stage down to fit its width (the same
   *  zoom as Fit view), until the zoom controls are used. A run screen with the side panel docked at 1280–1440px. */
  fitWidth?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(() => (isPhone() ? PHONE_ZOOM : 1));
  const prevZoom = useRef(zoom);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);

  const fit = () => {
    const el = scroller.current;
    if (!el) return 1;
    return clamp(
      Math.min(el.clientWidth / stageWidth, el.clientHeight / stageHeight)
    );
  };

  // Phones: scroll the opening zoom to the focus point once the viewport is measured.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !isPhone()) return;
    const fx = focus?.x ?? stageWidth / 2;
    const fy = focus?.y ?? stageHeight / 2;
    el.scrollLeft = fx * zoom - el.clientWidth / 2;
    el.scrollTop = fy * zoom - el.clientHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, for the opening view
  }, []);

  // fitWidth: follow the viewport width (never above 100%) until the user zooms by hand.
  const userZoomed = useRef(false);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !fitWidth || isPhone()) return;
    const update = () => {
      if (userZoomed.current) return;
      setZoom(el.clientWidth >= stageWidth ? 1 : clamp(el.clientWidth / stageWidth));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitWidth, stageWidth]);
  const zoomBy = (next: number) => {
    userZoomed.current = true;
    setZoom(next);
  };

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
        onZoomOut={() => zoomBy(clamp(z - STEP))}
        onZoomIn={() => zoomBy(clamp(z + STEP))}
        onFit={() => zoomBy(fit())}
        className={clsx(
          'absolute bottom-4',
          zoomPosition === 'left' ? 'left-4' : 'right-4',
          zoomClassName
        )}
      />
    </div>
  );
}
