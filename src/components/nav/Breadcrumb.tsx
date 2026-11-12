import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { CARRY } from '@/state/nav';

// Figma "Breadcrumb" (2362:29234): top-bar path. Parents are grey links, then a "/" (#b4b6bc) and the current
// page in Medium ink. Regular/Medium 14/20, 6px gaps. `after` sits right after the current label
// (the title menu chevron). Under 1024px only the current label shows; it truncates (full text in its tooltip).
export type Crumb = { label: string; to?: string };

export function Breadcrumb({
  parents,
  current,
  after,
  className,
}: {
  parents: Crumb[];
  current: string;
  after?: ReactNode;
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={clsx('flex min-w-0 shrink items-center gap-1.5', className)}
    >
      {parents.map((p) => (
        <div
          key={p.label}
          className="flex shrink-0 items-center overflow-clip max-lg:hidden"
        >
          {p.to ? (
            <Link
              to={p.to}
              state={CARRY}
              className="text-[14px] leading-5 tracking-[-0.08px] whitespace-nowrap text-muted hover:text-ink"
            >
              {p.label}
            </Link>
          ) : (
            <span className="text-[14px] leading-5 tracking-[-0.08px] whitespace-nowrap text-muted">
              {p.label}
            </span>
          )}
        </div>
      ))}
      <div className="flex min-w-0 items-center gap-1.5 overflow-clip text-[14px] leading-5 tracking-[-0.08px] whitespace-nowrap">
        {parents.length > 0 && (
          <span className="shrink-0 text-[#b4b6bc] max-lg:hidden">/</span>
        )}
        <span
          aria-current="page"
          title={current}
          className="min-w-0 truncate font-medium text-ink"
        >
          {current}
        </span>
        {after}
      </div>
    </nav>
  );
}
