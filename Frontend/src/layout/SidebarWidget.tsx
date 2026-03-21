import { Link } from "react-router";
import useAuthStore from "../stores/useAuthStore";

export default function SidebarWidget() {
  const { user } = useAuthStore();
  const plan = user?.plan?.toLowerCase() || "trial";

  const isPlus = plan === "plus";
  const isPro = plan === "pro";

  const title = isPlus ? "Pro Access Active" : "Become Pro Access";
  const description = isPlus
    ? "You have full access to all premium features."
    : "Try your experience for using more features.";

  const buttonText = isPlus ? null : isPro ? "Upgrade Pro" : "Upgrade Pro";

  return (
    <div className="mx-auto w-full max-w-60 my-4 px-3">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-5 shadow-lg shadow-brand-500/25 transition-all duration-300 dark:from-gray-800/40 dark:to-gray-900/40 dark:border dark:border-white/10 dark:shadow-none">

        {/* subtle shine - only visible in light mode or very subtle in dark */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 dark:opacity-30" />

        {/* decorative circles for dark mode */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl dark:block hidden" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl dark:block hidden" />

        {/* content */}
        <div
          className={`relative z-10 flex flex-col text-center ${isPlus ? "items-center gap-2" : "gap-3"
            }`}
        >
          <h3 className="text-base font-bold leading-tight text-white dark:text-gray-100">
            {title}
          </h3>

          <p className="text-sm text-white/80 dark:text-gray-400 leading-relaxed">
            {description}
          </p>

          {/* CTA only exists when needed */}
          {!isPlus && (
            <Link
              to="/pricing"
              className="
                relative overflow-hidden
                flex items-center justify-center gap-2
                rounded-xl px-4 py-2.5
                text-sm font-bold text-white
                backdrop-blur-md
                bg-white/20
                border border-white/30
                shadow-lg shadow-black/10
                transition-all duration-200
                hover:bg-white/30
                hover:shadow-xl
                active:scale-[0.98]
                dark:bg-brand-500/20
                dark:border-brand-500/30
                dark:hover:bg-brand-500/30
                dark:text-brand-400
              "
            >
              {/* glass highlight */}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/20 via-white/5 to-transparent dark:from-brand-500/10" />

              <span className="relative z-10">{buttonText}</span>
            </Link>

          )}
        </div>
      </div>
    </div>
  );
}
