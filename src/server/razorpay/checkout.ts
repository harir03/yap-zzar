import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { razorpay } from './client.js';
import { config } from '../config.js';
import { logAudit } from '../gate/index.js';

/**
 * Verify Razorpay payment signature using HMAC-SHA256
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = config.RAZORPAY_KEY_SECRET;
  const expectedSignature = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  } catch {
    return false;
  }
}

/**
 * STEP 1: BACKEND - Create Order
 * Endpoint: POST /api/create-order
 * Request: { amount (paise), currency, receipt }
 * Return: { order_id, amount, currency }
 * Minimum amount: 100 paise
 */
export async function createOrderHandler(req: Request, res: Response) {
  const { amount, currency = 'INR', receipt, notes } = req.body || {};

  const amountPaise = Number(amount);

  // Validate amount >= 100 paise (₹1.00)
  if (!amount || isNaN(amountPaise) || amountPaise < 100) {
    res.status(400).json({
      error: 'Invalid amount. Minimum amount is 100 paise (₹1.00).',
    });
    return;
  }

  try {
    const orderReceipt = receipt || `rcpt_${Date.now()}`;
    const order = await razorpay.orders.create({
      amount: Math.round(amountPaise),
      currency: (currency || 'INR').toUpperCase(),
      receipt: orderReceipt,
      notes: {
        source: 'yap-zzar-standard-checkout',
        ...notes,
      },
    });

    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error('Razorpay order creation failed:', err);

    // Auth failures (401)
    if (
      err.statusCode === 401 ||
      (err.error?.code === 'BAD_REQUEST_ERROR' &&
        err.error?.description?.toLowerCase().includes('auth'))
    ) {
      res.status(401).json({
        error: 'Razorpay authentication failed. Please check your API credentials.',
        details: err.error?.description || err.message,
      });
      return;
    }

    // Other API errors (500)
    res.status(500).json({
      error: 'Failed to create Razorpay order.',
      details: err.error?.description || err.message,
    });
  }
}

/**
 * STEP 3: BACKEND - Verify Signature
 * Endpoint: POST /api/verify-payment
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Compare generated signature with razorpay_signature
 * Return success only if signatures match
 */
export function verifyPaymentHandler(req: Request, res: Response) {
  const body = req.body || {};
  const orderId = body.razorpay_order_id || body.order_id;
  const paymentId = body.razorpay_payment_id || body.payment_id;
  const signature = body.razorpay_signature || body.signature;

  // Missing fields: return 400
  if (!orderId || !paymentId || !signature) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
    });
    return;
  }

  // Verify HMAC-SHA256 signature
  const isValid = verifyRazorpaySignature(orderId, paymentId, signature);

  if (!isValid) {
    // Signature mismatch: return 400, do NOT mark as paid
    res.status(400).json({
      success: false,
      error: 'Invalid payment signature. Verification failed.',
    });
    return;
  }

  // Audit log the verified payment
  logAudit(
    'system',
    'standard_checkout',
    'payment_verified',
    `Payment ${paymentId} verified for order ${orderId}`,
    'approved',
    undefined,
    { order_id: orderId, payment_id: paymentId }
  );

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    order_id: orderId,
    payment_id: paymentId,
  });
}

/**
 * Helper endpoint to securely provide public Key ID to frontend
 * (Never returns KEY_SECRET)
 */
export function getKeyIdHandler(_req: Request, res: Response) {
  res.json({
    key_id: config.RAZORPAY_KEY_ID,
  });
}
