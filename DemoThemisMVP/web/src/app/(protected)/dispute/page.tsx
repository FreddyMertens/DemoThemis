import { redirect } from 'next/navigation';

export default function LegacySubmissionRoute() {
  redirect('/app?tab=submit');
}
