import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: KPICardProps) {
  return (
    <div className="rounded-lg border border-tp-light-grey bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-tp-dark-grey">{title}</p>
        <Icon className="h-5 w-5 text-tp-dark-grey" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-tp-dark">{value}</p>
      {subtitle && (
        <p className="mt-1 text-sm text-tp-dark-grey">{subtitle}</p>
      )}
      {trend && (
        <p
          className={cn(
            "mt-2 text-sm font-medium",
            trend.isPositive ? "text-tp-green" : "text-error"
          )}
        >
          {trend.isPositive ? "+" : ""}{trend.value}% vs last month
        </p>
      )}
    </div>
  );
}
