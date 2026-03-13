import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'orange' | 'blue' | 'green' | 'red' | 'yellow';
  description?: string;
}

const colorClasses = {
  orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  green: 'bg-green-500/10 border-green-500/30 text-green-400',
  red: 'bg-red-500/10 border-red-500/30 text-red-400',
  yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
};

export function MetricCard({
  label,
  value,
  icon,
  trend,
  color = 'orange',
  description,
}: MetricCardProps) {
  return (
    <div className={`rounded-lg border p-6 transition-all hover:shadow-lg ${colorClasses[color]} bg-slate-900/40`}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm font-medium text-slate-300">{label}</div>
        <div className={`p-2 rounded-lg ${colorClasses[color]} bg-slate-900/80`}>{icon}</div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold text-white mb-1">{value}</div>
          {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}
