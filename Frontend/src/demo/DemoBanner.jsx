import { createPortal } from 'react-dom';

const IS_DEMO = import.meta.env.VITE_STATIC_DEMO === 'true';
const PORTFOLIO_URL = 'https://my-portfolio-khalif-amin.vercel.app/projects';
const STORAGE_KEYS = ['cosmatiqa-demo-db-v1', 'userProfile', 'analysisData'];

/** Shown only in the static demo build: says what is simulated and offers a reset. */
export default function DemoBanner() {
  if (!IS_DEMO) return null;

  const resetDemo = () => {
    if (!window.confirm('Reset the demo? This clears your profile and analysis results stored in this browser.')) return;
    try {
      STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // storage unavailable: nothing to clear
    }
    window.location.href = '/';
  };

  // Rendered outside #root so it spans the full width (the app's root has its own padding).
  const host = document.getElementById('demo-banner');
  if (!host) return null;

  return createPortal(
    <div role="note" className="bg-stone-900 px-4 py-2 text-xs leading-snug text-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span>Static demo: the analysis runs in your browser using the app's ingredient matrix, with no server or AI model.</span>
        <span className="flex items-center gap-4">
          <button type="button" onClick={resetDemo} className="underline underline-offset-2 hover:text-emerald-200">
            Reset demo
          </button>
          <a href={PORTFOLIO_URL} className="underline underline-offset-2 hover:text-emerald-200">
            Back to portfolio
          </a>
        </span>
      </div>
    </div>,
    host,
  );
}
