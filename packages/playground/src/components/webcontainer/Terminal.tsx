import React from 'react';
import { Terminal as TerminalClass } from '@xterm/xterm';
import type { WebContainer } from '@webcontainer/api';
import { useContainerStatus } from './containerState';

type TerminalProps = {
  webContainerRef?: React.RefObject<WebContainer>;
};
export default function Terminal({ webContainerRef }: TerminalProps) {
  const terminalRef = React.useRef<HTMLDivElement>(null);
  const status = useContainerStatus();
  const started = React.useRef(false);

  async function startShell(terminal: TerminalClass) {
    const shellProcess = await webContainerRef?.current?.spawn('jsh');
    if (!shellProcess) return;
    shellProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal.write(data);
        },
      }),
    );

    const input = shellProcess.input.getWriter();
    terminal.onData(data => {
      input.write(data);
    });

    return shellProcess;
  }
  React.useEffect(() => {
    if (status !== 'ready') return;
    const term = new TerminalClass();

    if (terminalRef.current && !started.current) {
      started.current = true;
      term.open(terminalRef.current);
    }
    startShell(term);
  }, [status]);

  return <div id="terminal" ref={terminalRef} />;
}
