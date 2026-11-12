import clsx from 'clsx';
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import { ZoomControls } from './CanvasControls';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const STEP = 0.1;
// Phones open at a readable zoom (the readout shows 66%) instead of fit-to-width (~23%), scrolled to `focus`.
const PHONE_ZOOM = 0.8;
// Fit view: room kept around the map, and between the map and a pinned canvas overlay.
const FIT_PAD = 40;
const OVERLAY_GAP = 16;
const FIT_MS = 200;
const isPhone = () => typeof window !== 'undefined' && window.innerWidth < 768;
const clamp = (z: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor(z * 1000 + 1e-6) / 1000));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

type Box = { left: number; top: number; right: number; bottom: number };

// The painted extent of the map, in stage px: every element inside the stage that draws something (an image,
// an SVG shape, a fill, a border, a shadow or its own text). Wrappers that only position things are skipped, and
// so is a fill covering the whole stage (a background), so the box is the cards, gates, labels, pills and
// connectors, not the stage. `data-fit-ignore` leaves an element and its subtree out.
function contentBounds(stage: HTMLElement, z: number): Box | null {
  const s = stage.getBoundingClientRect();
  let box: Box | null = null;
  const add = (r: DOMRect) => {
    if (r.width <= 0 && r.height <= 0) return;
    if (r.width >= s.width * 0.95 && r.height >= s.height * 0.95) return;
    const b = {
      left: (r.left - s.left) / z,
      top: (r.top - s.top) / z,
      right: (r.right - s.left) / z,
      bottom: (r.bottom - s.top) / z,
    };
    box = box
      ? {
          left: Math.min(box.left, b.left),
          top: Math.min(box.top, b.top),
          right: Math.max(box.right, b.right),
          bottom: Math.max(box.bottom, b.bottom),
        }
      : b;
  };
  const walk = (el: Element) => {
    if (el.hasAttribute('data-fit-ignore')) return;
    const cs = getComputedStyle(el);
    if (
      cs.display === 'none' ||
      cs.visibility === 'hidden' ||
      cs.opacity === '0'
    )
      return;
    if (el instanceof SVGGraphicsElement) {
      if (!(el instanceof SVGSVGElement) && !(el instanceof SVGGElement)) {
        add(el.getBoundingClientRect());
        return;
      }
    } else if (!(el instanceof SVGElement)) {
      const paints =
        el.tagName === 'IMG' ||
        (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          cs.backgroundColor !== 'transparent') ||
        cs.backgroundImage !== 'none' ||
        parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) > 0 ||
        cs.boxShadow !== 'none' ||
        [...el.childNodes].some(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
        );
      if (paints) add(el.getBoundingClientRect());
    }
    for (const c of el.children) walk(c);
  };
  for (const c of stage.children) walk(c);
  if (!box) return null;
  // The stage clips its content, so nothing outside it is visible.
  const b: Box = box;
  return {
    left: Math.max(0, b.left),
    top: Math.max(0, b.top),
    right: Math.min(s.width / z, b.right),
    bottom: Math.min(s.height / z, b.bottom),
  };
}

// The part of the canvas a fitted map may use, in canvas px: FIT_PAD in from each edge and clear of the pinned
// overlays (Tasks chip, Completed agents, legend, "What goes out", zoom controls). Each overlay reserves a band
// along the edge it is pinned to, top/bottom or left/right, whichever costs the smaller share of the canvas.
function fitArea(canvas: HTMLElement, exclude: Element): Box {
  const c = canvas.getBoundingClientRect();
  const W = c.width;
  const H = c.height;
  const inset = { left: 0, top: 0, right: 0, bottom: 0 };
  const consider = (el: Element) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    // A full-canvas wrapper only positions its children: look at those instead.
    if (r.width > W * 0.8 && r.height > H * 0.8) {
      for (const child of el.children) consider(child);
      return;
    }
    const x = r.left - c.left;
    const y = r.top - c.top;
    if (r.height / H <= r.width / W) {
      if (y + r.height / 2 < H / 2)
        inset.top = Math.max(inset.top, y + r.height + OVERLAY_GAP);
      else inset.bottom = Math.max(inset.bottom, H - y + OVERLAY_GAP);
    } else if (x + r.width / 2 < W / 2)
      inset.left = Math.max(inset.left, x + r.width + OVERLAY_GAP);
    else inset.right = Math.max(inset.right, W - x + OVERLAY_GAP);
  };
  for (const el of canvas.children) if (el !== exclude) consider(el);
  return {
    left: Math.max(FIT_PAD, inset.left),
    top: Math.max(FIT_PAD, inset.top),
    right: W - Math.max(FIT_PAD, inset.right),
    bottom: H - Math.max(FIT_PAD, inset.bottom),
  };
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

