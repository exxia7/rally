import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useRef, useState, type ReactNode, type Ref } from 'react';

import { transitions, useEnter, useTransition, variants } from '@/lib/motion';
import { useFitInView } from '@/lib/useFitInView';

import { Icon } from './Icon';

// Popover menu from the attach menus (Figma "Attach menu", e.g. 2362:26459): white, 1px line-2 border (in layout),
// 12px radius, 6px padding, 2px gap, soft 0/4/16 shadow. The parent positions it (absolute) and owns open state;
// pair it with useOutsideClick. The highlighted row (well fill) follows the pointer and starts on the first row,
// as the Figma frames show it. It stays on screen: it shifts sideways, flips to the other side of its anchor and
// scrolls when tall (useFitInView).
export type MenuItemData = {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  onSelect?: () => void;
};

export function Menu({
  items,
  onClose,
  className,
  ref,
  label,
}: {
  items: MenuItemData[];
  onClose?: () => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  label?: string;
}) {
  const [active, setActive] = useState(0);
  const own = useRef<HTMLDivElement>(null);
  useFitInView(own, [items.length]);
  // Motion: opened while you watch, it scales up from 97% at its top and fades in (150ms). useFitInView shifts it
  // with `translate`, which the transform doesn't touch.
  const enter = useEnter();
  const t = useTransition(transitions.fast);
  return (
    <motion.div
      variants={variants.scaleIn}
      initial={enter ? 'hidden' : false}
      animate="shown"
      transition={t}
      style={{ transformOrigin: 'top' }}
      ref={(el) => {
        own.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      role="menu"
      aria-label={label}
      className={clsx(
        'z-30 flex max-w-[calc(100vw-32px)] flex-col items-start gap-0.5 overflow-clip rounded-card border border-line-2 bg-white p-1.5 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)]',
        className
      )}
    >
      {items.map((item, i) => (
        <MenuItem
          key={item.key}
          label={item.label}
          description={item.description}
          icon={item.icon}
          active={i === active}
          onHover={() => setActive(i)}
          onSelect={() => {
            item.onSelect?.();
            onClose?.();
          }}
        />
      ))}
    </motion.div>
  );
}

function MenuItem({
  label,
  description,
  icon,
  active,
  onHover,
  onSelect,
}: Omit<MenuItemData, 'key'> & {
  active: boolean;
  onHover: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      role="menuitem"
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onSelect}
      className={clsx(
        'flex w-full shrink-0 items-center gap-2.5 overflow-clip rounded-control px-2.5 py-2 text-left',
        active && 'bg-well'
      )}
    >
      {icon && <Icon src={icon} size={14} />}
      <span className="flex min-w-px flex-1 flex-col overflow-clip">
        <span className="w-full text-[13px] leading-[18px] font-medium text-ink">
          {label}
        </span>
        {description && (
          <span className="w-full text-[12px] leading-4 text-muted">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
