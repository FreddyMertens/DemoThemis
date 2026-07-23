import { signRequest } from '@worldcoin/idkit/signing';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RP_ID_PATTERN = /^rp_[0-9a-f]+$/i;

function configurationError(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: Request) {
  const signingKey = process.env.RP_SIGNING_KEY?.trim();
  const rpId = process.env.RP_ID?.trim();

  if (!signingKey) return configurationError('RP_SIGNING_KEY not configured');
  if (!rpId) return configurationError('RP_ID not configured');
  if (!RP_ID_PATTERN.test(rpId)) {
    return configurationError('RP_ID has an invalid format');
  }

  let action: unknown;
  try {
    ({ action } = (await req.json()) as { action?: unknown });
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (typeof action !== 'string' || action.trim().length === 0) {
    return NextResponse.json(
      { error: 'action is required' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let sig: ReturnType<typeof signRequest>;
  try {
    sig = signRequest({ action: action.trim(), signingKeyHex: signingKey });
  } catch {
    return configurationError('RP signing configuration is invalid');
  }

  return NextResponse.json({
    rp_id: rpId,
    sig: sig.sig,
    nonce: sig.nonce,
    created_at: Number(sig.createdAt),
    expires_at: Number(sig.expiresAt),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
