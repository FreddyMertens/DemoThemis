import Link from 'next/link';

const MISSIONS = [
  { number: 1, label: 'Try the attack', href: '/sandbox' },
  { number: 2, label: 'Serve as juror', href: '/juror-preview' },
  { number: 3, label: 'Check court evidence', href: '/home' },
] as const;

export function MissionProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav className="mission-progress" aria-label="Guided demo progress">
      <div className="mission-progress-head">
        <span>Guided demo</span>
        <strong>Mission {current} of 3</strong>
      </div>
      <ol>
        {MISSIONS.map((mission) => {
          const active = mission.number === current;
          const complete = mission.number < current;
          return (
            <li key={mission.number} className={active ? 'is-active' : complete ? 'is-complete' : undefined}>
              <Link href={mission.href} aria-current={active ? 'step' : undefined}>
                <span className="mission-progress-number" aria-hidden="true">
                  {complete ? '✓' : mission.number}
                </span>
                <span>{mission.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
