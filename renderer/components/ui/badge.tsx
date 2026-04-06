import type { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'success' | 'destructive';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/**
 * Renders a shadcn-style badge primitive.
 */
export function Badge({ className, variant = 'default', ...props }: BadgeProps): React.JSX.Element {
  const variantClass =
    variant === 'success'
      ? 'border-emerald-800 bg-emerald-950 text-emerald-300'
      : variant === 'destructive'
        ? 'border-red-800 bg-red-950 text-red-300'
        : 'border-zinc-700 bg-zinc-800 text-zinc-200';

  const classes = ['inline-flex items-center border px-2 py-0.5 text-xs', variantClass, className]
    .filter(Boolean)
    .join(' ');

  return <span className={classes} {...props} />;
}
