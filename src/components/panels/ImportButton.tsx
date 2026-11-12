import plusWhite from '@/assets/icons/plus-white.svg';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

// The Sandbox's "Import" (plan 2.6 / 2.7 and run 3.3): a Primary Small button with a 16px plus, on the right of the
// side panel's tabs. Docked (≥1280px) it reads "+ Import"; under 1280px, where the panel's header also carries the ×
// and the run panel has three tabs, it is a 28px icon-only square (still named "Import"), so it never covers a tab.
export function ImportButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      variant="primary"
      size="sm"
      leading={<Icon src={plusWhite} size={16} />}
      onClick={onClick}
      aria-label="Import"
      title="Import"
      className="max-xl:w-7 max-xl:px-0"
    >
      <span className="max-xl:hidden">Import</span>
    </Button>
  );
}
