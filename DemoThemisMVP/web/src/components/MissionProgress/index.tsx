import Link from 'next/link';

const MISSIONS = [
  { number: 1, label: 'Follow the live case', href: '/app' },
  { number: 2, label: 'Join as a juror', href: '/onboard' },
  { number: 3, label: 'Submit a question', href: '/app?tab=submit' },
] as const;

export function MissionProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav className="mission-progress" aria-label="Live MVP steps">
      <div className="mission-progress-head">
        <span>Live MVP</span>
        <strong>Step {current} of 3</strong>
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
