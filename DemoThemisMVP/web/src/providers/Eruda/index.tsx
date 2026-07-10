'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const Eruda = dynamic(() => import('./eruda-provider').then((c) => c.Eruda), {
  ssr: false,
});

export const ErudaProvider = (props: { children: ReactNode }) => {
  if (process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_APP_ENV === 'production') {
    return props.children;
  }

  // Keep the app itself server-renderable. The development console is a
  // client-only sibling, not a wrapper around the product tree.
  return (
    <>
      {props.children}
      <Eruda>{null}</Eruda>
    </>
  );
};
