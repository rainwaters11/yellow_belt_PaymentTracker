import './GoalsDashboard.css';
import { useMemo } from 'react';

type Goal = {
  id: string;
  title: string;
  progress: number;
  target: string;
};

const GOALS: Goal[] = [
  { id: 'g1', title: 'Emergency date fund', progress: 72, target: '150 XLM' },
  { id: 'g2', title: 'Weekend trip wallet', progress: 44, target: '300 XLM' },
  { id: 'g3', title: 'Joint long-term savings', progress: 19, target: '1,000 XLM' },
];

export default function GoalsDashboard() {
  const contractId = import.meta.env.PUBLIC_CONTRACT_ID;
  const hasContractId = Boolean(contractId && String(contractId).trim().length > 0);

  const summary = useMemo(() => {
    const total = GOALS.reduce((acc, goal) => acc + goal.progress, 0);
    return Math.round(total / GOALS.length);
  }, []);

  return (
    <section className="goals-dashboard" aria-labelledby="goals-dashboard-title">
      <div className="goals-dashboard__header">
        <h2 id="goals-dashboard-title">Goals Dashboard</h2>
        <p>Track shared vault milestones and celebrate progress together.</p>
      </div>

      {!hasContractId && (
        <div className="goals-dashboard__warning" role="status">
          Contract ID is not configured. Set <code>PUBLIC_CONTRACT_ID</code> to enable live goal data.
        </div>
      )}

      <div className="goals-dashboard__summary">
        <span>Average progress</span>
        <strong>{summary}%</strong>
      </div>

      <ul className="goals-dashboard__list">
        {GOALS.map((goal) => (
          <li key={goal.id} className="goals-dashboard__item">
            <div className="goals-dashboard__row">
              <span>{goal.title}</span>
              <span>{goal.target}</span>
            </div>
            <div className="goals-dashboard__bar" aria-hidden="true">
              <div style={{ width: `${goal.progress}%` }} />
            </div>
            <small>{goal.progress}% funded</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

