import type { ButtonHTMLAttributes } from 'react';

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * Renders a shadcn-style switch primitive.
 */
export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: SwitchProps): React.JSX.Element {
  const classes = [
    'relative inline-flex h-6 w-11 items-center border transition-colors',
    checked ? 'border-zinc-500 bg-zinc-700' : 'border-zinc-700 bg-zinc-900',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={classes}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span
        className={[
          'block h-4 w-4 bg-zinc-100 transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        ].join(' ')}
      />
    </button>
  );
}
