import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import closeGray from '@/assets/icons/close-gray.svg';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { BriefComposer } from '@/components/panels/ChatComposer';
import { AppShell } from '@/components/shell/AppShell';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Icon } from '@/components/ui/Icon';
import { screenPath } from '@/screens/registry';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['2.1', '2.1-attach'];

const STARTERS: { label: string; brief: string }[] = [
  {
    label: 'AI coach launch',
    brief:
      'Launch campaign for our new AI Coach feature, to our 2,800 waitlist signups on Mar 12',
  },
  {
    label: 'Budgeting app launch',
    brief: 'Launch our budgeting app to young professionals next month',
  },
  {
    label: 'Pricing update',
    brief: 'Announce our new pricing to existing customers in two weeks',
  },
];

const LINK_LABEL = { link: 'Link', skill: 'Skill · Brand voice' } as const;

// Figma 2.1 "Planning · empty" (2362:23498) and 2.1-attach "· attach menu open" (2362:27498): "New workflow" from
// Home. Write the launch brief (or start from a chip) and Send to meet the Planner (2.2). The attach button opens
// the attach menu: Upload files opens the file picker; links and skills are added as attachments.
export default function PlanningEmptyScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [brief, setBrief] = useState('');
  const [attachOpen, setAttachOpen] = useState(id === '2.1-attach');
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const attach = (kind: 'upload' | 'link' | 'skill') => {
    if (kind === 'upload') fileInput.current?.click();
    else setAttachments((a) => [...a, LINK_LABEL[kind]]);
  };

  return (
    <AppShell sidebar="none">
      <WorkflowTopBar
        title="New workflow"
        hideTitleMenu
        view="planning"
        onViewChange={(v) => v === 'flowchart' && navigate(screenPath('3.1'))}
      />
      <div className="flex min-h-px w-full flex-1 flex-col items-center overflow-y-auto bg-white">
        <div className="flex min-h-full w-[620px] max-w-full flex-col pt-10 max-md:px-4 max-md:pt-6">
          <div className="flex w-full flex-1 flex-col items-center justify-center pb-[120px] max-md:pb-10">
            <h1 className="text-center text-[30px] leading-9 font-semibold tracking-[-0.3px] text-ink md:whitespace-nowrap max-md:text-[24px] max-md:leading-8">
              What are you launching?
            </h1>
            <div className="flex flex-col items-start pt-6 max-md:pt-4">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {STARTERS.map((s) => (
                  <ChoiceChip
                    key={s.label}
                    selected={brief === s.brief}
                    onClick={() => setBrief(s.brief)}
                  >
                    {s.label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            <div className="flex w-full flex-col items-start pt-3">
              <BriefComposer
                value={brief}
                onValueChange={setBrief}
                onSend={() => navigate(screenPath('2.2'))}
                attachOpen={attachOpen}
                onAttachOpenChange={setAttachOpen}
                onAttach={attach}
              />
              <input
                ref={fileInput}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const names = [...(e.target.files ?? [])].map((f) => f.name);
                  setAttachments((a) => [...a, ...names]);
                  e.target.value = '';
                }}
              />
              {attachments.length > 0 && (
                <div className="flex w-full flex-wrap gap-1.5 pt-2">
                  {attachments.map((a, i) => (
                    <span
                      key={`${a}-${i}`}
                      className="flex h-6 items-center gap-1 rounded-[6px] bg-chip pr-1 pl-2 text-[12px] leading-4 font-medium text-ink-2"
                    >
                      {a}
                      <button
                        type="button"
                        aria-label={`Remove ${a}`}
                        onClick={() =>
                          setAttachments((all) => all.filter((_, j) => j !== i))
                        }
                        className="flex rounded-[4px] hover:bg-hover"
                      >
                        <Icon src={closeGray} size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex w-full flex-col items-start overflow-clip pt-4">
              <p className="w-full text-center text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                Next, you&apos;ll see your team on a map. Nothing runs until you
                press Start launch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
