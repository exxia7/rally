import { z } from 'zod';

export const stepSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
  name: z.string().min(1).max(80),
  role: z.enum([
    'Planner',
    'Scout',
    'Insights',
    'Strategist',
    'Writer',
    'Designer',
    'Community',
    'Publisher',
  ]),
  instruction: z.string().min(1).max(4000),
  dependencies: z.array(z.string()).max(8),
  deliverable: z.boolean(),
  model: z.enum(['haiku', 'opus']).optional(),
});
export const planSchema = z.object({
  title: z.string().min(1).max(100),
  steps: z.array(stepSchema).min(1).max(8),
});
export const plannerSchema = z.object({
  message: z.string(),
  plan: planSchema.nullable(),
});
export const resultSchema = z.object({
  title: z.string(),
  content: z.string(),
  decision: z.string(),
  question: z.string().nullable(),
});
export type Step = z.infer<typeof stepSchema>;
export type Plan = z.infer<typeof planSchema>;
export type PlannerResult = z.infer<typeof plannerSchema>;
export type StepResult = z.infer<typeof resultSchema>;
export type Attachment = { name: string; text: string };
export type Message = { id: string; role: 'user' | 'assistant'; text: string };
export type Attempt = {
  id: string;
  stepId: string;
  status: 'queued' | 'running' | 'done' | 'needs_input' | 'failed';
  title?: string;
  content?: string;
  decision?: string;
  question?: string;
  answer?: string;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
  cost: number;
  approval: 'waiting' | 'approved' | 'declined';
  version: number;
};
export type Branch = {
  id: string;
  name: string;
  parent?: string;
  from?: string;
  note: string;
  status:
    | 'ready'
    | 'running'
    | 'paused'
    | 'needs_input'
    | 'review'
    | 'done'
    | 'failed'
    | 'cancelled';
  attempts: Attempt[];
  history: Attempt[];
};
export type Workflow = {
  id: string;
  title: string;
  brief: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  messages: Message[];
  attachments: Attachment[];
  plan: Plan | null;
  planning: boolean;
  error?: string;
  cost: number;
  branches: Branch[];
  selectedBranch?: string;
  events: { id: string; at: number; text: string }[];
};
export function validatePlan(input: unknown): Plan {
  const plan = planSchema.parse(input);
  const ids = new Set(plan.steps.map((s) => s.id));
  if (ids.size !== plan.steps.length)
    throw new Error('Step IDs must be unique.');
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id))
      throw new Error('The plan contains a dependency cycle.');
    if (visited.has(id)) return;
    if (!ids.has(id)) throw new Error(`Unknown dependency: ${id}`);
    visiting.add(id);
    plan.steps.find((s) => s.id === id)!.dependencies.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  };
  ids.forEach(visit);
  if (!plan.steps.some((s) => s.deliverable))
    throw new Error('The plan needs at least one deliverable.');
  return plan;
}
export function affectedSteps(plan: Plan, from: string): Set<string> {
  if (!plan.steps.some((s) => s.id === from)) throw new Error('Unknown step.');
  const affected = new Set([from]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of plan.steps)
      if (
        !affected.has(step.id) &&
        step.dependencies.some((d) => affected.has(d))
      ) {
        affected.add(step.id);
        changed = true;
      }
  }
  return affected;
}
