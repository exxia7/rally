import {
  type CheckLevel,
  CUSTOM,
  presetAdLimit,
  presetByName,
  presetCheck,
  workflowPermissions,
} from './permissions';
import { dispatch, useAppState } from './store';

/**
 * The active workflow's permissions and the writes every editor shares (2.7's Sandbox section, 2.8's card): picking
 * a preset takes its check level and ad limit; a check level the preset doesn't use makes the workflow Custom; the
 * ad limit can differ from the preset ("Changed here").
 */
export function useWorkflowPermissions() {
  const s = useAppState();
  const wf = s.workflows[s.activeId];
  const view = workflowPermissions(s, wf);
  return {
    ...view,
    presets: s.workspace.presets.map((p) => p.name),
    setPreset(name: string) {
      const p = presetByName(s, name);
      dispatch({
        type: 'permissions/set',
        patch: p
          ? {
              preset: p.name,
              checkLevel: presetCheck(p),
              adLimit: presetAdLimit(p),
            }
          : { preset: CUSTOM },
      });
    },
    setCheck(check: CheckLevel) {
      const p = presetByName(s, wf.permissions.preset);
      dispatch({
        type: 'permissions/set',
        patch: {
          checkLevel: check,
          preset: p && presetCheck(p) === check ? p.name : CUSTOM,
        },
      });
    },
    setAdLimit(adLimit: number) {
      dispatch({ type: 'permissions/set', patch: { adLimit } });
    },
  };
}
