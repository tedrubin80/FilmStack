import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import api from '@/lib/api';
import {
  CreditCard,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  amount: number;
  currency: string;
  description: string;
  festivalId: number;
  filmId?: number;
  customerEmail?: string;
  customerName?: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

const CheckoutForm: React.FC<Omit<PaymentFormProps, 'onSuccess' | 'onError'> & {
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}> = ({
  amount,
  currency,
  description,
  festivalId,
  filmId,
  customerEmail,
  customerName,
  onSuccess,
  onError
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle');

  useEffect(() => {
    // Create PaymentIntent on component mount
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      const response = await api.post('/payments/create-intent', {
        amount,
        currency,
        description,
        festivalId,
        filmId,
        customerEmail,
        customerName,
      });

      const data = response.data;

      if (data.success) {
        setClientSecret(data.data.clientSecret);
      } else {
        onError('Failed to initialize payment');
      }
    } catch (error) {
      onError('Failed to initialize payment');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setPaymentStatus('processing');

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      onError('Card element not found');
      setIsLoading(false);
      setPaymentStatus('failed');
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: customerName,
          email: customerEmail,
        },
      },
    });

    if (error) {
      onError(error.message || 'Payment failed');
      setPaymentStatus('failed');
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
      setPaymentStatus('succeeded');
    }

    setIsLoading(false);
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  if (paymentStatus === 'succeeded') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600">Your payment has been processed successfully.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Payment Summary</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">{description}</span>
          <span className="font-semibold text-gray-900">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency.toUpperCase(),
            }).format(amount)}
          </span>
        </div>
      </div>

      {/* Customer Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Billing Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              defaultValue={customerName}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              defaultValue={customerEmail}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="john@example.com"
            />
          </div>
        </div>
      </div>

      {/* Card Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Card Information
        </h3>
        <div className="p-4 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Lock className="w-4 h-4" />
        <span>Your payment information is secure and encrypted</span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isLoading || !clientSecret}
        className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader className="animate-spin w-4 h-4 mr-2" />
            Processing Payment...
          </>
        ) : (
          `Pay ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
          }).format(amount)}`
        )}
      </button>

      {paymentStatus === 'failed' && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Payment failed. Please try again.</span>
        </div>
      )}
    </form>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Payment</h2>
        <p className="text-gray-600">
          Secure payment processing powered by Stripe
        </p>
      </div>

      <Elements stripe={stripePromise}>
        <CheckoutForm {...props} />
      </Elements>
    </div>
  );
};

export default PaymentForm;