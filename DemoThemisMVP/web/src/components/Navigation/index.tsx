'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, InfoCircle, PlusCircle } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Bottom navigation for the Mini App. Tabs route to the three top-level screens;
 * Onboard and Case detail are reached in-page. Mobile-first per the World design
 * guidelines.
 */
const TABS = [
  { value: 'home', label: 'Court', href: '/home', icon: <Home /> },
  { value: 'dispute', label: 'Case preview', href: '/dispute', icon: <PlusCircle /> },
  { value: 'about', label: 'About', href: '/about', icon: <InfoCircle /> },
] as const;

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const active = TABS.find((t) => pathname?.startsWith(t.href))?.value ?? 'home';

  return (
    <nav className="court-tabs" aria-label="Court application navigation">
      <Tabs
        aria-label="Court sections"
        value={active}
        onValueChange={(v) => {
          const tab = TABS.find((t) => t.value === v);
          if (tab) router.push(tab.href);
        }}
      >
        {TABS.map((t) => (
          <TabItem key={t.value} value={t.value} icon={t.icon} label={t.label} />
        ))}
      </Tabs>
    </nav>
  );
};
