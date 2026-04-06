import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}
interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {}
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

/**
 * Renders a shadcn-style card primitive.
 */
export function Card({ className, ...props }: CardProps): React.JSX.Element {
  const classes = ['border border-zinc-800 bg-zinc-900', className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
}

/**
 * Renders a card header section.
 */
export function CardHeader({ className, ...props }: CardSectionProps): React.JSX.Element {
  const classes = ['border-b border-zinc-800 p-4', className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
}

/**
 * Renders a card title.
 */
export function CardTitle({ className, ...props }: CardTitleProps): React.JSX.Element {
  const classes = ['text-sm font-semibold tracking-wide text-zinc-100', className].filter(Boolean).join(' ');
  return <h2 className={classes} {...props} />;
}

/**
 * Renders a card content section.
 */
export function CardContent({ className, ...props }: CardSectionProps): React.JSX.Element {
  const classes = ['p-4', className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
}
