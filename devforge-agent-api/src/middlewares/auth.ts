import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

const API_KEY = process.env.AGENT_API_KEY || 'dev-key';
const SIGNATURE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

export interface AuthenticatedRequest extends FastifyRequest {
  requestId: string;
  userId: string;
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'];
  const signature = request.headers['x-signature'] as string;
  const timestamp = request.headers['x-timestamp'] as string;

  // Check API key
  if (apiKey !== API_KEY) {
    reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid API key' },
    });
    return;
  }

  // Check timestamp to prevent replay attacks
  if (timestamp) {
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();

    if (Math.abs(now - requestTime) > SIGNATURE_MAX_AGE) {
      reply.code(401).send({
        success: false,
        error: { code: 'EXPIRED', message: 'Request expired' },
      });
      return;
    }

    // Verify signature if provided
    if (signature) {
      const payload = JSON.stringify(request.body);
      const expectedSignature = crypto
        .createHmac('sha256', API_KEY)
        .update(payload + timestamp)
        .digest('hex');

      if (signature !== expectedSignature) {
        reply.code(401).send({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' },
        });
        return;
      }
    }
  }
}

export function generateSignature(payload: unknown, apiKey: string): { signature: string; timestamp: number } {
  const timestamp = Date.now();
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', apiKey)
    .update(payloadString + timestamp)
    .digest('hex');

  return { signature, timestamp };
}
