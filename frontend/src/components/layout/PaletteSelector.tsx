import { ChevronDown } from 'lucide-react';
import { useTheme, type ColorPalette } from '../../contexts/ThemeContext';

const PALETTES: ColorPalette[] = ['slate', 'blue', 'purple', 'emerald', 'rose', 'amber'];

const PALETTE_COLORS: Record<ColorPalette, string> = {
  slate: '#475569',
  blue: '#3b82f6',
  purple: '#a855f7',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
};

export function PaletteSelector() {
  const { palette, setPalette, colors } = useTheme();

  return (
    <div className="relative group">
      <button
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${colors.button.secondary}`}
        title="Select color palette"
      >
        <div
          className="w-4 h-4 rounded-full border-2 border-white"
          style={{ backgroundColor: PALETTE_COLORS[palette] }}
        />
        <ChevronDown size={16} />
      </button>

      {/* Dropdown Menu */}
      <div className={`absolute right-0 mt-2 w-48 rounded-lg border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 ${colors.card.bg} ${colors.card.border}`}>
        <div className="p-3 space-y-2">
          {PALETTES.map((p) => (
            <button
              key={p}
              onClick={() => setPalette(p)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors capitalize ${
                palette === p
                  ? 'bg-indigo-600 text-white'
                  : `${colors.text.secondary} ${colors.bg.hover}`
              }`}
            >
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{
                  backgroundColor: PALETTE_COLORS[p],
                  borderColor: palette === p ? 'white' : PALETTE_COLORS[p],
                }}
              />
              <span className="text-sm font-medium">{p}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
