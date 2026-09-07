import React, { useState, useEffect } from 'react';
import {
  tokens,
  label,
  input,
  primaryBtn,
  primaryBtnDisabled,
  badge,
  badgeAccent,
  errorBanner,
  warnBanner,
  successBanner,
} from './theme';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

export function Checkout() {
  const [amountRupees, setAmountRupees] = useState<number>(250);
  const [status, setStatus] = useState<
    'idle' | 'creating' | 'open' | 'verifying' | 'success' | 'cancelled' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    payment_id: string;
    order_id: string;
  } | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>(
    import.meta.env.VITE_RAZORPAY_KEY_ID || '',
  );

  useEffect(() => {
    if (!razorpayKey) {
      fetch('/api/razorpay-key')
        .then((res) => res.json())
        .then((data) => {
          if (data.key_id) setRazorpayKey(data.key_id);
        })
        .catch(() => {});
    }
  }, [razorpayKey]);

  const handlePay = async () => {
    setErrorMsg(null);
    setSuccessData(null);

    const amountPaise = Math.round(amountRupees * 100);
    if (!amountRupees || amountPaise < 100) {
      setErrorMsg('Minimum checkout amount is ₹1.00 (100 paise).');
      return;
    }

    if (!window.Razorpay) {
      setErrorMsg('Razorpay SDK script is still loading. Please refresh or try again.');
      return;
    }

    try {
      setStatus('creating');

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `rcpt_${Date.now().toString().slice(-8)}`,
        }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.order_id) {
        setStatus('error');
        setErrorMsg(orderData.error || 'Failed to create Razorpay order.');
        return;
      }

      setStatus('open');

      const options = {
        key: razorpayKey || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'yap-zzar',
        description: 'Standard Web Checkout (Test Mode)',
        image: 'https://cdn.razorpay.com/static/assets/logo/rzp.png',
        order_id: orderData.order_id,
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          setStatus('verifying');
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              setStatus('success');
              setSuccessData({
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
              });
            } else {
              setStatus('error');
              setErrorMsg(
                verifyData.error || 'Payment signature verification failed.',
              );
            }
          } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(
              err instanceof Error
                ? err.message
                : 'Signature verification request failed.',
            );
          }
        },
        modal: {
          ondismiss: function () {
            setStatus('cancelled');
            setErrorMsg('Payment cancelled. Checkout window was closed.');
          },
        },
        prefill: {
          name: 'Rohan Sharma',
          email: 'rohan.sharma@example.com',
          contact: '9876543210',
        },
        theme: {
          color: tokens.accent,
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response: unknown) {
        const r = response as {
          error?: { description?: string; reason?: string };
        };
        setStatus('error');
        setErrorMsg(
          r.error?.description ||
            r.error?.reason ||
            'Payment failed at the gateway.',
        );
      });

      rzp.open();
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error ? err.message : 'Unexpected checkout error occurred.',
      );
    }
  };

  const busy =
    status === 'creating' || status === 'open' || status === 'verifying';

  return (
    <div style={styles.container}>
      <div style={styles.badgeRow}>
        <span style={badge}>Standard Web Checkout</span>
        <span style={badgeAccent}>Test Mode</span>
      </div>

      <div style={styles.formGroup}>
        <label style={label}>Checkout Amount (₹ INR)</label>
        <div style={styles.inputWrapper}>
          <span style={styles.currencySymbol}>₹</span>
          <input
            type="number"
            min="1"
            step="1"
            value={amountRupees}
            onChange={(e) => setAmountRupees(Math.max(1, Number(e.target.value)))}
            style={{ ...input, paddingLeft: 28 }}
            placeholder="250"
            disabled={busy}
          />
        </div>
      </div>

      <div style={styles.pillRow}>
        {[100, 250, 500, 1000].map((val) => (
          <button
            key={val}
            onClick={() => setAmountRupees(val)}
            style={{
              ...styles.pill,
              ...(amountRupees === val ? styles.pillActive : {}),
            }}
            type="button"
          >
            ₹{val}
          </button>
        ))}
      </div>

      <button
        onClick={() => void handlePay()}
        disabled={busy}
        style={{
          ...primaryBtn,
          ...(busy ? primaryBtnDisabled : {}),
        }}
      >
        {status === 'creating' && 'Creating Order…'}
        {status === 'open' && 'Checkout Modal Open…'}
        {status === 'verifying' && 'Verifying Signature…'}
        {status === 'idle' && `Pay ₹${amountRupees} with Razorpay`}
        {status === 'cancelled' && `Retry Pay ₹${amountRupees}`}
        {status === 'error' && `Try Again (₹${amountRupees})`}
        {status === 'success' && `Pay Another ₹${amountRupees}`}
      </button>

      {status === 'success' && successData && (
        <div style={successBanner}>
          <div style={styles.successTitle}>Payment Verified Successfully</div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Order ID:</span>
            <span style={styles.dataVal}>{successData.order_id}</span>
          </div>
          <div style={styles.dataRow}>
            <span style={styles.dataLabel}>Payment ID:</span>
            <span style={styles.dataVal}>{successData.payment_id}</span>
          </div>
          <div style={styles.successNote}>
            HMAC-SHA256 signature verified against Razorpay Key Secret.
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={status === 'cancelled' ? warnBanner : errorBanner}>
          <span>{status === 'cancelled' ? 'ℹ' : '⚠'}</span>
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  badgeRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  currencySymbol: {
    position: 'absolute',
    left: 12,
    color: tokens.muted,
    fontSize: 16,
    fontWeight: 600,
    zIndex: 1,
  },
  pillRow: {
    display: 'flex',
    gap: 8,
  },
  pill: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    background: tokens.surface2,
    border: `1px solid ${tokens.border}`,
    borderRadius: 20,
    color: tokens.text,
    cursor: 'pointer',
    fontFamily: tokens.font,
  },
  pillActive: {
    background: tokens.accent,
    borderColor: tokens.accent,
    color: tokens.bg,
  },
  successTitle: {
    color: tokens.accent,
    fontWeight: 600,
    fontSize: 14,
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  dataLabel: {
    color: tokens.muted,
  },
  dataVal: {
    color: tokens.text,
  },
  successNote: {
    fontSize: 11,
    color: tokens.muted,
    marginTop: 4,
  },
};
