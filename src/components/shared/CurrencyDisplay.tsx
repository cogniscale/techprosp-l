import { cn } from "@/lib/utils";
import { formatGBP, formatGBPRounded } from "@/lib/formatters";

interface CurrencyDisplayProps {
  amount: number;
  rounded?: boolean;
  className?: string;
  showSign?: boolean;
}

export function CurrencyDisplay({
  amount,
  rounded = false,
  className,
  showSign = false,
}: CurrencyDisplayProps) {
  const formatted = rounded ? formatGBPRounded(amount) : formatGBP(amount);
  const isNegative = amount < 0;
  const isPositive = amount > 0;

  return (
    <span
      className={cn(
        "tabular-nums",
        {
          "text-error": isNegative,
          "text-success": showSign && isPositive,
        },
        className
      )}
    >
      {showSign && isPositive && "+"}
      {formatted}
    </span>
  );
}
