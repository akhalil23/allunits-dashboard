// Healthcare SP — prototype seed inspired by LAU-HS SP Q2 2026 working file.
// NOT live data. Used to validate architecture / executive UX before ingestion is built.
import type { HCGoal, HCStep, HCStatus, HCRisk, HCRiskFlag, HCFundingSource, HCBlocker } from './types';

const QPERIODS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027'];

const RISK_TO_FLAG: Record<HCRisk, HCRiskFlag> = {
  'No': 'None', 'Emerging': 'Low', 'Critical': 'High', 'Realized': 'High',
};

type MkOpts = Omit<Partial<HCStep>, 'budget' | 'priority' | 'risk' | 'quarterly' | 'riskFlag' | 'blocker'> & {
  status?: HCStatus; risk?: HCRisk; riskFlag?: HCRiskFlag;
  budget?: number; source?: HCFundingSource; priority?: 1 | 2 | 3;
  blocker?: HCBlocker;
  note?: string;
};
function mkStep(code: string, title: string, opts: MkOpts = {}): HCStep {
  const status: HCStatus = opts.status ?? 'In Progress';
  const risk: HCRisk = opts.risk ?? 'Emerging';
  const riskFlag: HCRiskFlag = opts.riskFlag ?? RISK_TO_FLAG[risk];
  const progressMap: Record<HCStatus, number> = {
    'Done': 100, 'On Target': 80, 'In Progress': 45, 'Below Target': 30,
    'Not Started': 0, 'N/A': 0, 'Blocked': 10,
  };
  return {
    code, title,
    intent: opts.intent,
    kpis: opts.kpis as string | undefined,
    champion: opts.champion ?? 'EVP Health',
    priority: opts.priority ?? 2,
    responsible: opts.responsible ?? 'Operations Lead',
    accountable: opts.accountable ?? 'EVP Health',
    consulted: opts.consulted ?? 'C-Suite',
    informed: opts.informed ?? 'Medical Board',
    quarterly: QPERIODS.map((p, i) => ({
      period: p,
      status: i === 0 ? status : (i === 1 ? status : 'Not Started') as HCStatus,
      note: i === 0 ? (opts.note ?? 'Active execution; tracking against committed timeline.') : undefined,
    })),
    budget: [
      { year: 'Year 1', amount: opts.budget ?? 250000, source: opts.source ?? 'Operational' },
      { year: 'Year 2', amount: Math.round((opts.budget ?? 250000) * 0.5), source: opts.source ?? 'Operational' },
      { year: 'Year 3', amount: 0 },
      { year: 'Year 4', amount: 0 },
      { year: 'Year 5', amount: 0 },
    ],
    risk,
    riskFlag,
    blocker: opts.blocker,
    progress: progressMap[status],
  };
}

