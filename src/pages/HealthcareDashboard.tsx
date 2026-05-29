import { useState } from 'react';

import HealthcareSidebar, { type HCTab } from '@/components/healthcare/HealthcareSidebar';
import HealthcareHeader from '@/components/healthcare/HealthcareHeader';
import ExecutiveSnapshot from '@/components/healthcare/tabs/ExecutiveSnapshot';
import StrategicGoalsOverview from '@/components/healthcare/tabs/StrategicGoalsOverview';
import GoalExplorer from '@/components/healthcare/tabs/GoalExplorer';
import ExecutionIntelligence from '@/components/healthcare/tabs/ExecutionIntelligence';
import BudgetIntelligence from '@/components/healthcare/tabs/BudgetIntelligence';
import GovernanceOwnership from '@/components/healthcare/tabs/GovernanceOwnership';
import FutureIntegrationVision from '@/components/healthcare/tabs/FutureIntegrationVision';

const TITLES: Record<HCTab, { title: string; subtitle: string }> = {
  'snapshot':   { title: 'Healthcare Executive Command Center', subtitle: 'Consolidated institutional briefing — Healthcare Strategic Plan' },
  'goals':      { title: 'Strategic Goals Overview',            subtitle: 'All Healthcare goals with progress, governance and budget signals' },
  'explorer':   { title: 'Goal Explorer',                       subtitle: 'Goal → Action → Action Steps drill-down' },
  'execution':  { title: 'Execution Intelligence',              subtitle: 'Delays, risks, priorities and leadership decisions required' },
  'budget':     { title: 'Budget Intelligence',                 subtitle: 'Healthcare financial execution and funding signals' },
  'governance': { title: 'Governance & Ownership',              subtitle: 'Champions, RACI and ownership distribution' },
  'future':     { title: 'Future Integration Vision',           subtitle: 'Roadmap toward the integrated executive dashboard' },
};

export default function HealthcareDashboard() {
  const [tab, setTab] = useState<HCTab>('snapshot');
  const [explorerGoal, setExplorerGoal] = useState<number | undefined>(undefined);

  const open = (id: HCTab) => setTab(id);

  return (
    <div className="flex h-screen bg-background" style={{ overflow: 'clip' }}>
      <HealthcareSidebar activeTab={tab} onTabChange={open} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        <HealthcareHeader title={TITLES[tab].title} subtitle={TITLES[tab].subtitle} />
        <main className="flex-1 overflow-y-auto p-5 sm:p-6">
          {tab === 'snapshot' && <ExecutiveSnapshot />}
          {tab === 'goals' && <StrategicGoalsOverview onOpenGoal={(c) => { setExplorerGoal(c); setTab('explorer'); }} />}
          {tab === 'explorer' && <GoalExplorer initialGoal={explorerGoal} />}
          {tab === 'execution' && <ExecutionIntelligence />}
          {tab === 'budget' && <BudgetIntelligence />}
          {tab === 'governance' && <GovernanceOwnership />}
          {tab === 'future' && <FutureIntegrationVision />}
        </main>
      </div>
    </div>
  );
}
