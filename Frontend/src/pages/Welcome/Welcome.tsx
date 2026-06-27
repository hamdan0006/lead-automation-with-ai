import useAuthStore from '../../stores/useAuthStore';

export default function Welcome() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome, {user?.firstName}!
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            Your account has been created successfully. An administrator will review your account and grant you access soon.
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Your current role is <span className="font-semibold">Viewer</span>. Contact an admin to upgrade your access.
          </p>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <p><span className="font-medium text-gray-700 dark:text-gray-300">Email:</span> {user?.email}</p>
          <p className="mt-1"><span className="font-medium text-gray-700 dark:text-gray-300">Username:</span> {user?.username}</p>
        </div>

        <button
          onClick={logout}
          className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