export const HEALTHCARE_GOALS: HCGoal[] = [
  {
    code: 1,
    title: 'Enhance National and Regional Healthcare Leadership and Visibility',
    champion: 'Zeina Khoury-Stevens',
    actions: [
      {
        code: '1.1',
        title: 'Strengthen the LAU Health System Branding and Regional Outreach',
        kpis: [
          '10% increase in international patient volume by end of 2027',
          '20% YoY growth in social appearances from baseline',
          'Local patient volume +10% and 4 new outpatient affiliates by end of 2026',
        ],
        steps: [
          mkStep('1.1.1', 'Develop and implement a medical tourism program and communication strategy', {
            intent: 'Grow international patient volume and regional partnerships via a step-wise International Office.',
            kpis: 'Communication strategy launched Q2 2026; Medical tourism program launched Q1 2027',
            responsible: 'Marketing & Communications', accountable: 'EVP Health',
            status: 'In Progress', risk: 'Emerging', priority: 3, budget: 500000, source: 'Capital',
          }),
          mkStep('1.1.2', 'Launch a comprehensive healthcare branding and marketing strategy for both hospitals', {
            intent: 'Showcase multidisciplinary expertise and grow Beirut patient volume.',
            kpis: 'Branding & marketing strategy launched Q2 2026',
            responsible: 'Marketing & Communications', accountable: 'EVP Health',
            status: 'Done', risk: 'No', priority: 1, budget: 180000, source: 'Operational',
          }),
          mkStep('1.1.3', 'Establish regional referral partnerships across Beirut & Bekaa', {
            responsible: 'Business Development', status: 'In Progress', risk: 'Emerging', priority: 2, budget: 120000, source: 'Operational',
          }),
          mkStep('1.1.4', 'Deploy digital outreach campaign for primary-care affiliates', {
            responsible: 'Digital Marketing', status: 'In Progress', risk: 'No', priority: 2, budget: 80000, source: 'Operational',
          }),
        ],
      },
      {
        code: '1.2',
        title: 'Position LAU Health System as a regional thought leader',
        kpis: ['≥12 high-impact thought-leadership publications / yr by 2027'],
        steps: [
          mkStep('1.2.1', 'Quarterly executive media engagements with regional outlets', { responsible: 'Mar-Com', status: 'In Progress', risk: 'No', priority: 2, budget: 60000 }),
          mkStep('1.2.2', 'Launch LAU Health System regional clinical conference', { status: 'Not Started', risk: 'Emerging', priority: 3, budget: 250000, source: 'Philanthropy' }),
          mkStep('1.2.3', 'Establish faculty visiting-expert exchange program', { status: 'Not Started', risk: 'Critical', priority: 3, budget: 90000 }),
        ],
      },
      {
        code: '1.3',
        title: 'Build executive presence in national healthcare policy forums',
        steps: [
          mkStep('1.3.1', 'Appoint policy liaison and contribute to MoPH technical committees', { status: 'In Progress', risk: 'No', priority: 1, budget: 40000 }),
          mkStep('1.3.2', 'Quarterly policy briefs published by LAU Health System', { status: 'Below Target', risk: 'Critical', priority: 2, budget: 25000 }),
          mkStep('1.3.3', 'Co-host annual national health-leadership summit', { status: 'Not Started', risk: 'Emerging', priority: 3, budget: 150000, source: 'Philanthropy' }),
          mkStep('1.3.4', 'Strategic engagement plan with international academic medical centers', { status: 'Not Started', risk: 'Emerging', priority: 3, budget: 100000 }),
          mkStep('1.3.5', 'Establish LAU Health speaker bureau', { status: 'In Progress', risk: 'No', priority: 2, budget: 20000 }),
          mkStep('1.3.6', 'Annual stakeholder perception study', { status: 'Not Started', risk: 'No', priority: 2, budget: 35000 }),
        ],
      },
    ],
  },
  {
    code: 2,
    title: 'Advance Academic-Clinical Integration and Collaborative Practice',
    champion: 'Sola Bahous',
    actions: [
      {
        code: '2.1',
        title: 'Establish a Collaborative Education and Capacity-Building Framework',
        kpis: [
          '≥200 staff in CPD activities by 2027',
          '≥5 new interdisciplinary training modules by 2027',
          'ACCME accreditation granted by Q4 2027',
          'Medication preparation error −90% by Q4 2028',
        ],
        steps: [
          mkStep('2.1.1', 'Expand CPD Committee with multidisciplinary academic + clinical representation', { responsible: 'OFAD + SON + SOP', status: 'In Progress', risk: 'No', priority: 1, budget: 5000 }),
          mkStep('2.1.2', 'Launch needs assessment across faculty, staff and trainees', { responsible: 'OFAD + HR + CNO', status: 'In Progress', risk: 'No', priority: 2, budget: 500 }),
          mkStep('2.1.3', 'Pursue ACCME accreditation and joint providership with ACPE/ANCC', { status: 'In Progress', risk: 'Emerging', priority: 1, budget: 95000 }),
          mkStep('2.1.4', 'Stand up interprofessional simulation curriculum across 4+ disciplines', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 220000, source: 'Capital' }),
          mkStep('2.1.5', 'Deploy CPD platform with annual outcomes reporting', { status: 'In Progress', risk: 'No', priority: 2, budget: 75000 }),
          mkStep('2.1.6', 'Establish medication-error reduction program at both hospitals', { status: 'Below Target', risk: 'Critical', priority: 1, budget: 140000 }),
        ],
      },
      {
        code: '2.2',
        title: 'Embed academic missions inside clinical operating model',
        steps: [
          mkStep('2.2.1', 'Joint academic-clinical leadership council', { status: 'In Progress', risk: 'No', priority: 1, budget: 0 }),
          mkStep('2.2.2', 'Aligned faculty workload and clinical effort policies', { status: 'In Progress', risk: 'Emerging', priority: 2, budget: 0 }),
          mkStep('2.2.3', 'Joint quality & research review committees', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 0 }),
          mkStep('2.2.4', 'Integrated education + clinical KPI dashboard', { status: 'In Progress', risk: 'No', priority: 2, budget: 60000 }),
        ],
      },
      {
        code: '2.3',
        title: 'Translational research partnerships across schools and hospitals',
        steps: [
          mkStep('2.3.1', 'Joint SOM/SON/SOP research seed-grant program', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 400000, source: 'Grant' }),
          mkStep('2.3.2', 'Shared core research infrastructure governance', { status: 'In Progress', risk: 'No', priority: 2, budget: 120000 }),
          mkStep('2.3.3', 'IRB harmonization across LAUMC sites', { status: 'In Progress', risk: 'Emerging', priority: 1, budget: 25000 }),
          mkStep('2.3.4', 'Clinical-trials office expansion', { status: 'Not Started', risk: 'Critical', priority: 2, budget: 350000, source: 'Capital' }),
        ],
      },
    ],
  },
  {
    code: 3,
    title: 'Foster Integrative Quality Clinical Services and Patient-Centered Care',
    champion: 'Karl Jallad, Stephanie Irani',
    actions: [
      {
        code: '3.1',
        title: 'Strengthen Comprehensive and Holistic Patient-Centered Services',
        kpis: [
          '>80% staff & trainees trained in empathy & cultural sensitivity',
          '≥50% patients in screening/prevention by Q4 2027',
          '≥60% chronic-care patients on integrated holistic plans by Q4 2027',
        ],
        steps: [
          mkStep('3.1.1', 'Interprofessional training on empathy and cultural sensitivity', { responsible: 'CNO + Clinical Educators + HR + Quality', status: 'Below Target', risk: 'Critical', priority: 1, budget: 60000 }),
          mkStep('3.1.2', 'Patient & family advisory councils at both hospitals', { status: 'In Progress', risk: 'Emerging', priority: 2, budget: 20000 }),
          mkStep('3.1.3', 'Integrated chronic-care pathways pilot', { status: 'In Progress', risk: 'No', priority: 2, budget: 180000 }),
          mkStep('3.1.4', 'Screening & prevention scale-up campaign', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 220000, source: 'Grant' }),
        ],
      },
      {
        code: '3.2',
        title: 'Strengthen institutional quality and patient-safety culture',
        steps: [
          mkStep('3.2.1', 'JCI re-accreditation preparation', { status: 'In Progress', risk: 'Emerging', priority: 1, budget: 200000 }),
          mkStep('3.2.2', 'Closed-loop incident reporting & learning system', { status: 'In Progress', risk: 'No', priority: 2, budget: 90000 }),
          mkStep('3.2.3', 'Patient-experience analytics platform', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 140000, source: 'Capital' }),
        ],
      },
      {
        code: '3.3',
        title: 'Coordinated care transitions across hospitals & outpatient sites',
        steps: [
          mkStep('3.3.1', 'Care-transition navigators for high-risk cohorts', { status: 'Not Started', risk: 'Critical', priority: 2, budget: 160000 }),
          mkStep('3.3.2', 'Unified discharge documentation standard', { status: 'In Progress', risk: 'No', priority: 2, budget: 30000 }),
          mkStep('3.3.3', '30-day readmission monitoring program', { status: 'In Progress', risk: 'Emerging', priority: 1, budget: 45000 }),
        ],
      },
      {
        code: '3.4',
        title: 'Mental-health & well-being integration across clinical pathways',
        steps: [
          mkStep('3.4.1', 'Embed behavioral-health screening in primary care', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 80000 }),
          mkStep('3.4.2', 'Staff well-being & resilience program', { status: 'In Progress', risk: 'No', priority: 2, budget: 50000 }),
          mkStep('3.4.3', 'Crisis-response and trauma-informed-care training', { status: 'Not Started', risk: 'Critical', priority: 2, budget: 70000 }),
        ],
      },
    ],
  },
  {
    code: 4,
    title: 'Lead Digital Health Transformation and Innovation',
    champion: 'Roy Majdalani, Camille Abou-Nasr, Christian Bejjani',
    actions: [
      {
        code: '4.1',
        title: 'Modernize the digital core (EHR, integration, identity)',
        steps: [
          mkStep('4.1.1', 'EHR optimization & physician usability program', { status: 'In Progress', risk: 'Emerging', priority: 1, budget: 600000, source: 'Capital' }),
          mkStep('4.1.2', 'Single sign-on & identity federation across LAUMCs', { status: 'In Progress', risk: 'No', priority: 1, budget: 220000, source: 'Capital' }),
          mkStep('4.1.3', 'Enterprise integration platform (HL7 FHIR)', { status: 'Not Started', risk: 'Emerging', priority: 1, budget: 480000, source: 'Capital' }),
          mkStep('4.1.4', 'Master patient index modernization', { status: 'Not Started', risk: 'Critical', priority: 1, budget: 350000, source: 'Capital' }),
          mkStep('4.1.5', 'Clinical data warehouse & analytics layer', { status: 'In Progress', risk: 'Emerging', priority: 2, budget: 420000, source: 'Capital' }),
          mkStep('4.1.6', 'Cybersecurity & data-governance uplift', { status: 'In Progress', risk: 'Critical', priority: 1, budget: 380000, source: 'Capital' }),
        ],
      },
      {
        code: '4.2',
        title: 'Patient-facing digital services',
        steps: [
          mkStep('4.2.1', 'Patient portal v2 with multilingual support', { status: 'In Progress', risk: 'No', priority: 2, budget: 220000 }),
          mkStep('4.2.2', 'Tele-health platform expansion', { status: 'In Progress', risk: 'Emerging', priority: 2, budget: 180000 }),
          mkStep('4.2.3', 'Digital scheduling & queueing redesign', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 140000 }),
          mkStep('4.2.4', 'Mobile companion app for chronic-care patients', { status: 'Not Started', risk: 'Critical', priority: 3, budget: 260000 }),
        ],
      },
      {
        code: '4.3',
        title: 'AI & decision support',
        steps: [
          mkStep('4.3.1', 'Clinical AI governance committee & ethics charter', { status: 'In Progress', risk: 'No', priority: 1, budget: 20000 }),
          mkStep('4.3.2', 'Sepsis & early-warning AI pilot', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 180000, source: 'Grant' }),
          mkStep('4.3.3', 'Radiology AI augmentation pilot', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 220000, source: 'Grant' }),
          mkStep('4.3.4', 'AI-assisted clinical documentation', { status: 'In Progress', risk: 'No', priority: 2, budget: 160000 }),
        ],
      },
      {
        code: '4.4',
        title: 'Innovation pipeline & partnerships',
        steps: [
          mkStep('4.4.1', 'Health-tech incubator partnership with LAU schools', { status: 'In Progress', risk: 'No', priority: 2, budget: 90000 }),
          mkStep('4.4.2', 'Industry-academic digital-health consortium', { status: 'Not Started', risk: 'Emerging', priority: 3, budget: 60000 }),
          mkStep('4.4.3', 'Annual digital-health innovation showcase', { status: 'Not Started', risk: 'No', priority: 3, budget: 75000 }),
          mkStep('4.4.4', 'Internal innovation grant program', { status: 'In Progress', risk: 'No', priority: 3, budget: 120000, source: 'Philanthropy' }),
          mkStep('4.4.5', 'Pilot framework for emerging clinical technologies', { status: 'Not Started', risk: 'Emerging', priority: 3, budget: 40000 }),
          mkStep('4.4.6', 'KPI-driven evaluation of digital-health pilots', { status: 'Not Started', risk: 'No', priority: 3, budget: 20000 }),
        ],
      },
    ],
  },
  {
    code: 5,
    title: 'Position LAU Health System as an Employer of Choice',
    champion: 'HS-COO',
    actions: [
      {
        code: '5.1',
        title: 'Talent attraction, retention and growth',
        steps: [
          mkStep('5.1.1', 'Total-rewards & compensation benchmarking', { responsible: 'HR', status: 'In Progress', risk: 'Emerging', priority: 1, budget: 60000 }),
          mkStep('5.1.2', 'Clinical-leadership development pathway', { status: 'In Progress', risk: 'No', priority: 2, budget: 80000 }),
          mkStep('5.1.3', 'Onboarding and early-tenure experience redesign', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 45000 }),
        ],
      },
      {
        code: '5.2',
        title: 'Engagement, culture and workforce well-being',
        steps: [
          mkStep('5.2.1', 'Annual engagement survey + transparent action plans', { status: 'In Progress', risk: 'No', priority: 1, budget: 25000 }),
          mkStep('5.2.2', 'Manager-coaching program at scale', { status: 'Not Started', risk: 'Critical', priority: 2, budget: 110000 }),
        ],
      },
    ],
  },
  {
    code: 6,
    title: 'Expand and Develop an Agile and Sustainable Integrated Academic Health System',
    champion: 'Sami Rizk, Sally Al-Rabbaa, Christian Bejjani',
    actions: [
      {
        code: '6.1',
        title: 'Outpatient network and ambulatory growth',
        steps: [
          mkStep('6.1.1', 'Master plan for 4 new outpatient affiliates', { status: 'In Progress', risk: 'Emerging', priority: 1, budget: 1500000, source: 'Capital' }),
          mkStep('6.1.2', 'Standardized clinical operating model for outpatient sites', { status: 'In Progress', risk: 'No', priority: 2, budget: 220000 }),
          mkStep('6.1.3', 'Outpatient performance & quality dashboard', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 90000 }),
          mkStep('6.1.4', 'Specialty-service expansion roadmap', { status: 'Not Started', risk: 'Critical', priority: 2, budget: 300000, source: 'Capital' }),
        ],
      },
      {
        code: '6.2',
        title: 'Financial sustainability & operating model',
        steps: [
          mkStep('6.2.1', 'Multi-year financial plan refresh', { status: 'In Progress', risk: 'No', priority: 1, budget: 0 }),
          mkStep('6.2.2', 'Revenue-cycle optimization', { status: 'In Progress', risk: 'Emerging', priority: 1, budget: 180000 }),
          mkStep('6.2.3', 'Supply-chain consolidation & vendor strategy', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 120000 }),
          mkStep('6.2.4', 'Service-line profitability framework', { status: 'Not Started', risk: 'Critical', priority: 2, budget: 90000 }),
        ],
      },
      {
        code: '6.3',
        title: 'Governance and agility',
        steps: [
          mkStep('6.3.1', 'Integrated executive scorecard across schools and hospitals', { status: 'In Progress', risk: 'No', priority: 1, budget: 60000 }),
          mkStep('6.3.2', 'Quarterly strategic-review cadence', { status: 'In Progress', risk: 'No', priority: 1, budget: 0 }),
          mkStep('6.3.3', 'Annual strategy refresh & risk re-baselining', { status: 'Not Started', risk: 'No', priority: 2, budget: 30000 }),
          mkStep('6.3.4', 'Decision-rights & RACI clarification across system', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 25000 }),
        ],
      },
    ],
  },
  {
    code: 7,
    title: 'Develop Community-Based Health Care Outreach and Education Programs',
    champion: 'Naser Alsharif',
    actions: [
      {
        code: '7.1',
        title: 'Community outreach & public-health partnerships',
        steps: [
          mkStep('7.1.1', 'Annual community health-needs assessment', { status: 'In Progress', risk: 'No', priority: 2, budget: 35000 }),
          mkStep('7.1.2', 'Mobile screening & prevention program', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 220000, source: 'Philanthropy' }),
          mkStep('7.1.3', 'School-health partnership program', { status: 'In Progress', risk: 'No', priority: 2, budget: 75000 }),
          mkStep('7.1.4', 'Community-leader advisory board', { status: 'Not Started', risk: 'Emerging', priority: 3, budget: 20000 }),
        ],
      },
      {
        code: '7.2',
        title: 'Health-education and literacy programs',
        steps: [
          mkStep('7.2.1', 'Community digital health-literacy curriculum', { status: 'Not Started', risk: 'Emerging', priority: 2, budget: 90000, source: 'Grant' }),
          mkStep('7.2.2', 'Chronic-disease self-management workshops', { status: 'In Progress', risk: 'No', priority: 2, budget: 60000 }),
          mkStep('7.2.3', 'Patient-education multilingual content library', { status: 'Not Started', risk: 'No', priority: 3, budget: 40000 }),
          mkStep('7.2.4', 'Community health-worker certification program', { status: 'Not Started', risk: 'Critical', priority: 3, budget: 150000, source: 'Grant' }),
        ],
      },
    ],
  },
];

