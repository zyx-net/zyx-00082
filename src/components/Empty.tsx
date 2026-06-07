import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function Empty({
  title = '暂无数据',
  description = '当前没有任何记录',
  className = '',
}: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      <Inbox className="h-16 w-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}
