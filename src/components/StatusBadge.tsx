import { AuthorizationStatus, STATUS_LABELS, STATUS_COLORS } from '../types';

interface StatusBadgeProps {
  status: AuthorizationStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]} ${className}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
