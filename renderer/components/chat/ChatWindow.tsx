import type { ChatMessage } from '@/types/message';
import type { StreamState } from '@/lib/streaming';
import type { Session } from '@/types/session';
import ChatContainer from './ChatContainer';

interface ChatWindowProps {
  messages: ChatMessage[];
  streamState: StreamState;
  session: Session;
}

/**
 * Renders the message thread viewport for one panel.
 */
export default function ChatWindow({ messages, streamState, session }: ChatWindowProps): React.JSX.Element {
  return <ChatContainer messages={messages} streamState={streamState} session={session} />;
}
