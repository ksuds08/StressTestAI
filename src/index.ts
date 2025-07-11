import { Hono } from 'hono';
import { z } from 'zod';

type Env = {
  KV: KVNamespace;
  GUMROAD_PRODUCT_ID: string;
  FREE_DAILY_LIMIT: string;
};

const app = new Hono<{ Bindings: Env }>();

async function checkFreeLimit(kv: KVNamespace, userId: string, limit: number) {
  const key = `usage:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const count = Number((await kv.get(key)) || 0);
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 60 * 60 * 24 * 2 });
  return true;
}

async function verifyLicense(licenseKey: string, productId: string) {
  const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, license_key: licenseKey }),
  });
  const data = await res.json<{ success: boolean; purchase?: { refunded: boolean } }>();
  return data.success && !data.purchase?.refunded;
}

const ChatSchema = z.object({
  userId: z.string(),
  message: z.string(),
  licenseKey: z.string().optional(),
});

app.post('/chat', async (c) => {
  const body = await c.req.json();
  const { userId, message, licenseKey } = ChatSchema.parse(body);

  const hasPremium = licenseKey
    ? await verifyLicense(licenseKey, c.env.GUMROAD_PRODUCT_ID)
    : false;

  if (!hasPremium) {
    const allowed = await checkFreeLimit(
      c.env.KV,
      userId,
      Number(c.env.FREE_DAILY_LIMIT)
    );
    if (!allowed) {
      return c.json(
        { error: 'Free tier limit reached. Upgrade to continue.' },
        402
      );
    }
  }

  const personaResponse = await runPersonaPipeline(message, userId, hasPremium);

  return c.json({
    premium: hasPremium,
    ...personaResponse,
  });
});

async function runPersonaPipeline(
  message: string,
  userId: string,
  premium: boolean
) {
  return {
    messages: [
      { role: 'optimist', content: 'Optimist response...' },
      { role: 'skeptic', content: 'Skeptic response...' },
      { role: 'solver', content: 'Solver response...' },
    ],
    premium,
  };
}

export default app;
