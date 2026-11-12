import type { ReactNode } from 'react';

import { MapCanvas } from '@/components/map/MapCanvas';
import type { OutputItem } from '@/components/map/OutputRow';
import { TasksDropdown } from '@/components/run/TasksDropdown';
import { useAppState } from '@/state/store';

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
// the kind legend and zoom controls pinned bottom-left and the Tasks list (planned steps and what goes out; it
// replaces Figma's "What goes out" card, as on the run) top-left, 16px in. At 1440×900 with the side panel open the
// stage is 954×830, exactly the Figma canvas.
// Clear of the legend (bottom 70px) and the zoom controls under it; phones hide the legend.
const PLAN_FIT = 'max-h-[calc(100%-128px)] max-md:max-h-[calc(100%-76px)]';

export function PlanCanvas({
  layout,
  nodes = layout.nodes,
  overlays,
  outputs,
  onOutputsChange,
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
  /** What goes out (the store's outputs); `onOutputsChange` gets the list after a remove or an add. */
  outputs: OutputItem[];
  onOutputsChange?: (items: OutputItem[]) => void;
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
  const { activeId, workflows } = useAppState();
  if (workflows[activeId]?.backend) { stageWidth = Math.max(stageWidth, ...nodes.map(n => n.x + 250)); stageHeight = Math.max(stageHeight, ...nodes.map(n => n.y + 350)); }
  // Flow order: left to right, then top to bottom.
  const planned = [...nodes].sort((a, b) => a.x - b.x || a.y - b.y);
  return (
    <MapCanvas
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      // The label is the cards' real scale: the full map draws them at 0.85, the drawer's compact map at 0.59.
      contentScale={layout.scale}
      // One remembered view per workflow and layout (full, compact, wide).
      viewKey={`plan:${activeId}:${layout.scale}`}
      zoomPosition="left"
      focus={focus}
      overlay={
        <>
          <PlanLegend className="absolute bottom-[70px] left-5 max-md:hidden" />
          {/* The Tasks list (the run's, before the run): the planned steps in flow order, then what goes out. */}
          <TasksDropdown
            tasks={planned.map((n) => ({
              id: n.id,
              title: n.name,
              state: 'planned',
            }))}
            label={`${planned.length} planned`}
            progress={null}
            onSelectTask={(t) => {
              const node = planned.find((n) => n.id === t.id);
              if (node) onNodeClick?.(node);
            }}
            outputs={outputs}
            onOutputsChange={onOutputsChange}
            fitClassName={PLAN_FIT}
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
