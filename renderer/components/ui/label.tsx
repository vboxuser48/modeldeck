import type { LabelHTMLAttributes } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

/**
 * Renders a shadcn-style label primitive.
 */
export function Label({ className, ...props }: LabelProps): React.JSX.Element {
  const classes = ['text-xs font-medium uppercase tracking-wider text-zinc-400', className]
    .filter(Boolean)
    .join(' ');
  return <label className={classes} {...props} />;
}
