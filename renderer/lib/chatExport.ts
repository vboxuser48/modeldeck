import type { ChatMessage } from '@/types/message';
import type { MessageRole } from '@/types/message';

interface ConversationExportContext {
  sessionId: string;
  sessionName: string;
  provider: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type ExportRoleFilter = MessageRole | 'all';

/**
 * Chooses a safe markdown code fence that won't collide with message content.
 */
function buildSafeFence(content: string): string {
  const matches: string[] = content.match(/`+/g) ?? [];
  const longest = matches.reduce((max, run) => Math.max(max, run.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}

/**
 * Converts one message to a markdown section with safe fenced content.
 */
function messageToMarkdown(message: ChatMessage): string {
  const role = message.role.toUpperCase();
  const fence = buildSafeFence(message.content);

  return [
    `## ${role}`,
    '',
    `${fence}`,
    message.content,
    `${fence}`,
    ''
  ].join('\n');
}

/**
 * Builds clean markdown transcript for the full conversation.
 */
export function exportConversationAsMarkdown(context: ConversationExportContext): string {
  const lines: string[] = [
    `# ${context.sessionName}`,
    '',
    `- Session ID: ${context.sessionId}`,
    `- Provider: ${context.provider}`,
    `- Model: ${context.modelId}`,
    `- Created: ${context.createdAt}`,
    `- Updated: ${context.updatedAt}`,
    ''
  ];

  for (const message of context.messages) {
    lines.push(messageToMarkdown(message));
  }

  return lines.join('\n').trim();
}

/**
 * Builds markdown transcript filtered by message role.
 */
export function exportConversationAsMarkdownByRole(
  context: ConversationExportContext,
  role: ExportRoleFilter
): string {
  const filteredMessages =
    role === 'all' ? context.messages : context.messages.filter((message) => message.role === role);

  return exportConversationAsMarkdown({
    ...context,
    messages: filteredMessages
  });
}

/**
 * Builds JSON transcript payload for download/export.
 */
export function exportConversationAsJson(context: ConversationExportContext): string {
  return JSON.stringify(
    {
      sessionId: context.sessionId,
      sessionName: context.sessionName,
      provider: context.provider,
      modelId: context.modelId,
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
      messages: context.messages
    },
    null,
    2
  );
}

/**
 * Builds a developer snippet from the latest user/assistant exchange.
 */
export function exportLatestSnippetAsMarkdown(context: ConversationExportContext): string {
  const lastAssistantIndex = [...context.messages]
    .reverse()
    .findIndex((message) => message.role === 'assistant');

  if (lastAssistantIndex === -1) {
    return '# Snippet\n\nNo assistant response available yet.';
  }

  const absoluteAssistantIndex = context.messages.length - 1 - lastAssistantIndex;
  const assistantMessage = context.messages[absoluteAssistantIndex];

  const userBeforeAssistant = [...context.messages.slice(0, absoluteAssistantIndex)]
    .reverse()
    .find((message) => message.role === 'user');

  const assistantFence = buildSafeFence(assistantMessage.content);
  const userFence = buildSafeFence(userBeforeAssistant?.content ?? '');

  const lines: string[] = [
    `# ${context.sessionName} Snippet`,
    '',
    `- Session ID: ${context.sessionId}`,
    `- Model: ${context.modelId}`,
    ''
  ];

  if (userBeforeAssistant) {
    lines.push('## Prompt');
    lines.push('');
    lines.push(userFence);
    lines.push(userBeforeAssistant.content);
    lines.push(userFence);
    lines.push('');
  }

  lines.push('## Response');
  lines.push('');
  lines.push(assistantFence);
  lines.push(assistantMessage.content);
  lines.push(assistantFence);

  return lines.join('\n').trim();
}
