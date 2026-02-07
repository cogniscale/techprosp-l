import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { CENTRAL_OVERHEAD, TARYN_SHARE_PERCENT } from "@/lib/calculations";

interface ProfitPoolCardProps {
  grossProfit: number;
  profitPool: number;
  tarynShare: number;
}

export function ProfitPoolCard({
  grossProfit,
  profitPool,
  tarynShare,
}: ProfitPoolCardProps) {
  return (
    <div className="rounded-lg border border-tp-light-grey bg-white">
      <div className="p-6 border-b border-tp-light-grey">
        <h3 className="text-base font-semibold text-tp-dark font-heading">Profit Summary</h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Gross Profit */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-tp-dark-grey">Gross Profit</span>
          <CurrencyDisplay amount={grossProfit} className="text-lg font-semibold text-tp-dark" />
        </div>

        {/* Central Overhead */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-tp-light">
          <span className="text-sm text-tp-dark-grey">Less: Central Overhead</span>
          <CurrencyDisplay amount={-CENTRAL_OVERHEAD} className="text-sm font-medium text-tp-dark-grey" />
        </div>

        <div className="border-t border-tp-light-grey" />

        {/* Profit Pool */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-tp-dark">Profit Pool</span>
          <CurrencyDisplay
            amount={profitPool}
            className="text-xl font-semibold text-tp-dark"
          />
        </div>

        {/* Taryn's Share */}
        <div className="rounded-lg bg-tp-green/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-tp-dark">Taryn's Share</span>
              <span className="ml-1 text-xs text-tp-dark-grey">({TARYN_SHARE_PERCENT}%)</span>
            </div>
            <CurrencyDisplay
              amount={tarynShare}
              className="text-lg font-semibold text-tp-green"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
