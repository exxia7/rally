import { useState } from 'react';

import { SettingName } from '@/components/panels/SettingsCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/TextInput';

export type ConnectableTool = {
  name: string;
  connected: boolean;
  account?: string;
};

const WHAT: Record<string, string> = {
  LinkedIn:
    'Posts as your company page. Anything it posts still waits for your OK.',
  X: 'Posts and schedules from your account.',
  Discord: 'Posts in the channels you pick.',
  'Email (Resend)': 'Sends email from your domain.',
};

// Not in Figma: the "connect a tool" step (audit 3d, 3j). Built on Modal with 1.2's setting rows. With `tool` it opens
// straight on that tool's step ("Connect LinkedIn": the account and a Connect button); without, it lists the
// workspace's tools first. Connecting marks the tool connected in the workspace (the same flag 1.2, 2.8, the plan's
// cards and 5.1 read) and closes, so you're back where you were.
export function ConnectToolDialog({
  open,
  tools,
  tool: initial,
  onConnect,
  onClose,
}: {
  open: boolean;
  tools: ConnectableTool[];
  /** Open on this tool's step. */
  tool?: string;
  onConnect: (name: string, account: string) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | undefined>(initial);
  const [account, setAccount] = useState('Lumen');
  const tool = picked ?? initial;
  const close = () => {
    setPicked(undefined);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      label={tool ? `Connect ${tool}` : 'Connect a tool'}
    >
      <div className="flex w-full flex-col items-start gap-1.5">
        <p className="w-full text-[18px] leading-[26px] font-semibold text-ink">
          {tool ? `Connect ${tool}` : 'Connect a tool'}
        </p>
        <p className="w-full text-[13px] leading-[19px] text-ink-2">
          {tool
            ? (WHAT[tool] ??
              'Any helper in the workspace can use it once it’s connected.')
            : 'Connect once in the workspace, then any helper can use it.'}
        </p>
      </div>
      {tool ? (
        <label className="flex w-full flex-col items-start gap-1.5">
          <span className="text-[12px] leading-[15px] font-medium text-ink">
            Account
          </span>
          <TextInput
            className="w-full"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </label>
      ) : (
        <div className="flex w-full flex-col items-start">
          {tools.map((t, i) => (
            <div
              key={t.name}
              className={
                i < tools.length - 1
                  ? 'flex w-full items-center gap-3 border-b border-line py-2.5'
                  : 'flex w-full items-center gap-3 py-2.5'
              }
            >
              <SettingName
                name={t.name}
                description={
                  t.connected ? (t.account ?? 'Connected') : 'Not connected'
                }
              />
              {t.connected ? (
                <Badge tone="green">Connected</Badge>
              ) : (
                <Button size="sm" onClick={() => setPicked(t.name)}>
                  Connect
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex w-full items-center justify-end gap-2">
        <Button onClick={tool && !initial ? () => setPicked(undefined) : close}>
          {tool && !initial ? 'Back' : tool ? 'Cancel' : 'Done'}
        </Button>
        {tool && (
          <Button
            variant="primary"
            onClick={() => {
              onConnect(tool, account.trim() || 'Lumen');
              close();
            }}
          >
            Connect
          </Button>
        )}
      </div>
    </Modal>
  );
}
