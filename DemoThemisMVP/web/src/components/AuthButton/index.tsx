'use client';
import { walletAuth } from '@/auth/wallet';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export const AuthButton = () => {
  const { isInstalled } = useMiniKit();
  const pathname = usePathname() || '/home';
  const [feedback, setFeedback] = useState<
    'pending' | 'success' | 'failed' | undefined
  >();
  const hasAttemptedAuth = useRef(false);

  const appId = process.env.NEXT_PUBLIC_APP_ID ?? '';
  const worldAppLink = appId
    ? `https://worldcoin.org/mini-app?app_id=${encodeURIComponent(appId)}&path=${encodeURIComponent(pathname)}`
    : 'https://worldcoin.org/mini-app';

  const authenticate = useCallback(async () => {
    if (isInstalled !== true || feedback === 'pending') {
      return;
    }
    setFeedback('pending');
    try {
      await walletAuth(pathname);
      setFeedback('success');
    } catch (error) {
      console.error('Wallet authentication button error', error);
      setFeedback('failed');
    }
  }, [feedback, isInstalled, pathname]);

  // Preserve the Mini App's one-step entry: prompt once when World App is ready,
  // then leave a visible retry button if the user cancels or auth fails.
  useEffect(() => {
    if (isInstalled === true && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;
      void authenticate();
    }
  }, [authenticate, isInstalled]);

  if (isInstalled === undefined) {
    return (
      <Button disabled fullWidth size="lg" variant="primary">
        Checking World App...
      </Button>
    );
  }

  if (!isInstalled) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm leading-relaxed text-slate-600">
          Sign-in works only in World App. You can use the complete sandbox here.
        </p>
        <Button asChild fullWidth size="lg" variant="primary">
          <a href={worldAppLink} target="_blank" rel="noreferrer">
            Open in World App
          </a>
        </Button>
        <Link
          href="/sandbox"
          className="inline-block text-sm font-semibold text-slate-600 underline underline-offset-4"
        >
          Try the browser sandbox
        </Link>
      </div>
    );
  }

  return (
    <LiveFeedback
      className="w-full"
      label={{
        failed: 'Sign-in failed',
        pending: 'Signing in',
        success: 'Signed in',
      }}
      state={feedback}
    >
      <Button
        onClick={authenticate}
        disabled={feedback === 'pending'}
        fullWidth
        size="lg"
        variant="primary"
      >
        {feedback === 'failed' ? 'Try wallet sign-in again' : 'Sign in with World App'}
      </Button>
    </LiveFeedback>
  );
};
