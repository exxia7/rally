import clsx from 'clsx';

import checkBlue from '@/assets/icons/check-blue.svg';
import checkWhite from '@/assets/icons/check-white.svg';

import { Icon } from './Icon';

// Two checkbox looks from the Figma library, visual only (the row owns the click):
// - `style="soft"`: "Checkbox" (2362:28681), 18.45px white box, light-blue border, blue check ("What goes out");
//   unchecked it has a #c9cbd0 border ("Don't show this again" in the rerun confirm).
// - `style="solid"`: the 16px box in "Tool row" (2362:28952): filled accent with a white check when on,
//   line-grey outline when off.
export function Checkbox({
  checked = true,
  style = 'soft',
  className,
}: {
  checked?: boolean;
  style?: 'soft' | 'solid';
  className?: string;
}) {
  if (style === 'soft')
    return (
      <span
        aria-hidden
        className={clsx(
          'flex size-[18.446px] shrink-0 items-center justify-center rounded-[4.612px] border-[0.922px] bg-white',
          checked ? 'border-accent-line' : 'border-[#c9cbd0]',
          className
        )}
      >
        {checked && <Icon src={checkBlue} size={7.545} />}
      </span>
    );
  return (
    <span
      aria-hidden
      className={clsx(
        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
        checked ? 'border-accent bg-accent' : 'border-line-2',
        className
      )}
    >
      {checked && <Icon src={checkWhite} size={7.545} />}
    </span>
  );
}
