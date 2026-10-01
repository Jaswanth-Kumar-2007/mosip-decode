import { useEffect, useState } from 'react';
import type { Run, RunConfig, Step } from '../types';
import { HandoffPanel } from './HandoffPanel';
import { Inspector } from './Inspector';
import { ResultPanel } from './ResultPanel';
import { SequenceDiagram } from './SequenceDiagram';

interface Props { config: RunConfig; steps: Step[]; running: boolean; run?: Run; simulated: boolean }

/** Sequence diagram + handoff + inspector + report. Used for live runs and for stored runs in History. */
export function RunView({ config, steps, running, run, simulated }: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (running && steps.length) setSelectedId(steps[steps.length - 1].id);
  }, [running, steps.length]);
  useEffect(() => {
    if (!steps.length) setSelectedId(undefined);
  }, [steps.length]);

  // Show the most recent handoff at or before the selected step (falls back to the latest one).
  const idx = Math.max(0, steps.findIndex((s) => s.id === selectedId));
  const upto = selectedId ? steps.slice(0, idx + 1) : steps;
  const handoffStep = [...upto].reverse().find((s) => s.handoff) ?? [...steps].reverse().find((s) => s.handoff);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <SequenceDiagram steps={steps} cfg={config} selectedId={selectedId} onSelect={setSelectedId} running={running} />
          <HandoffPanel step={handoffStep} simulated={simulated} />
        </div>
        <div className="xl:col-span-5">
          <Inspector steps={steps} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>
      <ResultPanel run={run} config={config} running={running} />
    </div>
  );
}
