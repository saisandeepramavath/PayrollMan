import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils';
import { Button } from './Button';
import { useTheme } from '../../contexts/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { colors } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-2xl border shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-150',
          colors.card.bg,
          colors.card.border,
          className
        )}
      >
        {title && (
          <div className={cn('flex items-center justify-between px-6 py-5 border-b', colors.border.default)}>
            <h2 className={cn('text-base font-semibold', colors.text.primary)}>{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="!p-1.5 rounded-lg">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
