import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function Checkout() {
  const [amountRupees, setAmountRupees] = useState<number>(250);
  const [status, setStatus] = useState<'idle' | 'creating' | 'open' | 'verifying' | 'success' | 'cancelled' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ payment_id: string; order_id: string } | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>(
    import.meta.env.VITE_RAZORPAY_KEY_ID || ''
  );

  // Fallback to fetch public Key ID from backend if not baked into Vite env
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

    // Validate minimum amount (100 paise = ₹1)
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

      // STEP 1: BACKEND - Create Order
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

      // STEP 2: FRONTEND - Open Razorpay Checkout Modal
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
          // STEP 3: BACKEND - Verify Signature
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
              setErrorMsg(verifyData.error || 'Payment signature verification failed.');
            }
          } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'Signature verification request failed.');
          }
        },
        modal: {
          // Handle modal dismiss (user cancelled)
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
          color: '#6366f1',
        },
      };

      const rzp = new window.Razorpay(options);

      // Handle payment.failed event
      rzp.on('payment.failed', function (response: any) {
        setStatus('error');
        setErrorMsg(
          response.error?.description ||
          response.error?.reason ||
          'Payment failed at the gateway.'
        );
      });

      rzp.open();
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Unexpected checkout error occurred.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.badgeRow}>
        <span style={styles.badge}>Standard Web Checkout</span>
        <span style={styles.modeBadge}>Test Mode</span>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Checkout Amount (₹ INR)</label>
        <div style={styles.inputWrapper}>
          <span style={styles.currencySymbol}>₹</span>
          <input
            type="number"
            min="1"
            step="1"
            value={amountRupees}
            onChange={(e) => setAmountRupees(Math.max(1, Number(e.target.value)))}
            style={styles.input}
            placeholder="250"
            disabled={status === 'creating' || status === 'open' || status === 'verifying'}
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
        onClick={handlePay}
        disabled={status === 'creating' || status === 'open' || status === 'verifying'}
        style={{
          ...styles.payButton,
          ...(status === 'creating' || status === 'open' || status === 'verifying'
            ? styles.payButtonDisabled
            : {}),
        }}
      >
        {status === 'creating' && '⏳ Creating Order...'}
        {status === 'open' && '💳 Checkout Modal Open...'}
        {status === 'verifying' && '🔐 Verifying Signature...'}
        {status === 'idle' && `Pay ₹${amountRupees} with Razorpay`}
        {status === 'cancelled' && `Retry Pay ₹${amountRupees}`}
        {status === 'error' && `Try Again (₹${amountRupees})`}
        {status === 'success' && `Pay Another ₹${amountRupees}`}
      </button>

      {/* Success Banner */}
      {status === 'success' && successData && (
        <div style={styles.successBanner}>
          <div style={styles.successTitle}>✅ Payment Verified Successfully</div>
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

      {/* Error / Cancelled Banner */}
      {errorMsg && (
        <div style={status === 'cancelled' ? styles.warningBanner : styles.errorBanner}>
          <span>{status === 'cancelled' ? 'ℹ️' : '⚠️'}</span>
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
  badge: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 6,
    background: '#27272a',
    color: '#a1a1aa',
    fontWeight: 500,
  },
  modeBadge: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 6,
    background: '#1e3a8a',
    color: '#93c5fd',
    fontWeight: 600,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: 500,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  currencySymbol: {
    position: 'absolute',
    left: 12,
    color: '#71717a',
    fontSize: 16,
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '10px 12px 10px 28px',
    background: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: 8,
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: 600,
    outline: 'none',
  },
  pillRow: {
    display: 'flex',
    gap: 8,
  },
  pill: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    background: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: 20,
    color: '#d4d4d8',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pillActive: {
    background: '#4f46e5',
    borderColor: '#6366f1',
    color: '#ffffff',
  },
  payButton: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    transition: 'transform 0.1s ease, opacity 0.15s ease',
  },
  payButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  successBanner: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  successTitle: {
    color: '#34d399',
    fontWeight: 600,
    fontSize: 14,
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  dataLabel: {
    color: '#a1a1aa',
  },
  dataVal: {
    color: '#f4f4f5',
  },
  successNote: {
    fontSize: 11,
    color: '#6ee7b7',
    marginTop: 4,
  },
  warningBanner: {
    background: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#fde047',
    fontSize: 13,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#fca5a5',
    fontSize: 13,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
};
