import clsx from 'clsx';

// Renders a downloaded Figma SVG at its exported size. Each colour of an icon is its own file in
// src/assets/icons, named <icon>[-<colour>].svg, so the pixels match the Figma export exactly.
export function Icon({
  src,
  size = 16,
  className,
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={clsx('shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
}
