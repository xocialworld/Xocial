import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
  suffix?: string;
}

export function MetricCard({ title, value, change, trend, suffix = "" }: MetricCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-secondary-600">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold text-secondary-900">
            {formatNumber(value)}{suffix}
          </span>
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend === "up"
                ? "text-success-600"
                : trend === "down"
                ? "text-error-600"
                : "text-secondary-600"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4" />
            ) : trend === "down" ? (
              <TrendingDown className="h-4 w-4" />
            ) : null}
            <span>{Math.abs(change)}%</span>
          </div>
        </div>
        <div className="mt-2 h-8">
          {/* Sparkline placeholder */}
          <svg className="w-full h-full" viewBox="0 0 100 30">
            <path
              d="M0 20 Q 25 10, 50 15 T 100 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={
                trend === "up"
                  ? "text-success-500"
                  : trend === "down"
                  ? "text-error-500"
                  : "text-secondary-400"
              }
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

