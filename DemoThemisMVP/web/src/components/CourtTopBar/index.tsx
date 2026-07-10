import type { ReactNode } from 'react';

export function CourtTopBar({ title, startAdornment }: { title: string; startAdornment?: ReactNode }) {
  return (
    <div className={`court-topbar${startAdornment ? ' has-start' : ''}`}>
      {startAdornment && <div className="court-topbar-start">{startAdornment}</div>}
      <h1>{title}</h1>
      {startAdornment && <span aria-hidden="true" />}
    </div>
  );
}
