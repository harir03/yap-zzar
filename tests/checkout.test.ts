import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import type { Request, Response } from 'express';

const testSecret = 'FT4IhmvDwbL1QAjTuvag6GRV';

vi.mock('../src/server/config.js', () => ({
  config: {
    PORT: 3001,
    NODE_ENV: 'test',
    RAZORPAY_KEY_ID: 'rzp_test_TYWrkxvl6EfqYN',
    RAZORPAY_KEY_SECRET: 'FT4IhmvDwbL1QAjTuvag6GRV',
    OPENWA_URL: 'http://localhost:2785',
    OPENWA_API_KEY: '',
    OPENWA_SESSION: 'test',
    GEMINI_API_KEY: '',
    DATABASE_PATH: ':memory:',
  },
}));

vi.mock('../src/server/gate/index.js', () => ({
  logAudit: vi.fn(),
}));

const mockOrdersCreate = vi.fn();
vi.mock('../src/server/razorpay/client.js', () => ({
  razorpay: {
    orders: {
      create: (...args: any[]) => mockOrdersCreate(...args),
    },
  },
}));

const { verifyRazorpaySignature, createOrderHandler, verifyPaymentHandler } =
  await import('../src/server/razorpay/checkout.js');

interface MockResponse {
  statusCode: number;
  data: any;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
}

function createMockReqRes(body: any = {}) {
  const req = { body } as unknown as Request;
  const res: MockResponse = {
    statusCode: 200,
    data: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.data = data;
      return this;
    },
  };
  return { req, res: res as unknown as Response & MockResponse };
}

describe('Razorpay Standard Checkout Integration', () => {
  describe('HMAC-SHA256 Signature Verification', () => {
    it('verifies valid signature generated with HMAC-SHA256(order_id + "|" + payment_id, secret)', () => {
      const orderId = 'order_TYWtjxIyEoh4XM';
      const paymentId = 'pay_TYWuz7K8pNm123';
      const signature = createHmac('sha256', testSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
      expect(isValid).toBe(true);
    });

    it('rejects tampered signature', () => {
      const orderId = 'order_TYWtjxIyEoh4XM';
      const paymentId = 'pay_TYWuz7K8pNm123';
      const tamperedSig = 'a'.repeat(64);

      const isValid = verifyRazorpaySignature(orderId, paymentId, tamperedSig);
      expect(isValid).toBe(false);
    });

    it('rejects tampered order_id or payment_id', () => {
      const orderId = 'order_TYWtjxIyEoh4XM';
      const paymentId = 'pay_TYWuz7K8pNm123';
      const signature = createHmac('sha256', testSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(verifyRazorpaySignature('order_different', paymentId, signature)).toBe(false);
      expect(verifyRazorpaySignature(orderId, 'pay_different', signature)).toBe(false);
    });
  });

  describe('createOrderHandler (/api/create-order)', () => {
    it('rejects amount less than 100 paise (₹1)', async () => {
      const { req, res } = createMockReqRes({ amount: 50 });
      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data?.error).toContain('Minimum amount is 100 paise');
    });

    it('rejects non-numeric amount', async () => {
      const { req, res } = createMockReqRes({ amount: 'invalid' });
      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('creates order successfully for valid amount', async () => {
      mockOrdersCreate.mockResolvedValueOnce({
        id: 'order_mock123',
        amount: 25000,
        currency: 'INR',
        receipt: 'rcpt_test_1',
      });

      const { req, res } = createMockReqRes({
        amount: 25000,
        currency: 'INR',
        receipt: 'rcpt_test_1',
      });

      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.data).toEqual({
        order_id: 'order_mock123',
        amount: 25000,
        currency: 'INR',
      });
      expect(mockOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 25000,
          currency: 'INR',
        })
      );
    });

    it('handles Razorpay API authentication errors (401)', async () => {
      mockOrdersCreate.mockRejectedValueOnce({
        statusCode: 401,
        error: { code: 'BAD_REQUEST_ERROR', description: 'Authentication failed' },
      });

      const { req, res } = createMockReqRes({ amount: 50000 });
      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.data?.error).toContain('authentication failed');
    });

    it('handles generic Razorpay API errors (500)', async () => {
      mockOrdersCreate.mockRejectedValueOnce(new Error('Gateway timeout'));

      const { req, res } = createMockReqRes({ amount: 50000 });
      await createOrderHandler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.data?.error).toContain('Failed to create Razorpay order');
    });
  });

  describe('verifyPaymentHandler (/api/verify-payment)', () => {
    it('returns 400 when required fields are missing', () => {
      const { req, res } = createMockReqRes({
        razorpay_order_id: 'order_123',
      });

      verifyPaymentHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.data?.success).toBe(false);
    });

    it('returns 400 on signature mismatch', () => {
      const { req, res } = createMockReqRes({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_456',
        razorpay_signature: 'invalid_signature_hex',
      });

      verifyPaymentHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.data?.success).toBe(false);
    });

    it('returns 200 on valid signature verification', () => {
      const orderId = 'order_valid_789';
      const paymentId = 'pay_valid_101';
      const validSig = createHmac('sha256', testSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const { req, res } = createMockReqRes({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSig,
      });

      verifyPaymentHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data?.success).toBe(true);
      expect(res.data?.order_id).toBe(orderId);
      expect(res.data?.payment_id).toBe(paymentId);
    });
  });
});
