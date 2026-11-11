import clsx from 'clsx';
import type { CSSProperties } from 'react';

import { type CharacterArt, CHARACTERS, type CharacterName } from './characters';

// A character's artwork fitted (contain, centred) into a `width`×`height` box, the way the
// "Agent art" components and floating map characters place it. Defaults to the symbol's own size.
export function Character({
  name,
  ...rest
}: {
  name: CharacterName;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return <FittedArt art={CHARACTERS[name]} {...rest} />;
}

// Artwork fitted (contain, centred) into a box; the box defaults to the artwork's own size.
export function FittedArt({
  art: c,
  width,
  height,
  className,
  style,
}: {
  art: CharacterArt;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const boxW = width ?? (height ? (height * c.w) / c.h : c.w);
  const boxH = height ?? (width ? (width * c.h) / c.w : c.h);
  const scale = Math.min(boxW / c.w, boxH / c.h);
  const frameW = c.w * scale;
  const frameH = c.h * scale;
  return (
    <div
      className={clsx('relative shrink-0', className)}
      style={{ width: boxW, height: boxH, ...style }}
    >
      <div
        className="absolute"
        style={{
          left: (boxW - frameW) / 2,
          top: (boxH - frameH) / 2,
          width: frameW,
          height: frameH,
        }}
      >
        <img
          src={c.src}
          alt=""
          className="absolute top-0 left-0"
          style={{
            width: c.art ? `${(c.art.w / c.w) * 100}%` : '100%',
            height: c.art ? `${(c.art.h / c.h) * 100}%` : '100%',
          }}
        />
      </div>
    </div>
  );
}
