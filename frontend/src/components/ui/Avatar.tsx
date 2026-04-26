import { cn } from '../../utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

const COLORS = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
];

function getColor(name: string) {
  const index = name.charCodeAt(0) % COLORS.length;
  return COLORS[index];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const color = getColor(name);
  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold flex-shrink-0',
        sizes[size],
        color,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
