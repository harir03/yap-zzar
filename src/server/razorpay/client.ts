import Razorpay from 'razorpay';
import { config } from '../config.js';

// ponytail: one instance, reused everywhere
export const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});
