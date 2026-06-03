import { useState } from 'react';

import HealthcareSidebar, { type HCTab } from '@/components/healthcare/HealthcareSidebar';
import HealthcareHeader from '@/components/healthcare/HealthcareHeader';
import ExecutiveSnapshot from '@/components/healthcare/tabs/ExecutiveSnapshot';
import StrategicGoalsOverview from '@/components/healthcare/tabs/StrategicGoalsOverview';
import GoalExplorer from '@/components/healthcare/tabs/GoalExplorer';
import QuarterlyExecution from '@/components/healthcare/tabs/QuarterlyExecution';
import DecisionBlockersBoard from '@/components/healthcare/tabs/DecisionBlockersBoard';
import BudgetIntelligence from '@/components/healthcare/tabs/BudgetIntelligence';

const TITLES: Record<HCTab, { title: string; subtitle: string }> = {
  'snapshot':  { title: 'Healthcare Executive Command Center', subtitle: 'Consolidated institutional briefing — Healthcare Strategic Plan' },
  'goals':     { title: 'Strategic Goals Overview',            subtitle: 'All Healthcare goals with derived completion, blockers and risk signals' },
  'explorer':  { title: 'Goal Explorer',                       subtitle: 'Goal → Action → Action Step drill-down with quarterly narrative' },
  'quarterly': { title: 'Quarterly Execution Timeline',        subtitle: 'Reporting activity and status evolution across Q1 2026 → Q1 2027' },
  'blockers':  { title: 'Decisions & Blockers Board',          subtitle: 'Items requiring executive decision or removal' },
  'budget':    { title: 'Budget Intelligence',                 subtitle: 'Five-year budget phasing, funding sources and concentration' },
};

export default function HealthcareDashboard() {
  const [tab, setTab] = useState<HCTab>('snapshot');
  const [explorerGoal, setExplorerGoal] = useState<number | undefined>(undefined);

  return (
    <div className="flex h-screen bg-background" style={{ overflow: 'clip' }}>
      <HealthcareSidebar activeTab={tab} onTabChange={setTab} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        <HealthcareHeader title={TITLES[tab].title} subtitle={TITLES[tab].subtitle} />
        <main className="flex-1 overflow-y-auto p-5 sm:p-6">
          {tab === 'snapshot'  && <ExecutiveSnapshot onJumpTo={setTab} />}
          {tab === 'goals'     && <StrategicGoalsOverview onOpenGoal={(c) => { setExplorerGoal(c); setTab('explorer'); }} />}
          {tab === 'explorer'  && <GoalExplorer initialGoal={explorerGoal} />}
          {tab === 'quarterly' && <QuarterlyExecution />}
          {tab === 'blockers'  && <DecisionBlockersBoard />}
          {tab === 'budget'    && <BudgetIntelligence />}
        </main>
      </div>
    </div>
  );
}
