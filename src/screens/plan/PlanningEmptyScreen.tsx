import { useLayoutEffect, useRef, useState } from 'react';

import spark from '@/assets/icons/rally-spark.svg';
import upload from '@/assets/icons/upload.svg';
import link from '@/assets/icons/link.svg';
import plus from '@/assets/icons/plus-dark.svg';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { ATTACH_LABEL, AttachmentChips } from '@/components/panels/AttachMenu';
import { AppShell } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { attachFiles, sampleMode, backendError } from '@/state/backend';
import { useGo } from '@/state/nav';
import { runFrame } from '@/state/runView';
import { dispatch, useWorkflow } from '@/state/store';
import './planning-empty.css';

// eslint-disable-next-line react-refresh/only-export-components -- Screen registry metadata.
export const screenId = ['2.1', '2.1-attach'];

const STARTERS = [
  'Launch our AI Coach to the waitlist on Mar 12',
  'Product Hunt launch for our new budgeting app',
  'Announce our pricing change to customers',
];

function HandoffPreview() {
  return (
    <svg className="brief-handoff" width="148" height="64" viewBox="0 0 148 64" fill="none" aria-hidden="true">
      <path d="M28 32C40 32 36 14 49 14M28 32C40 32 36 50 49 50M79 14C92 14 90 32 99 32M79 50C92 50 90 32 99 32M123 32H129" stroke="#45474D" strokeWidth="1.3" />
      <rect x="1" y="24" width="28" height="16" rx="5" fill="#FDE8F0" stroke="#E9518C" />
      <rect x="49" y="6" width="30" height="16" rx="5" fill="#EBEEFF" stroke="#557BFF" />
      <rect x="49" y="42" width="30" height="16" rx="5" fill="#EBEEFF" stroke="#557BFF" />
      <rect x="99" y="24" width="24" height="16" rx="5" fill="#FFF4E0" stroke="#E9A138" />
      <rect x="129" y="24" width="18" height="16" rx="5" fill="#E6F5EA" stroke="#31AC65" />
    </svg>
  );
}

// Figma 62:6425: the brief, starter prompts, references, and handoff explanation.
export default function PlanningEmptyScreen() {
  const go = useGo();
  const wf = useWorkflow();
  const [brief, setBrief] = useState(wf.brief.what);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [nudge, setNudge] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const briefInput = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const input = briefInput.current;
    if (!input) return;
    const resize = () => {
      input.style.height = 'auto';
      input.style.height = `${input.scrollHeight}px`;
    };
    resize();
    let width = input.clientWidth;
    const observer = new ResizeObserver(() => {
      if (input.clientWidth === width) return;
      width = input.clientWidth;
      resize();
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [brief]);

  const addFiles = async (files: File[]) => {
    const names = sampleMode ? files.map((file) => file.name) : await attachFiles(files);
    setAttachments((items) => [...items, ...names]);
  };
  const attach = (kind: 'upload' | 'link' | 'skill') => {
    if (kind === 'upload') fileInput.current?.click();
    else if (!sampleMode) backendError('Attach a text file or include the content in your brief.');
    else setAttachments((items) => [...items, ATTACH_LABEL[kind]]);
  };
  const send = () => {
    const text = brief.trim();
    if (!text) {
      setNudge(true);
      briefInput.current?.focus();
      return;
    }
    dispatch({ type: 'brief/send', text, attachments });
    go('2.2');
  };

  return (
    <AppShell>
      <WorkflowTopBar
        title={wf.title}
        hideTitleMenu={wf.isNew}
        view="planning"
        onBack={() => go('1.1')}
        onViewChange={(view) => view === 'flowchart' && go(runFrame(wf), { returnHere: true })}
      />
      <div className="brief-page">
        <ol className="brief-steps" aria-label="Workflow setup">
          {['Describe your launch', 'Shape the team', 'Start the run'].map((label, index) => (
            <li key={label} aria-current={index === 0 ? 'step' : undefined}>
              <span>{index + 1}</span>{label}
            </li>
          ))}
        </ol>
        <section className="brief-content" aria-labelledby="brief-title">
          <div className="brief-planner-icon">
            <Icon src={spark} size={32} />
            <span aria-hidden="true">···</span>
          </div>
          <h1 id="brief-title">What are you launching?</h1>
          <p className="brief-subtitle">Tell me what it is, who it&apos;s for and when.</p>
          <div className="brief-input">
            <textarea
              ref={briefInput}
              aria-label="Launch brief"
              rows={1}
              value={brief}
              placeholder={nudge ? 'Write your launch brief first, or pick a starter below.' : 'What are you launching, who is it for, and when?'}
              onChange={(event) => { setBrief(event.target.value); setNudge(false); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
              }}
            />
            <Button variant="primary" onClick={send}>Send</Button>
          </div>
          <div className="brief-starters">
            {STARTERS.map((starter) => (
              <button key={starter} type="button" aria-pressed={brief === starter} onClick={() => { setBrief(starter); setNudge(false); briefInput.current?.focus(); }}>
                {starter}
              </button>
            ))}
          </div>
          <div
            className={`brief-references${dragging ? ' brief-references-dragging' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles([...event.dataTransfer.files]); }}
          >
            <h2>Drop files, links or skills</h2>
            <p>Brand guide, logo, screenshots, inspiration, past posts, and skills (reusable how-tos like your brand voice). Helpers use them as they work.</p>
            <div className="brief-reference-actions">
              <Button leading={<Icon src={upload} />} onClick={() => attach('upload')}>Upload files</Button>
              <Button leading={<Icon src={link} />} onClick={() => attach('link')}>Paste a link</Button>
              <Button leading={<Icon src={plus} />} onClick={() => attach('skill')}>Add a skill</Button>
            </div>
            <AttachmentChips items={attachments} onRemove={(index) => setAttachments((items) => items.filter((_, i) => i !== index))} />
          </div>
          <input ref={fileInput} type="file" multiple className="hidden" onChange={(event) => { void addFiles([...(event.target.files ?? [])]); event.target.value = ''; }} />
          <div className="brief-next">
            <HandoffPreview />
            <div>
              <h2>What happens next</h2>
              <p>I&apos;ll turn your description into a map of AI helpers: who does what and who hands work to whom. You can change anything, and nothing runs until you press Start.</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
