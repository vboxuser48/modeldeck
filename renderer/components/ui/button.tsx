import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'default' | 'outline' | 'destructive' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Renders a shadcn-style button primitive.
 */
export function Button({
  className,
  variant = 'default',
  type = 'button',
  ...props
}: ButtonProps): React.JSX.Element {
  const variantClass =
    variant === 'outline'
      ? 'border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-900'
      : variant === 'destructive'
        ? 'border border-red-800 bg-red-950 text-red-100 hover:bg-red-900'
        : variant === 'ghost'
          ? 'border border-transparent bg-transparent text-zinc-200 hover:bg-zinc-900'
          : 'border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800';

  const classes = ['inline-flex items-center gap-2 px-3 py-1.5 text-sm transition-colors disabled:opacity-50', variantClass, className]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classes} {...props} />;
}
