import { useState, type ReactNode } from 'react';

import { MapCanvas } from '@/components/map/MapCanvas';
import { OutputsCard, type OutputItem } from '@/components/panels/OutputsCard';
import { useMediaQuery } from '@/lib/useMediaQuery';

import {
  PlanMap,
  type PlanEdge,
  type PlanGate,
  type PlanLayout,
  type PlanNode,
  type PlanOverlay,
} from './PlanMap';
import { PlanLegend } from './PlanMapParts';

// The planning canvas of the 2.x frames ("ZoomStage", e.g. 2362:23662): the plan map on the pannable canvas, with
// the kind legend and zoom controls pinned bottom-left and "What goes out" bottom-right, 16px in. At 1440×900
// with the side panel open the stage is 954×830, exactly the Figma canvas. Under 1280px "What goes out" folds
// into its header (above the zoom controls on phones), so it doesn't cover the map or a popover opened on it.
export function PlanCanvas({
  layout,
  nodes = layout.nodes,
  overlays,
  outputs,
  outputsKey,
  onOutputsChange,
  zoomLabelBase = 70,
  stageWidth = 954,
  stageHeight = 830,
  onNodeClick,
  onSettingClick,
  onGateClick,
  onAddStep,
  addStepOn,
  focus,
  children,
}: {
  layout: PlanLayout;
  /** The layout's nodes with per-frame overrides (see `planNodes`). */
  nodes?: PlanNode[];
  overlays?: PlanOverlay[];
  outputs: OutputItem[];
  /** Change it to reset the outputs card to `outputs` (it keeps its own add/remove state). */
  outputsKey?: string;
  onOutputsChange?: (items: OutputItem[]) => void;
  zoomLabelBase?: number;
  stageWidth?: number;
  stageHeight?: number;
  onNodeClick?: (node: PlanNode) => void;
  onSettingClick?: (node: PlanNode, label: string) => void;
  onGateClick?: (gate: PlanGate) => void;
  /** Shows a "+" on hovered connectors (see PlanMap). */
  onAddStep?: (edge: PlanEdge, at: { x: number; y: number }) => void;
  addStepOn?: string;
  focus?: { x: number; y: number };
  /** Extra canvas-pinned overlays. */
  children?: ReactNode;
}) {
  const xl = useMediaQuery('(min-width: 1280px)');
  const [outputsOpen, setOutputsOpen] = useState(false);
  return (
    <MapCanvas
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      zoomLabelBase={zoomLabelBase}
      zoomPosition="left"
      focus={focus}
      // Phones: the plan cards are drawn at 0.85 with 9.9px text; open at 1.2× instead of the run map's 0.8×,
      // so a card's text reads at about 10–12px.
      phoneZoom={1.2}
      overlay={
        <>
          <PlanLegend className="absolute bottom-[70px] left-5 max-md:hidden" />
          {/* Docked open at ≥1280px as drawn; below that it folds into its header (open → it grows upward). Phones
              lift it above the zoom controls. */}
          <OutputsCard
            key={outputsKey}
            initial={outputs}
            onChange={onOutputsChange}
            open={xl || outputsOpen}
            onOpenChange={xl ? undefined : setOutputsOpen}
            className="absolute right-4 bottom-4 max-h-[calc(100%-32px)] max-md:bottom-[60px] max-md:max-h-[calc(100%-76px)]"
          />
          {children}
        </>
      }
    >
      <PlanMap
        {...layout}
        nodes={nodes}
        overlays={overlays}
        width={stageWidth}
        height={stageHeight}
        onNodeClick={onNodeClick}
        onSettingClick={onSettingClick}
        onGateClick={onGateClick}
        onAddStep={onAddStep}
        addStepOn={addStepOn}
      />
    </MapCanvas>
  );
}
