import { TrendingUp, TrendingDown } from 'lucide-react';
import { marketIndices } from '../data/mockData';

/** Static Wall Street snapshot. No auto-scrolling; direction is never colour-only. */
export default function MarketStrip() {
  return (
    <section aria-label="Wall Street snapshot">
      <ul className="card flex flex-wrap gap-x-8 gap-y-2 p-4 list-none m-0" role="list">
        {marketIndices.map((idx) => {
          const up = idx.changePercent >= 0;
          const Trend = up ? TrendingUp : TrendingDown;
          return (
            <li key={idx.id} className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-600">{idx.name}</span>
              <span className="font-semibold text-neutral-800 tabular-nums">
                {idx.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${up ? 'text-success-700' : 'text-alert-600'}`}
              >
                <Trend className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">{up ? 'up' : 'down'}</span>
                {up ? '+' : '−'}{Math.abs(idx.changePercent).toFixed(2)}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
