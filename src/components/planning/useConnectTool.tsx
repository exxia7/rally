import { type ReactNode, useState } from 'react';

import { workspaceToolName } from '@/state/permissions';
import { dispatch, useAppState } from '@/state/store';

import { ConnectToolDialog } from './ConnectToolDialog';

/**
 * The connect step, wired to the workspace's tools: `[dialog, open]`. `open('LinkedIn', done)` opens straight on
 * LinkedIn; `open()` lists every tool. `done(name)` runs after a tool connects (e.g. give it to the helper whose
 * drawer opened the step). Render `dialog` anywhere on the screen.
 */
export function useConnectTool(): [
  ReactNode,
  (tool?: string, done?: (name: string) => void) => void,
] {
  const s = useAppState();
  const [state, setState] = useState<{
    tool?: string;
    done?: (name: string) => void;
  } | null>(null);
  const dialog = state && (
    <ConnectToolDialog
      key={state.tool ?? 'list'}
      open
      tools={s.workspace.tools}
      tool={state.tool && workspaceToolName(state.tool)}
      onConnect={(name, account) => {
        dispatch({ type: 'workspace/tool', name, connected: true, account });
        state.done?.(name);
      }}
      onClose={() => setState(null)}
    />
  );
  return [dialog, (tool, done) => setState({ tool, done })];
}
