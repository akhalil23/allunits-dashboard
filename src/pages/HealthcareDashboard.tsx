import { useState } from 'react';

import HealthcareSidebar, { type HCTab } from '@/components/healthcare/HealthcareSidebar';
import HealthcareHeader from '@/components/healthcare/HealthcareHeader';
import ExecutiveSnapshot from '@/components/healthcare/tabs/ExecutiveSnapshot';
import StrategicGoalsOverview from '@/components/healthcare/tabs/StrategicGoalsOverview';
import GoalExplorer from '@/components/healthcare/tabs/GoalExplorer';
import QuarterlyExecution from '@/components/healthcare/tabs/QuarterlyExecution';
import DecisionBlockersBoard from '@/components/healthcare/tabs/DecisionBlockersBoard';
import BudgetIntelligence from '@/components/healthcare/tabs/BudgetIntelligence';
import { HealthcareDataProvider, useHealthcareData } from '@/lib/healthcare/HealthcareDataProvider';
import { Loader2 } from 'lucide-react';

const TITLES: Record<HCTab, { title: string; subtitle: string }> = {
  'snapshot':  { title: 'Healthcare Executive Command Center', subtitle: 'Goal 3 pilot — real reported data from the Healthcare SP working file' },
  'goals':     { title: 'Strategic Goals Overview',            subtitle: 'Imported Healthcare goals with derived progress, coverage and risk signals' },
  'explorer':  { title: 'Goal Explorer',                       subtitle: 'Goal → Action → Action Step drill-down with quarterly reporting' },
  'quarterly': { title: 'Quarterly Execution Timeline',        subtitle: 'Reporting activity across the imported quarters' },
  'blockers':  { title: 'Decisions & Blockers Board',          subtitle: 'Items requiring executive decision, with the reason each signal fired' },
  'budget':    { title: 'Budget Intelligence',                 subtitle: 'Five-year planned budget as reported — no spend or funding source inferred' },
};

function HealthcareBody() {
  const [tab, setTab] = useState<HCTab>('snapshot');
  const [explorerGoal, setExplorerGoal] = useState<number | undefined>(undefined);
  const { isLoading, error } = useHealthcareData();

  return (
    <div className="flex h-screen bg-background" style={{ overflow: 'clip' }}>
      <HealthcareSidebar activeTab={tab} onTabChange={setTab} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        <HealthcareHeader title={TITLES[tab].title} subtitle={TITLES[tab].subtitle} />
        <main className="flex-1 overflow-y-auto p-5 sm:p-6">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading Healthcare data…
            </div>
          )}
          {!isLoading && error && (
            <div className="text-sm text-destructive">Unable to load Healthcare data: {error.message}</div>
          )}
          {!isLoading && !error && (
            <>
              {tab === 'snapshot'  && <ExecutiveSnapshot onJumpTo={setTab} />}
              {tab === 'goals'     && <StrategicGoalsOverview onOpenGoal={(c) => { setExplorerGoal(c); setTab('explorer'); }} />}
              {tab === 'explorer'  && <GoalExplorer initialGoal={explorerGoal} />}
              {tab === 'quarterly' && <QuarterlyExecution />}
              {tab === 'blockers'  && <DecisionBlockersBoard />}
              {tab === 'budget'    && <BudgetIntelligence />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function HealthcareDashboard() {
  return (
    <HealthcareDataProvider>
      <HealthcareBody />
    </HealthcareDataProvider>
  );
}
