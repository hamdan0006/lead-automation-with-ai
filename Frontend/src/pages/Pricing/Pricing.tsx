import React, { useState } from 'react';
import { Check, X, Star, Crown, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import { toast } from 'react-hot-toast';

interface Feature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ReactNode;
  features: Feature[];
}

interface PricingCardProps {
  plan: Plan;
  isPopular?: boolean;
  onSelectPlan: (plan: Plan) => void;
  currentPlan?: string;
  loading: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ 
  plan, 
  isPopular = false, 
  onSelectPlan, 
  currentPlan, 
  loading 
}) => {
  const isCurrentPlan = currentPlan === plan.id;

  return (
    <div className={`relative rounded-2xl border transition-all duration-300 hover:shadow-xl bg-white dark:bg-gray-800 ${
      isPopular
        ? 'border-brand-500 shadow-lg scale-105 dark:border-brand-400'
        : isCurrentPlan
          ? 'border-green-500 shadow-md dark:border-green-400'
          : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600'
    }`}>
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
            <Star className="h-4 w-4" />
            Most Popular
          </div>
        </div>
      )}

      <div className="p-8">
        {/* Plan Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            {plan.icon}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{plan.description}</p>
        </div>

        {/* Pricing */}
        <div className="text-center mb-6">
          {plan.id === 'trial' ? (
            <div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Free</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">14-day trial</div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center mb-2">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                <span className="text-lg text-gray-600 dark:text-gray-400 ml-1">/month</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Billed monthly</div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              {feature.included ? (
                <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <X className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              )}
              <span className={`text-sm ${feature.included ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-500'}`}>
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => onSelectPlan(plan)}
          disabled={loading || isCurrentPlan}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            isCurrentPlan
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : isPopular
                ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 shadow-lg'
                : 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600'
          }`}
        >
          {loading ? (
            'Processing...'
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : plan.id === 'trial' ? (
            <>
              <Clock className="h-4 w-4" />
              Start Free Trial
            </>
          ) : (
            <>
              Upgrade Now
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

interface AuthStoreUser {
  plan?: string;
  [key: string]: any; // For other user properties
}

interface AuthStore {
  user: AuthStoreUser | null;
  [key: string]: any; // For other store properties
}

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore() as AuthStore;
  const [loading, setLoading] = useState<boolean>(false);

  const plans: Plan[] = [
    {
      id: 'trial',
      name: 'Free Trial',
      description: '14-day free trial with limited access',
      price: 0,
      icon: <Clock className="h-8 w-8 text-blue-500" />,
      features: [
        { text: '14-day free trial', included: true },
        { text: '3 concurrent automations', included: true },
        { text: '500 profiles during trial', included: true },
        { text: 'Access to Trobs only (no Flows)', included: true },
        { text: 'LinkedIn + Twitter/X', included: true },
        { text: 'All export formats', included: true },
        { text: 'Email support', included: true },
        { text: 'No credit card required', included: true }
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Access to all Trobs automations',
      price: 39,
      icon: <Star className="h-8 w-8 text-purple-500" />,
      features: [
        { text: 'All Trobs access', included: true },
        { text: '3 concurrent automations', included: true },
        { text: '500 profiles/month', included: true },
        { text: 'No Flow access', included: false },
        { text: 'LinkedIn + Twitter/X', included: true },
        { text: 'All export formats', included: true },
        { text: 'Email support', included: true }
      ]
    },
    {
      id: 'plus',
      name: 'Plus',
      description: 'Full access to Trobs and Flows',
      price: 69,
      icon: <Crown className="h-8 w-8 text-yellow-500" />,
      features: [
        { text: 'All Trobs and Flows access', included: true },
        { text: '10 concurrent automations', included: true },
        { text: '2,000 profiles/month', included: true },
        { text: 'Flows access', included: true },
        { text: 'LinkedIn + Twitter/X', included: true },
        { text: 'All export formats', included: true },
        { text: 'Priority email support', included: true }
      ]
    }
  ];

  const handleSelectPlan = async (plan: Plan): Promise<void> => {
    if (!user) {
      toast.error('Please login to continue');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      if (plan.id === 'trial') {
        // Handle trial signup
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/billing/start-trial`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });

        if (response.ok) {
          toast.success('Trial started successfully! Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          throw new Error('Failed to start trial');
        }
      } else {
        // Handle paid plan - redirect to Stripe Checkout
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/billing/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            planId: plan.id,
            successUrl: `${window.location.origin}/dashboard?upgraded=true`,
            cancelUrl: `${window.location.origin}/pricing`
          })
        });

        const { checkoutUrl } = await response.json();
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          throw new Error('Failed to create checkout session');
        }
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast.error('Failed to process your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="text-center py-16 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-600">Growth Plan</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
          Scale your LinkedIn and Twitter/X automation with our flexible pricing plans.
          Start with a free trial and upgrade as you grow.
        </p>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            No setup fees
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Cancel anytime
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            14-day free trial
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-4">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isPopular={plan.id === 'plus'}
              onSelectPlan={handleSelectPlan}
              currentPlan={user?.plan?.toLowerCase()}
              loading={loading}
            />
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What happens during the free trial?</h3>
              <p className="text-gray-600 dark:text-gray-400">You get full access to Pro plan features for 14 days, including Smart Flows and AI personalization. No credit card required.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600 dark:text-gray-400">Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately with prorated billing.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What are Smart Flows?</h3>
              <p className="text-gray-600 dark:text-gray-400">Our AI-powered multi-step automation sequences that handle complex workflows like lead generation and nurturing automatically.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Do you offer refunds?</h3>
              <p className="text-gray-600 dark:text-gray-400">Yes, we offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your payment in full.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Is my data secure?</h3>
              <p className="text-gray-600 dark:text-gray-400">Absolutely. We use enterprise-grade encryption and security measures to protect your data and automation credentials.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Need help choosing?</h3>
              <p className="text-gray-600 dark:text-gray-400">Start with our free trial to test all features, then upgrade to the plan that fits your needs. Contact support for guidance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;