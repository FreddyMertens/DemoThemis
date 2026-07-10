import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Page>
      {children}
      <Page.Footer className="court-nav-dock">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}