// Figma "ZoomStage": the map canvas. A pannable viewport (scroll, or drag with the mouse) holding the
// stage at its design size (1362×830, the canvas area of a 1440×900 frame), so at 1440×900 it is
// exactly the Figma frame. Zoom controls scale the stage. Under 768px it starts at a readable zoom, scrolled so
// `focus` (a stage point, e.g. the active node) is in view.
// Fit view (also ⌘/Ctrl+0 and Shift+1) scales the map's painted extent into the canvas area the pinned overlays
// leave free (40px in), centres it and resets the pan, over 200ms (instantly with reduced motion). From the first
// Fit on, the stage has a viewport of slack on every side, so any part of it can be centred. ⌘/Ctrl + and −
// zoom. The opening view never changes: Fit only applies when asked for.
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
  focusAt = 0.5,
  phoneZoom = PHONE_ZOOM,
  fitWidth,
  reveal,
  className,
  children,
}: {
  /** Bring the element with this data-node-id to the middle of the map (Tasks list → card); change `n` to repeat. */
  reveal?: { id: string; n: number };
  /** Phones: where `focus` lands, as a fraction of the canvas height (0.2 keeps it above a half-height sheet). */
  focusAt?: number;
  /** Phones: the opening zoom (the plan map's cards are drawn at 0.85, so it opens larger to stay readable). */
  phoneZoom?: number;
  stageWidth?: number;
  stageHeight?: number;
  /** What the Figma zoom readout shows at design size (the frames say 83%). */
  zoomLabelBase?: number;
  overlay?: ReactNode;
  zoomClassName?: string;
  zoomPosition?: 'left' | 'right';
  /** Stage point to scroll into view when a phone opens the map (defaults to the stage centre). */
  focus?: { x: number; y: number };
  /** Desktop: while the viewport is narrower than the stage, scale the stage down to fit its width, until the
   *  zoom controls are used. A run screen with the side panel docked at 1280–1440px. */
  fitWidth?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(() => (isPhone() ? phoneZoom : 1));
  // Slack (px) around the stage once Fit has been used; null keeps the opening, centred layout.
  const [free, setFree] = useState<{ x: number; y: number } | null>(null);
  const prevZoom = useRef(zoom);
  const skipCentre = useRef(false);
  const anim = useRef(0);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);

  // Phones: scroll the opening zoom to the focus point once the viewport is measured.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !isPhone()) return;
    const fx = focus?.x ?? stageWidth / 2;
    const fy = focus?.y ?? stageHeight / 2;
    el.scrollLeft = fx * zoom - el.clientWidth / 2;
    el.scrollTop = fy * zoom - el.clientHeight * focusAt;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, for the opening view
  }, []);

  // fitWidth: follow the viewport width (never above 100%) until the user zooms by hand.
  const userZoomed = useRef(false);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !fitWidth || isPhone()) return;
    const update = () => {
      if (userZoomed.current) return;
      setZoom(
        el.clientWidth >= stageWidth ? 1 : clamp(el.clientWidth / stageWidth)
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitWidth, stageWidth]);
  const zoomBy = (next: number) => {
    cancelAnimationFrame(anim.current);
    userZoomed.current = true;
    setZoom(next);
  };

  // Keep the viewport centre steady while zooming with the buttons or keys.
  useLayoutEffect(() => {
    const el = scroller.current;
    const prev = prevZoom.current;
    prevZoom.current = zoom;
    if (skipCentre.current) {
      skipCentre.current = false;
      return;
    }
    if (!el || prev <= 0 || zoom <= 0 || prev === zoom) return;
    const r = zoom / prev;
    const px = free?.x ?? 0;
    const py = free?.y ?? 0;
    el.scrollLeft =
      (el.scrollLeft - px + el.clientWidth / 2) * r + px - el.clientWidth / 2;
    el.scrollTop =
      (el.scrollTop - py + el.clientHeight / 2) * r + py - el.clientHeight / 2;
  }, [zoom, free]);

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  const z = zoom > 0 ? zoom : 1;

  // Fit view, or (with `target`) bring one element to the middle of the free area at the current zoom.
  const fitView = (target?: Element) => {
    const sc = scroller.current;
    const cv = canvas.current;
    const hd = holder.current;
    const st = stage.current;
    if (!sc || !cv || !hd || !st) return;
    cancelAnimationFrame(anim.current);
    const from = z;
    const s0 = st.getBoundingClientRect();
    const t = target?.getBoundingClientRect();
    const bounds = t
      ? {
          left: (t.left - s0.left) / from,
          top: (t.top - s0.top) / from,
          right: (t.right - s0.left) / from,
          bottom: (t.bottom - s0.top) / from,
        }
      : (contentBounds(st, from) ?? {
          left: 0,
          top: 0,
          right: stageWidth,
          bottom: stageHeight,
        });
    const area = fitArea(cv, sc);
    if (t) {
      // A side panel floating over the canvas (under 1280px) hides its right part: centre in what's left.
      const c = cv.getBoundingClientRect();
      for (const a of document.querySelectorAll('aside')) {
        const r = a.getBoundingClientRect();
        if (r.width > 0 && r.left > c.left + c.width / 3 && r.left < c.right)
          area.right = Math.min(area.right, r.left - c.left - FIT_PAD);
      }
    }
    const to = t
      ? from
      : clamp(
          Math.min(
            (area.right - area.left) / Math.max(1, bounds.right - bounds.left),
            (area.bottom - area.top) / Math.max(1, bounds.bottom - bounds.top)
          )
        );

    // Switch to the free layout without moving anything on screen. The scroller fills the canvas, so their
    // origins match.
    const sr = sc.getBoundingClientRect();
    const hr = hd.getBoundingClientRect();
    const ox0 = hr.left - sr.left;
    const oy0 = hr.top - sr.top;
    const pad = free ?? { x: sc.clientWidth, y: sc.clientHeight };
    if (!free) flushSync(() => setFree(pad));
    sc.scrollLeft = pad.x - ox0;
    sc.scrollTop = pad.y - oy0;

    // Target: the bounds' centre on the free area's centre.
    const ox1 =
      (area.left + area.right) / 2 - ((bounds.left + bounds.right) / 2) * to;
    const oy1 =
      (area.top + area.bottom) / 2 - ((bounds.top + bounds.bottom) / 2) * to;

    const finish = () => {
      if (!t) userZoomed.current = true;
      if (to !== zoom) skipCentre.current = true;
      flushSync(() => setZoom(to));
      hd.style.width = `${stageWidth * to}px`;
      hd.style.height = `${stageHeight * to}px`;
      st.style.transform = to === 1 ? '' : `scale(${to})`;
      sc.scrollLeft = pad.x - ox1;
      sc.scrollTop = pad.y - oy1;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    // Animate outside React (sizes, transform and scroll per frame), then commit the zoom.
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / FIT_MS);
      if (t >= 1) {
        finish();
        return;
      }
      const e = easeOut(t);
      const zz = from + (to - from) * e;
      hd.style.width = `${stageWidth * zz}px`;
      hd.style.height = `${stageHeight * zz}px`;
      st.style.transform = zz === 1 ? '' : `scale(${zz})`;
      sc.scrollLeft = pad.x - (ox0 + (ox1 - ox0) * e);
      sc.scrollTop = pad.y - (oy0 + (oy1 - oy0) * e);
      anim.current = requestAnimationFrame(tick);
    };
    anim.current = requestAnimationFrame(tick);
  };

  // ⌘/Ctrl+0 and Shift+1 fit; ⌘/Ctrl + and − zoom the map instead of the page.
  const keys = useRef({ fitView, zoomBy, z });
  useLayoutEffect(() => {
    keys.current = { fitView, zoomBy, z };
  });

  // Reveal: once laid out (the canvas may have just remounted for a docked panel), glide the card into view.
  useEffect(() => {
    if (!reveal) return;
    const raf = requestAnimationFrame(() => {
      const el = stage.current?.querySelector(
        `[data-node-id="${CSS.escape(reveal.id)}"]`
      );
      if (!el) return;
      keys.current.fitView(el);
      // Then pulse a blue ring twice so you can spot it.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        el.animate(
          [
            { boxShadow: '0 0 0 0 rgba(36,87,214,0)' },
            { boxShadow: '0 0 0 6px rgba(36,87,214,0.35)' },
            { boxShadow: '0 0 0 0 rgba(36,87,214,0)' },
          ],
          { duration: 700, iterations: 2, delay: FIT_MS }
        );
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per reveal request
  }, [reveal?.id, reveal?.n]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const k = keys.current;
      if (mod && !e.altKey && e.code === 'Digit0') {
        e.preventDefault();
        k.fitView();
      } else if (!mod && e.shiftKey && e.code === 'Digit1') {
        if (typing(e.target)) return;
        e.preventDefault();
        k.fitView();
      } else if (mod && !e.altKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        k.zoomBy(clamp(k.z + STEP));
      } else if (mod && !e.altKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        k.zoomBy(clamp(k.z - STEP));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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
      ref={canvas}
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
        <div
          className={
            free
              ? 'h-max w-max'
              : 'flex h-max min-h-full w-max min-w-full items-center justify-center'
          }
          style={free ? { padding: `${free.y}px ${free.x}px` } : undefined}
        >
          <div
            ref={holder}
            className="relative shrink-0"
            style={{ width: stageWidth * z, height: stageHeight * z }}
          >
            <div
              ref={stage}
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
        onFit={() => fitView()}
        className={clsx(
          'absolute bottom-4',
          zoomPosition === 'left' ? 'left-4' : 'right-4',
          zoomClassName
        )}
      />
    </div>
  );
}
