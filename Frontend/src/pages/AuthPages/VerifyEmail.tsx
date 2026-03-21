import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import toast from 'react-hot-toast';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'idle'>('verifying');
    const [email, setEmail] = useState('');
    const [isResending, setIsResending] = useState(false);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.56:3000';

    const hasAttempted = useRef(false);

    useEffect(() => {
        const verify = async () => {
            if (!token || hasAttempted.current) {
                if (!token) setStatus('idle');
                return;
            }

            hasAttempted.current = true;

            try {
                const response = await fetch(`${apiUrl}/api/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (response.ok) {
                    toast.success('Email verified successfully!');
                    setStatus('success');
                    // Auto redirect after a short delay
                    setTimeout(() => {
                        navigate('/login', { replace: true });
                    }, 2000);
                } else {
                    const data = await response.json();
                    toast.error(data.message || 'Verification failed');
                    setStatus('error');
                }
            } catch (e) {
                console.error(e);
                toast.error('An error occurred during verification');
                setStatus('error');
            }
        };

        verify();
    }, [token, navigate, apiUrl]);

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error('Please enter your email');
            return;
        }

        setIsResending(true);
        try {
            const response = await fetch(`${apiUrl}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                toast.success('Verification email resent successfully!');
                setEmail('');
            } else {
                const data = await response.json();
                toast.error(data.message || 'Failed to resend verification email');
            }
        } catch (e) {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center">
                {status === 'verifying' && (
                    <div className="space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verifying your email...</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Please wait while we confirm your email address.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Verified!</h2>
                        <p className="text-gray-500 dark:text-gray-400">Great! Your email has been successfully verified. Redirecting you to login...</p>
                    </div>
                )}

                {(status === 'error' || status === 'idle') && (
                    <div className="space-y-6">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Failed</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {status === 'idle'
                                    ? "Haven't verified your email yet? Enter your email below to receive a new link."
                                    : "The verification link may be invalid or expired. You can request a new link below."}
                            </p>
                        </div>

                        <form onSubmit={handleResend} className="space-y-4">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                required
                            />
                            <button
                                type="submit"
                                disabled={isResending}
                                className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-70"
                            >
                                {isResending ? 'Sending...' : 'Resend Verification Link'}
                            </button>
                        </form>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Link to="/login" className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
                                Back to Login
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
