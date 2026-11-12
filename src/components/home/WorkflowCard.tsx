import walrus from '@/assets/art/character-walrus.svg';
import miniMap from '@/assets/art/illustration-mini-map.svg';
import previewHiring from '@/assets/art/workflow-preview-hiring.svg';
import previewPricing from '@/assets/art/workflow-preview-pricing.svg';
import previewLaunch from '@/assets/art/workflow-preview-product-launch.svg';
import { Badge } from '@/components/ui/Badge';

/** A workflow's own plan in miniature (planView.planMiniMap): box centres and lines in the 290×108 preview. */
export type MiniMap = {
  boxWidth: number;
  boxHeight: number;
  boxes: { id: string; x: number; y: number }[];
  lines: { x1: number; y1: number; x2: number; y2: number }[];
};

export type WorkflowCardData = {
  title: string;
  status: 'Running' | 'Draft' | 'Done';
  meta: string;
  preview: 'ai-coach' | 'pricing' | 'product-launch' | 'hiring';
  needsYou?: boolean;
  /** Draws this plan instead of the preview art (the AI Coach art is its hand-raise, so only while it needs you). */
  plan?: MiniMap;
  to: string;
};

const PREVIEWS = {
  pricing: previewPricing,
  'product-launch': previewLaunch,
  hiring: previewHiring,
} as const;

const node =
  'absolute -translate-x-1/2 -translate-y-1/2 h-[18px] w-[44px] rounded-[6px] border bg-white';

// The AI Coach preview is the "Illustration / Mini map" with node boxes and the Walrus raising its hand.
function AiCoachPreview() {
  return (
    <>
      <img
        src={miniMap}
        alt=""
        className="absolute top-1/2 left-[calc(50%+2px)] h-[108px] w-[290px] -translate-x-1/2 -translate-y-1/2"
      />
      <div
        className={`${node} top-1/2 left-[calc(50%-103.61px)] border-line`}
      />
      <div
        className={`${node} top-[calc(50%-24px)] left-[calc(50%-25.31px)] border-problem`}
      />
      <div
        className={`${node} top-[calc(50%+24px)] left-[calc(50%-25.31px)] border-line`}
      />
      <div className={`${node} top-1/2 left-[calc(50%+50.09px)] border-line`} />
      <div
        className={`${node} top-1/2 left-[calc(50%+108.09px)] border-line`}
      />
      <div className="absolute top-[calc(50%-35.5px)] left-[calc(50%+2.3px)] flex size-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        <img src={walrus} alt="" className="h-[15.016px] w-[17.99px]" />
        <div className="absolute top-[-4px] left-[9px] flex size-[15px] items-center justify-center overflow-clip rounded-full border border-white bg-problem shadow-[0px_0px_0px_7.097px_rgba(236,59,59,0.1)]">
          <p className="text-[9px] leading-[9px] font-bold tracking-[-0.08px] text-white">
            !
          </p>
        </div>
      </div>
    </>
  );
}

// Not in Figma: the "Mini map" illustration's look (white boxes, 1.18px curves) drawn from a workflow's own plan.
function MiniMapPreview({ plan }: { plan: MiniMap }) {
  const { boxWidth: w, boxHeight: h } = plan;
  return (
    <div className="absolute top-1/2 left-[calc(50%+2px)] h-[108px] w-[290px] -translate-x-1/2 -translate-y-1/2">
      <svg
        width={290}
        height={108}
        viewBox="0 0 290 108"
        fill="none"
        className="absolute inset-0"
      >
        {plan.lines.map((l, i) => {
          const m = (l.x1 + l.x2) / 2;
          return (
            <path
              key={i}
              d={`M${l.x1} ${l.y1}C${m} ${l.y1} ${m} ${l.y2} ${l.x2} ${l.y2}`}
              stroke="#141414"
              strokeWidth={1.17983}
            />
          );
        })}
      </svg>
      {plan.boxes.map((b) => (
        <div
          key={b.id}
          className="absolute rounded-[6px] border border-line bg-white"
          style={{ left: b.x - w / 2, top: b.y - h / 2, width: w, height: h }}
        />
      ))}
    </div>
  );
}

// Figma "Workflow card" (2362:30171): 128px preview flush to the edges, then 16/12 padded details.
export function WorkflowCard({
  title,
  status,
  meta,
  preview,
  plan,
  onClick,
}: WorkflowCardData & { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[312px] shrink-0 flex-col items-start edge overflow-clip rounded-card bg-white text-left shadow-card transition-colors hover:border-line-2"
    >
      <div className="relative h-[128px] w-full shrink-0 overflow-clip bg-canvas">
        {plan ? (
          <MiniMapPreview plan={plan} />
        ) : preview === 'ai-coach' ? (
          <AiCoachPreview />
        ) : (
          <img
            src={PREVIEWS[preview]}
            alt=""
            className="absolute top-1/2 left-[calc(50%+2px)] h-[108px] w-[290px] -translate-x-1/2 -translate-y-1/2"
          />
        )}
      </div>
      <div className="flex w-full shrink-0 flex-col items-start gap-1 edge-t px-4 py-3">
        <div className="flex h-5 w-full items-center justify-between gap-2">
          <p
            title={title}
            className="min-w-0 truncate text-[14px] leading-5 font-semibold tracking-[-0.08px] text-ink"
          >
            {title}
          </p>
          <Badge tone={status === 'Running' ? 'blue' : 'neutral'}>
            {status}
          </Badge>
        </div>
        <p className="w-full truncate text-[12px] leading-4 tracking-[-0.08px] text-muted">
          {meta}
        </p>
      </div>
    </button>
  );
}