// ── Inject realistic Healthcare blockers & RACI gaps (illustrative, from notes patterns
// in the source file: "No budget", "Needs further discussion", "May be dropped", etc.)
function patch(code: string, fn: (s: HCStep) => void) {
  for (const g of HEALTHCARE_GOALS) for (const a of g.actions) for (const s of a.steps) if (s.code === code) fn(s);
}

patch('1.2.3', s => { s.blocker = { type: 'No Budget', reason: 'Visiting-expert exchange requires philanthropy funding not yet identified.', raisedQuarter: 'Q2 2026', decisionOwner: 'EVP Health' }; });
patch('1.3.3', s => { s.blocker = { type: 'Pending Decision', reason: 'Co-host partner and venue under negotiation; needs further discussion before commit.', raisedQuarter: 'Q2 2026', decisionOwner: 'President' }; });
patch('2.3.4', s => { s.blocker = { type: 'Awaiting Approval', reason: 'Clinical-trials office capital request awaiting Board approval.', raisedQuarter: 'Q2 2026', decisionOwner: 'Board of Trustees' }; });
patch('3.3.1', s => { s.blocker = { type: 'Capacity', reason: 'Care-transition navigators role definition + hiring on hold pending CNO workforce plan.', raisedQuarter: 'Q2 2026', decisionOwner: 'CNO' }; });
patch('4.1.4', s => { s.blocker = { type: 'External Dependency', reason: 'Master Patient Index modernization depends on EHR vendor roadmap (Q4 2026).', raisedQuarter: 'Q2 2026', decisionOwner: 'CIO' }; });
patch('4.4.2', s => { s.blocker = { type: 'May Be Dropped', reason: 'Consortium ROI unclear — flagged for potential descope at next strategy review.', raisedQuarter: 'Q2 2026', decisionOwner: 'EVP Health' }; });
patch('6.1.4', s => { s.blocker = { type: 'Pending Decision', reason: 'Specialty-service mix awaiting market-study results before commitment.', raisedQuarter: 'Q2 2026', decisionOwner: 'HS-COO' }; });
patch('7.2.4', s => { s.blocker = { type: 'No Budget', reason: 'Certification program requires grant funding; application not yet submitted.', raisedQuarter: 'Q2 2026', decisionOwner: 'Naser Alsharif' }; });

// Inject a few RACI gaps to make the cockpit realistic
patch('1.2.2', s => { s.consulted = undefined; s.informed = undefined; });
patch('4.3.2', s => { s.accountable = undefined; });
patch('5.2.2', s => { s.responsible = undefined; });
patch('6.3.4', s => { s.consulted = undefined; });

export { HEALTHCARE_GOALS as default };

// Backward-compat re-exports (kept so any older imports keep working)
export { allSteps, goalProgress, goalBudget, goalRiskFlag as goalRisk, statusDistribution4 as statusDistribution } from './helpers';


