import clsx from 'clsx';
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { ZoomControls } from './CanvasControls';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const STEP = 0.1;
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
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
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
// along one edge it is near: top/bottom or left/right. Of those choices, the one that lets a `bw`×`bh` map
// (stage px) show largest wins, so a wide map keeps the canvas's width and a tall one its height.
function fitArea(
  canvas: HTMLElement,
  exclude: Element,
  bw: number,
  bh: number,
): Box {
  const c = canvas.getBoundingClientRect();
  const W = c.width;
  const H = c.height;
  type Band = { side: keyof Box; size: number };
  const choices: [Band, Band][] = [];
  const consider = (el: Element) => {
    if (el.hasAttribute('data-fit-ignore')) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    // A full-canvas wrapper only positions its children: look at those instead.
    if (r.width > W * 0.8 && r.height > H * 0.8) {
      for (const child of el.children) consider(child);
      return;
    }
    const x = r.left - c.left;
    const y = r.top - c.top;
    const vertical: Band =
      y + r.height / 2 < H / 2
        ? { side: 'top', size: y + r.height + OVERLAY_GAP }
        : { side: 'bottom', size: H - y + OVERLAY_GAP };
    const horizontal: Band =
      x + r.width / 2 < W / 2
        ? { side: 'left', size: x + r.width + OVERLAY_GAP }
        : { side: 'right', size: W - x + OVERLAY_GAP };
    choices.push([vertical, horizontal]);
  };
  for (const el of canvas.children) if (el !== exclude) consider(el);
  let best: Box | null = null;
  let bestZoom = -1;
  // Few overlays (≤ 6), so every combination is cheap to try.
  for (let mask = 0; mask < 1 << choices.length; mask++) {
    const inset = {
      left: FIT_PAD,
      top: FIT_PAD,
      right: FIT_PAD,
      bottom: FIT_PAD,
    };
    choices.forEach((pair, i) => {
      const band = pair[(mask >> i) & 1];
      inset[band.side] = Math.max(inset[band.side], band.size);
    });
    const area = {
      left: inset.left,
      top: inset.top,
      right: W - inset.right,
      bottom: H - inset.bottom,
    };
    const zoom = Math.min(
      (area.right - area.left) / Math.max(1, bw),
      (area.bottom - area.top) / Math.max(1, bh),
    );
    if (zoom > bestZoom) {
      bestZoom = zoom;
      best = area;
    }
  }
  return (
    best ?? {
      left: FIT_PAD,
      top: FIT_PAD,
      right: W - FIT_PAD,
      bottom: H - FIT_PAD,
    }
  );
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

// Each map's last view (zoom, and the stage point at the canvas centre), by `viewKey`: a workflow's run map keeps
// its zoom across beats (4.1 → 4.2 → 4.3 are separate screens) and as panels open and close.
const VIEWS = new Map<string, { z: number; cx: number; cy: number }>();
// The opening view never draws cards smaller than this share of their full size (the zoom label's 75%).
const MIN_READABLE = 0.75;
const FADE = 'pointer-events-none absolute from-canvas to-transparent';

// Figma "ZoomStage": the map canvas. A pannable viewport (scroll, or drag with the mouse) holding the stage
// (`stageWidth` × `stageHeight`, the map's coordinate space) with a viewport of slack on every side, so any part
// of it can be centred. Zoom scales the stage.
//
// Opening view, the same on every plan and run canvas and at every width: the map's painted extent is fitted into
// the canvas area the pinned overlays leave free (40px in), at most at design size, and never below
// MIN_READABLE of the cards' full size. A map that is still larger is panned to keep `focus` (the node that needs
// you, is working or is ready; else the start of the map) in view. A soft fade marks every edge where the map is
// cut. After that the view is remembered per `viewKey` and kept as panels open and close and as the run moves on;
// it changes only when you zoom, pan or Fit view. Fit view (also ⌘/Ctrl+0 and Shift+1) fits the whole map over
// 200ms (instantly with reduced motion); ⌘/Ctrl + and − zoom.
// The zoom label is the real scale: zoom × `contentScale` (how large the map draws its cards at zoom 1).
// `overlay` is pinned to the viewport (Tasks chip, Completed agents), not to the map. Zoom controls sit 16px from
// the bottom-right; planning screens with "What goes out" put them bottom-left (`zoomPosition="left"`).
export function MapCanvas({
  stageWidth = 1362,
  stageHeight = 830,
  contentScale = 0.83,
  viewKey,
  overlay,
  zoomClassName,
  zoomPosition = 'right',
  focus,
  focusAt = 0.5,
  className,
  children,
}: {
  /** Phones: where `focus` lands, as a fraction of the free canvas height (0.2 keeps it above a half-height sheet). */
  focusAt?: number;
  stageWidth?: number;
  stageHeight?: number;
  /** How large the map draws its cards at zoom 1, as a share of their full size (run maps 0.83, plan maps 0.85). */
  contentScale?: number;
  /** Remembers the view under this key (e.g. `run:<workflow>`); without one each mount opens fresh. */
  viewKey?: string;
  overlay?: ReactNode;
  zoomClassName?: string;
  zoomPosition?: 'left' | 'right';
  /** Stage point to keep in view: the opening view pans to it when the map is larger than the canvas, and a
   *  change pans to it if it's out of view. */
  focus?: { x: number; y: number };
  className?: string;
  children: ReactNode;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const slack = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const key = viewKey && `${viewKey}:${stageWidth}x${stageHeight}`;
  const [zoom, setZoom] = useState(() => (key && VIEWS.get(key)?.z) || 1);
  const z = useRef(zoom);
  const pad = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const bounds = useRef<Box | null>(null);
  const [cut, setCut] = useState({ l: false, r: false, t: false, b: false });
  const anim = useRef(0);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);

  // The view, imperatively (React state only carries the zoom for the label and the next render).
  const applyZoom = (next: number) => {
    z.current = next;
    if (holder.current) {
      holder.current.style.width = `${stageWidth * next}px`;
      holder.current.style.height = `${stageHeight * next}px`;
    }
    if (stage.current)
      stage.current.style.transform = next === 1 ? '' : `scale(${next})`;
  };
  /** Where the stage's top-left corner is, in canvas px. */
  const origin = () => {
    const sc = scroller.current!;
    return {
      x: pad.current.x - sc.scrollLeft,
      y: pad.current.y - sc.scrollTop,
    };
  };
  const placeOrigin = (ox: number, oy: number) => {
    const sc = scroller.current!;
    sc.scrollLeft = pad.current.x - ox;
    sc.scrollTop = pad.current.y - oy;
  };
  /** The stage point at the canvas centre (for a canvas `w` × `h`, default its last measured size). */
  const centre = (w = pad.current.w, h = pad.current.h) => {
    const o = origin();
    return { cx: (w / 2 - o.x) / z.current, cy: (h / 2 - o.y) / z.current };
  };
  const placeCentre = (cx: number, cy: number) => {
    const sc = scroller.current!;
    placeOrigin(
      sc.clientWidth / 2 - cx * z.current,
      sc.clientHeight / 2 - cy * z.current,
    );
  };
  // A viewport of slack on every side, so any stage point can be scrolled to the centre.
  const measurePad = () => {
    const sc = scroller.current!;
    pad.current = {
      x: sc.clientWidth,
      y: sc.clientHeight,
      w: sc.clientWidth,
      h: sc.clientHeight,
    };
    if (slack.current)
      slack.current.style.padding = `${sc.clientHeight}px ${sc.clientWidth}px`;
  };
  const save = () => {
    if (key) VIEWS.set(key, { z: z.current, ...centre() });
  };
  const fullStage = (): Box => ({
    left: 0,
    top: 0,
    right: stageWidth,
    bottom: stageHeight,
  });
  const updateCut = () => {
    const sc = scroller.current;
    const b = bounds.current;
    if (!sc || !b) return;
    const o = origin();
    const k = z.current;
    const next = {
      l: o.x + b.left * k < -1,
      r: o.x + b.right * k > sc.clientWidth + 1,
      t: o.y + b.top * k < -1,
      b: o.y + b.bottom * k > sc.clientHeight + 1,
    };
    setCut((c) =>
      c.l === next.l && c.r === next.r && c.t === next.t && c.b === next.b
        ? c
        : next,
    );
  };
  /** The origin that puts stage point `p` at the free area's target spot, without leaving empty canvas where the
   *  map could be (a map larger than the area stays edge to edge). */
  const originFor = (
    b: Box,
    area: Box,
    k: number,
    p?: { x: number; y: number },
  ) => {
    const axis = (
      lo: number,
      hi: number,
      bLo: number,
      bHi: number,
      at: number,
      pv?: number,
    ) => {
      if ((bHi - bLo) * k <= hi - lo)
        return (lo + hi) / 2 - ((bLo + bHi) / 2) * k;
      const want = lo + (hi - lo) * at - (pv ?? bLo) * k;
      return Math.min(lo - bLo * k, Math.max(hi - bHi * k, want));
    };
    return {
      x: axis(area.left, area.right, b.left, b.right, 0.5, p?.x),
      y: axis(
        area.top,
        area.bottom,
        b.top,
        b.bottom,
        isPhone() ? focusAt : 0.5,
        p?.y,
      ),
    };
  };
  const freeArea = (b: Box) =>
    fitArea(
      canvas.current!,
      scroller.current!,
      b.right - b.left,
      b.bottom - b.top,
    );

  // Opening view: a remembered one, or fit within [readable, design size], panned to the focus.
  useLayoutEffect(() => {
    const sc = scroller.current;
    const st = stage.current;
    if (!sc || !st) return;
    measurePad();
    bounds.current = contentBounds(st, z.current) ?? fullStage();
    const b = bounds.current;
    const area = freeArea(b);
    const saved = key ? VIEWS.get(key) : undefined;
    if (saved) {
      applyZoom(saved.z);
      placeCentre(saved.cx, saved.cy);
      // The run moved on: if what needs you now is out of view, bring it in at the same zoom.
      if (focus && !inArea(focus, area)) {
        const o = originFor(b, area, saved.z, focus);
        placeOrigin(o.x, o.y);
      }
    } else {
      const fit = Math.min(
        (area.right - area.left) / Math.max(1, b.right - b.left),
        (area.bottom - area.top) / Math.max(1, b.bottom - b.top),
      );
      const lo = MIN_READABLE / contentScale;
      const k = clamp(Math.min(Math.max(1, lo), Math.max(lo, fit)));
      applyZoom(k);
      const o = originFor(b, area, k, focus);
      placeOrigin(o.x, o.y);
    }
    if (z.current !== zoom) setZoom(z.current);
    save();
    updateCut();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the opening view, once per mount
  }, []);

  /** Whether stage point `p` shows inside canvas area `area` at the current view. */
  const inArea = (p: { x: number; y: number }, area: Box) => {
    const o = origin();
    const x = o.x + p.x * z.current;
    const y = o.y + p.y * z.current;
    return (
      x >= area.left && x <= area.right && y >= area.top && y <= area.bottom
    );
  };

  // A new focus (a picker or drawer opened on a card): pan to it if it's out of view.
  const focusKey = focus ? `${Math.round(focus.x)},${Math.round(focus.y)}` : '';
  const firstFocus = useRef(true);
  useLayoutEffect(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      return;
    }
    const b = bounds.current;
    if (!focus || !b || !scroller.current) return;
    const area = freeArea(b);
    if (inArea(focus, area)) return;
    const o = originFor(b, area, z.current, focus);
    placeOrigin(o.x, o.y);
    save();
    updateCut();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follows the focus point only
  }, [focusKey]);

  // The canvas resizes (a panel opens or closes, the window changes): keep the same stage point centred.
  useLayoutEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const ro = new ResizeObserver(() => {
      if (sc.clientWidth === pad.current.w && sc.clientHeight === pad.current.h)
        return;
      const c = centre();
      measurePad();
      placeCentre(c.cx, c.cy);
      save();
      updateCut();
    });
    ro.observe(sc);
    // The map's extent changes when its content does (a step added, a fork drawn).
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (stage.current)
          bounds.current =
            contentBounds(stage.current, z.current) ?? fullStage();
        updateCut();
      });
    });
    if (stage.current)
      mo.observe(stage.current, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once; reads refs
  }, []);

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  // Zoom with the buttons or keys: the canvas centre stays put.
  const zoomTo = (next: number) => {
    if (!scroller.current) return;
    cancelAnimationFrame(anim.current);
    const c = centre();
    applyZoom(next);
    placeCentre(c.cx, c.cy);
    setZoom(next);
    save();
    updateCut();
  };

  const fitView = () => {
    const sc = scroller.current;
    const st = stage.current;
    if (!sc || !st) return;
    cancelAnimationFrame(anim.current);
    const from = z.current;
    const b = contentBounds(st, from) ?? fullStage();
    bounds.current = b;
    const area = freeArea(b);
    const to = clamp(
      Math.min(
        (area.right - area.left) / Math.max(1, b.right - b.left),
        (area.bottom - area.top) / Math.max(1, b.bottom - b.top),
      ),
    );
    const o0 = origin();
    const o1 = originFor(b, area, to);
    const finish = () => {
      applyZoom(to);
      placeOrigin(o1.x, o1.y);
      setZoom(to);
      save();
      updateCut();
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
      applyZoom(from + (to - from) * e);
      placeOrigin(o0.x + (o1.x - o0.x) * e, o0.y + (o1.y - o0.y) * e);
      anim.current = requestAnimationFrame(tick);
    };
    anim.current = requestAnimationFrame(tick);
  };

  // ⌘/Ctrl+0 and Shift+1 fit; ⌘/Ctrl + and − zoom the map instead of the page.
  const keys = useRef({ fitView, zoomTo });
  useLayoutEffect(() => {
    keys.current = { fitView, zoomTo };
  });
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
        k.zoomTo(clamp(z.current + STEP));
      } else if (mod && !e.altKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        k.zoomTo(clamp(z.current - STEP));
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
        className,
      )}
    >
      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onScroll={() => {
          updateCut();
          save();
        }}
        className="absolute inset-0 cursor-grab overflow-auto [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
        <div ref={slack} className="h-max w-max">
          <div
            ref={holder}
            className="relative shrink-0"
            style={{ width: stageWidth * zoom, height: stageHeight * zoom }}
          >
            <div
              ref={stage}
              className="absolute top-0 left-0 origin-top-left overflow-clip"
              style={{
                width: stageWidth,
                height: stageHeight,
                transform: zoom === 1 ? undefined : `scale(${zoom})`,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
      {/* Where the map runs past the canvas edge, it fades out instead of being sliced. */}
      {cut.l && (
        <div
          aria-hidden
          data-fit-ignore
          className={`${FADE} inset-y-0 left-0 w-10 bg-linear-to-r`}
        />
      )}
      {cut.r && (
        <div
          aria-hidden
          data-fit-ignore
          className={`${FADE} inset-y-0 right-0 w-10 bg-linear-to-l`}
        />
      )}
      {cut.t && (
        <div
          aria-hidden
          data-fit-ignore
          className={`${FADE} inset-x-0 top-0 h-10 bg-linear-to-b`}
        />
      )}
      {cut.b && (
        <div
          aria-hidden
          data-fit-ignore
          className={`${FADE} inset-x-0 bottom-0 h-10 bg-linear-to-t`}
        />
      )}
      {overlay}
      <ZoomControls
        label={`${Math.round(contentScale * zoom * 100)}%`}
        onZoomOut={() => zoomTo(clamp(z.current - STEP))}
        onZoomIn={() => zoomTo(clamp(z.current + STEP))}
        onFit={fitView}
        className={clsx(
          'absolute bottom-4',
          zoomPosition === 'left' ? 'left-4' : 'right-4',
          zoomClassName,
        )}
      />
    </div>
  );
}
