import { z } from 'zod';
import type { GateRequest } from '../types.js';

// ponytail: known injection patterns, not an exhaustive NLP classifier
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /override|bypass|sudo|admin/i,
  /<\s*system\s*>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<<\s*SYS\s*>>/i,
];

export const gateRequestSchema = z.object({
  agent_id: z.string().uuid(),
  merchant_id: z.string().uuid(),
  customer_phone: z.string().regex(/^[0-9]{10,15}$/, 'Must be 10-15 digits'),
  discount_paise: z.number().int().positive(),
  product_name: z.string().min(1).max(200),
  product_price_paise: z.number().int().positive(),
  reason: z.string().min(1).max(500),
  idempotency_key: z.string().min(8).max(128),
});

interface SanitizeResult {
  valid: boolean;
  data?: GateRequest;
  code?: string;
  message?: string;
}

export function sanitize(raw: unknown): SanitizeResult {
  // Step 1: Zod schema validation
  const parsed = gateRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      valid: false,
      code: 'E_MALFORMED_INPUT',
      message: `${firstIssue.path.join('.')}: ${firstIssue.message}`,
    };
  }

  // Step 2: Injection pattern scan on string fields
  const strFields = [parsed.data.product_name, parsed.data.reason, parsed.data.agent_id];
  for (const field of strFields) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(field)) {
        return {
          valid: false,
          code: 'E_INJECTION_DETECTED',
          message: `Suspicious pattern found in input: ${pattern.source}`,
        };
      }
    }
  }

  return { valid: true, data: parsed.data as GateRequest };
}
