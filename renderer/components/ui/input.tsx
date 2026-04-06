import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * Renders a shadcn-style input primitive.
 */
export function Input({ className, ...props }: InputProps): React.JSX.Element {
  const classes = [
    'h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-500',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return <input className={classes} {...props} />;
}
