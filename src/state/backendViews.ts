import type {
  Workflow as RemoteWorkflow,
  Branch,
  Plan,
} from '../../shared/domain';
import type { Workflow } from './types';
import { newWorkflow } from './scenes';
import { helperCard, type Helper } from '@/screens/plan/aiCoachPlan';
import type { PlanLayout } from '@/components/planning/PlanMap';
import type { RunData } from '@/components/run/RunScreenLayout';
import type { MapNode } from '@/components/map/FlowMap';
import type { ForkNumber } from '@/components/map/forks';
import type { InspectorData } from '@/components/run/InspectorPanel';

export function remoteBranch(
  wf: Workflow,
  branch = 'original'
): Branch | undefined {
  const remote = wf.backend;
  return branch === 'original'
    ? remote?.branches[0]
    : remote?.branches[Number(branch.replace('fork-', ''))];
}
export function branchId(wf: Workflow, node: string) {
  return remoteBranch(
    wf,
    /-f(\d+)$/.test(node) ? `fork-${node.match(/-f(\d+)$/)![1]}` : 'original'
  )?.id;
}
export const baseStep = (node: string) => node.replace(/-f\d+$/, '');
export function projectWorkflow(
  remote: RemoteWorkflow,
  previous?: Workflow
): Workflow {
  const wf = previous ?? newWorkflow(remote.id);
  const plan = remote.plan;
  const helpers: Record<string, Helper> = Object.fromEntries(
    (plan?.steps ?? []).map((step) => [
      step.id,
      {
        name: step.name,
        agent: step.role,
        kind: step.deliverable ? 'output' : 'action',
        description:
          step.instruction.length > 140
            ? step.instruction.slice(0, 137) + '…'
            : step.instruction,
        instructions: step.instruction,
        model: step.model === 'opus' ? 'Opus' : 'Haiku',
        tokensK: 0,
        skills: [],
        files: remote.attachments.map((f) => f.name),
        getsFrom:
          step.dependencies
            .map((id) => plan!.steps.find((s) => s.id === id)?.name)
            .join(', ') || 'Your brief',
        passesTo:
          plan!.steps
            .filter((s) => s.dependencies.includes(step.id))
            .map((s) => s.name)
            .join(', ') || 'Your approval',
        passes: step.deliverable ? 'Draft for approval' : 'Completed work',
        checks: 'Your approval before export',
      },
    ])
  );
  const selected = remote.branches.findIndex(
    (b) => b.id === remote.selectedBranch
  );
  const active =
    remote.branches.find((b) =>
      ['running', 'paused', 'needs_input', 'failed', 'review'].includes(
        b.status
      )
    ) ?? remote.branches[Math.max(0, selected)];
  const phase = !active
    ? 'notStarted'
    : active.status === 'done'
      ? 'launched'
      : active.status === 'review'
        ? 'awaitingApproval'
        : active.status === 'needs_input'
          ? 'needsYou'
          : 'running';
  const approvals = (b?: Branch) =>
    Object.fromEntries(
      (b?.attempts ?? []).map((a) => [
        a.stepId,
        a.approval === 'declined' ? ('wont-post' as const) : a.approval,
      ])
    );
  return {
    ...wf,
    backend: remote,
    id: remote.id,
    title: remote.title,
    isNew: false,
    asDrawn: undefined,
    card: undefined,
    brief: { what: remote.brief, summary: remote.brief, when: '', who: '' },
    attachments: remote.attachments.map((a) => a.name),
    planStage: previous?.planStage === 'team' && plan ? 'team' : 'chat',
    briefChat: remote.messages.map((m, i) => ({
      id: m.id,
      from: m.role,
      text: m.text,
      ...(plan && i === remote.messages.length - 1 && m.role === 'assistant'
        ? { action: 'team' as const }
        : {}),
    })),
    planChat: remote.messages.map((m) => ({
      id: m.id,
      from: m.role,
      text: m.text,
    })),
    helpers,
    helperOrder: plan?.steps.map((s) => s.id) ?? [],
    removed: [],
    planSteps: [],
    outputs:
      plan?.steps
        .filter((s) => s.deliverable)
        .map((s) => ({
          id: s.id,
          type: 'post' as const,
          label: s.name,
          owner: s.id,
        })) ?? [],
    resources: {
      assets: remote.attachments.map((a) => ({
        name: a.name,
        usedBy: Object.keys(helpers),
        source: a.text,
      })),
      skills: [],
      tools: [],
      facts: {
        date: '',
        time: '',
        price: '',
        audience: '',
        claim: '',
        budget: '',
        signups: '',
      },
    },
    run: {
      phase,
      beat:
        phase === 'notStarted'
          ? 'idle'
          : phase === 'launched'
            ? 'launched'
            : phase === 'awaitingApproval'
              ? 'approval'
              : 'running',
      paused: active?.status === 'paused',
      hold: true,
      steps: {},
      startedAt: remote.createdAt,
    },
    status:
      phase === 'notStarted'
        ? 'draft'
        : phase === 'launched'
          ? 'done'
          : phase === 'needsYou' || phase === 'awaitingApproval'
            ? 'needsYou'
            : 'running',
    approvals: approvals(remote.branches[0]),
    approvalText: undefined,
    handRaises: [],
    decisions: [],
    reruns: [],
    forks: remote.branches
      .slice(1)
      .map((b, i) => ({
        id: `fork-${i + 1}`,
        n: ((i % 3) + 1) as ForkNumber,
        parent:
          remote.branches[0]?.id === b.parent
            ? 'original'
            : `fork-${remote.branches.findIndex((p) => p.id === b.parent)}`,
        from: b.from ?? plan?.steps[0]?.id ?? '',
        name: b.name,
        brief: b.note,
        approvals: approvals(b),
        copy: Object.fromEntries(
          b.attempts.map((a) => [a.stepId, a.content ?? ''])
        ),
        phase:
          b.status === 'done'
            ? 'launched'
            : b.status === 'review'
              ? 'awaitingApproval'
              : 'running',
      })),
    chosenVersion: selected > 0 ? `fork-${selected}` : undefined,
  };
}
function positions(plan: Plan, dx: number, dy: number) {
  const levels = new Map<string, number>();
  function level(id: string): number {
    if (levels.has(id)) return levels.get(id)!;
    const deps = plan.steps.find((s) => s.id === id)!.dependencies;
    const n = deps.length ? Math.max(...deps.map(level)) + 1 : 0;
    levels.set(id, n);
    return n;
  }
  const rows = new Map<number, number>();
  const map = new Map(
    plan.steps.map((s) => {
      const col = level(s.id),
        row = rows.get(col) ?? 0;
      rows.set(col, row + 1);
      return [s.id, { x: col * dx, y: row * dy }];
    })
  );
  return {
    map,
    width: (Math.max(0, ...levels.values()) + 1) * dx,
    height: Math.max(1, ...rows.values()) * dy,
  };
}
export function backendPlanLayout(wf: Workflow): PlanLayout {
  const plan = wf.backend!.plan;
  if (!plan) return { scale: 0.85, nodes: [], edges: [] };
  const pos = positions(plan, 235, 310);
  for (const p of pos.map.values()) {
    p.x += 70;
    p.y += 145;
  }
  return {
    scale: 0.85,
    nodes: plan.steps.map((s) => ({
      id: s.id,
      ...pos.map.get(s.id)!,
      ...helperCard(wf.helpers[s.id]),
    })),
    edges: plan.steps.flatMap((s) =>
      s.dependencies.map((from) => ({ from, to: s.id }))
    ),
    stages: [],
  };
}
export function backendApprovalItems(wf: Workflow, branch = 'original') {
  const b = remoteBranch(wf, branch);
  return (wf.backend!.plan?.steps ?? [])
    .filter((s) => s.deliverable)
    .map((s) => {
      const a = b?.attempts.find((a) => a.stepId === s.id);
      return {
        id: s.id,
        owner: s.id,
        title: a?.title || s.name,
        when: `Version ${a?.version ?? 1}`,
        body: a?.content || 'This output is not ready yet.',
        channelNote: 'Local artifact · no external post',
        minH: '',
        summary: {
          label: s.name,
          status:
            a?.approval === 'declined' ? 'Skipped' : 'Approved for export',
        },
      };
    });
}
// Cards show a short plain-text excerpt. Keep the original Markdown in the
// inspector and exported artifact, including its links and formatting.
function outputExcerpt(text: string): string {
  return text
    .replace(/^```[^\n]*\n?/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/([*_])([^\n]+?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n[ \t]*\n+/g, '\n')
    .trim();
}

export function backendRunData(wf: Workflow): RunData {
  const remote = wf.backend!;
  const plan = remote.plan;
  if (!plan)
    return {
      map: { x: 80, y: 150, width: 1000, height: 400, nodes: [], edges: [] },
      completed: [],
      tasks: [],
      sandbox: [],
      decisions: [],
      chat: [],
    };
  const pos = positions(plan, 260, 240);
  const nodes: MapNode[] = [],
    edges: RunData['map']['edges'] = [],
    inspectors: Record<string, InspectorData> = {};
  const branches = remote.branches.length
    ? remote.branches
    : [
        {
          id: '',
          name: 'Original',
          note: '',
          status: 'ready',
          attempts: [],
          history: [],
        } as Branch,
      ];
  branches.forEach((b, i) => {
    const suffix = i ? `-f${i}` : '',
      fork = i ? ((((i - 1) % 3) + 1) as ForkNumber) : undefined;
    for (const step of plan.steps) {
      const a = b.attempts.find((a) => a.stepId === step.id),
        point = pos.map.get(step.id)!;
      const nodeId = step.id + suffix;
      const status =
        a?.status === 'done'
          ? 'Done'
          : a?.status === 'running'
            ? 'Working'
            : a?.status === 'needs_input'
              ? 'Needs your answer'
              : a?.status === 'failed'
                ? 'Retry needed'
                : 'Waiting';
      nodes.push({
        id: nodeId,
        kind: step.deliverable ? 'output' : 'action',
        title: step.name,
        agent: step.name,
        x: point.x,
        y: point.y + i * (pos.height + 80),
        width: 181.5,
        fork,
        state:
          a?.status === 'running'
            ? 'working'
            : a?.status === 'needs_input' || a?.status === 'failed'
              ? 'needs-you'
              : a?.status === 'done'
                ? 'done'
                : 'waiting',
        avatar: {
          agent: step.role,
          state:
            a?.status === 'running'
              ? 'working'
              : a?.status === 'needs_input'
                ? 'hand-raised'
                : a?.status === 'done'
                  ? 'done'
                  : 'waiting',
        },
        preview: {
          label: step.deliverable ? 'Draft' : 'Task',
          text: outputExcerpt(a?.content || a?.question || step.instruction),
          compact: true,
        },
        status: {
          text: status,
          tone:
            a?.status === 'running'
              ? 'live'
              : a?.status === 'needs_input' || a?.status === 'failed'
                ? 'problem'
                : 'muted',
        },
      });
      edges.push(
        ...step.dependencies.map((from) => ({
          from: from + suffix,
          to: nodeId,
          fork,
          status:
            b.attempts.find((a) => a.stepId === from)?.status === 'done'
              ? ('passed' as const)
              : ('pending' as const),
        }))
      );
      inspectors[nodeId] = {
        eyebrow: step.deliverable ? 'Output' : 'Action',
        title: step.name,
        meta: `${step.role} · ${status}`,
        branch: b.name,
        branchFork: fork,
        footer: false,
        preview: a?.content
          ? { eyebrow: a.title, quote: a.content, action: null }
          : undefined,
        fields: [
          { label: 'Instructions', value: step.instruction },
          ...(a?.decision ? [{ label: 'Decision', value: a.decision }] : []),
          ...(a?.error ? [{ label: 'Error', value: a.error }] : []),
          ...b.history
            .filter((h) => h.stepId === step.id && h.content)
            .map((h) => ({
              label: `Previous version ${h.version}`,
              value: h.content!,
            })),
        ],
        fork: {
          description: 'Try another direction and keep this version.',
          disabled: ['running', 'paused'].includes(b.status),
        },
        rerun: {
          description: 'Redo this step and its dependent steps.',
          disabled: ['running', 'paused'].includes(b.status),
        },
      };
    }
    const readyId = 'ready' + suffix;
    nodes.push({
      id: readyId,
      kind: 'action',
      title: 'Ready for approval',
      x: pos.width,
      y: i * (pos.height + 80),
      width: 181.5,
      fork,
      state:
        b.status === 'done'
          ? 'done'
          : b.status === 'review'
            ? 'needs-you'
            : 'waiting',
      status: {
        text:
          b.status === 'done'
            ? 'Review complete'
            : b.status === 'review'
              ? 'Waits for your OK'
              : 'Waits for the team',
      },
    });
    edges.push(
      ...plan.steps
        .filter((s) => s.deliverable)
        .map((s) => ({ from: s.id + suffix, to: readyId, fork }))
    );
  });
  const active = remote.branches.find((b) => b.status === 'needs_input');
  const question = active?.attempts.find((a) => a.status === 'needs_input');
  const selected =
    remote.branches.find((b) => b.id === remote.selectedBranch) ??
    remote.branches[0];
  return {
    map: {
      x: 80,
      y: 130,
      width: pos.width + 230,
      height: (pos.height + 80) * branches.length,
      nodes,
      edges,
    },
    inspectors,
    completed: [
      ...new Set(
        plan.steps
          .filter(
            (s) =>
              selected?.attempts.find((a) => a.stepId === s.id)?.status ===
              'done'
          )
          .map((s) => s.role)
      ),
    ],
    tasks: plan.steps.map((s) => {
      const a = selected?.attempts.find((a) => a.stepId === s.id);
      return {
        id: s.id,
        title: s.name,
        state:
          a?.status === 'done'
            ? 'done'
            : a?.status === 'running'
              ? 'running'
              : a?.status === 'needs_input'
                ? 'approval'
                : 'waiting',
      };
    }),
    sandbox: [],
    chat: remote.messages.map((m) => ({ from: m.role, text: m.text })),
    decisions: (selected?.attempts ?? [])
      .filter((a) => a.decision)
      .map((a) => ({
        id: a.stepId,
        who: plan.steps.find((s) => s.id === a.stepId)!.name,
        agent: plan.steps.find((s) => s.id === a.stepId)!.role,
        time: 'This run',
        by: 'helper',
        title: a.title || a.stepId,
        basis: a.decision!,
      })),
    handRaise: question
      ? {
          eyebrow: `${plan.steps.find((s) => s.id === question.stepId)?.name} raised its hand`,
          title: 'Your input is needed',
          meta: 'Your answer becomes input for this step.',
          steps: [
            {
              label: 'Your answer',
              problem: {
                kind: 'Question',
                context: '',
                title: question.question!,
                detail: 'Add your answer below to continue.',
              },
              options: [],
            },
          ],
          confirmLabel: 'Answer and continue',
        }
      : undefined,
  };
}
