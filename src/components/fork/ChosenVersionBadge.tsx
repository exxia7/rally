import checkBadge from '@/assets/icons/check-badge.svg';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

// Not in Figma (design/non-figma-ui.md): marks the branch you chose with "Use this version", over its Ready to post
// card on the map. The Approved badge's look (green Badge + check), so it reads as "this is what goes out".
export function ChosenVersionBadge({ className }: { className?: string }) {
  return (
    <Badge
      tone="green"
      icon={<Icon src={checkBadge} size={10} />}
      className={className}
    >
      Chosen version
    </Badge>
  );
}
