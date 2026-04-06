import { KeyboardEvent } from 'react';

interface SimpleModeProps {
  value: string;
  disabled?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

/**
 * Renders simple prompt mode.
 */
export default function SimpleMode({
  value,
  disabled,
  textareaRef,
  onChange,
  onSubmit
}: SimpleModeProps): React.JSX.Element {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={disabled}
        className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-sans text-[15px] text-zinc-100 outline-none focus:border-zinc-500"
        placeholder="Type prompt. Press Enter to submit, Shift+Enter for newline."
      />
    </div>
  );
}
