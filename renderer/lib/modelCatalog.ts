import type { CatalogModel, ModelTag } from '@/types/model';

// ASSUMPTION: This remains a curated, recommendation-oriented subset of major free/open Ollama models, not an exhaustive mirror of every library entry.
export const MODEL_CATALOG: CatalogModel[] = [
  {
    id: 'llama3.2:1b',
    name: 'Llama 3.2 1B',
    family: 'Llama',
    publisher: 'Meta',
    paramsBillion: 1,
    diskGB: 0.7,
    ramRequiredGB: 2,
    tags: ['fast', 'chat'],
    description: 'Tiny Llama variant suited for quick local chat and low-memory devices.',
    contextLength: 8192,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    family: 'Llama',
    publisher: 'Meta',
    paramsBillion: 3,
    diskGB: 1.9,
    ramRequiredGB: 4,
    tags: ['chat'],
    description: 'Balanced small model with better conversational quality than 1B variants.',
    contextLength: 8192,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    family: 'Llama',
    publisher: 'Meta',
    paramsBillion: 8,
    diskGB: 4.7,
    ramRequiredGB: 8,
    tags: ['chat', 'reasoning'],
    description: 'General-purpose local assistant with strong quality-to-speed ratio.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'llama3.1:70b',
    name: 'Llama 3.1 70B',
    family: 'Llama',
    publisher: 'Meta',
    paramsBillion: 70,
    diskGB: 40,
    ramRequiredGB: 48,
    tags: ['large', 'reasoning'],
    description: 'High-capability Llama tier for advanced reasoning and long-form tasks.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'llama3.3:70b',
    name: 'Llama 3.3 70B',
    family: 'Llama',
    publisher: 'Meta',
    paramsBillion: 70,
    diskGB: 43,
    ramRequiredGB: 48,
    tags: ['large', 'reasoning', 'chat'],
    description: 'Newest 70B Llama generation tuned for conversational quality and reasoning.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'mistral:7b',
    name: 'Mistral 7B',
    family: 'Mistral',
    publisher: 'Mistral AI',
    paramsBillion: 7,
    diskGB: 4.1,
    ramRequiredGB: 8,
    tags: ['chat', 'fast'],
    description: 'Fast and compact model that performs well for everyday assistance.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'mistral-nemo:12b',
    name: 'Mistral Nemo 12B',
    family: 'Mistral',
    publisher: 'Mistral AI',
    paramsBillion: 12,
    diskGB: 7.1,
    ramRequiredGB: 12,
    tags: ['chat', 'multilingual'],
    description: 'Strong multilingual assistant model with good factuality and instruction following.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'mixtral:8x7b',
    name: 'Mixtral 8x7B',
    family: 'Mistral',
    publisher: 'Mistral AI',
    paramsBillion: 47,
    diskGB: 26,
    ramRequiredGB: 32,
    tags: ['reasoning', 'large'],
    description: 'Mixture-of-experts model with strong reasoning and broad general utility.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'phi3:mini',
    name: 'Phi-3 Mini',
    family: 'Phi',
    publisher: 'Microsoft',
    paramsBillion: 3.8,
    diskGB: 2.3,
    ramRequiredGB: 4,
    tags: ['fast', 'coding'],
    description: 'Lightweight coding-friendly model optimized for responsiveness.',
    contextLength: 128000,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'phi3:medium',
    name: 'Phi-3 Medium',
    family: 'Phi',
    publisher: 'Microsoft',
    paramsBillion: 14,
    diskGB: 8,
    ramRequiredGB: 16,
    tags: ['coding', 'reasoning'],
    description: 'Higher-capacity Phi model for coding, planning, and technical reasoning.',
    contextLength: 128000,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'phi4:14b',
    name: 'Phi-4 14B',
    family: 'Phi',
    publisher: 'Microsoft',
    paramsBillion: 14,
    diskGB: 8.9,
    ramRequiredGB: 16,
    tags: ['coding', 'reasoning'],
    description: 'Improved Phi generation focused on robust code and analytical tasks.',
    contextLength: 128000,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'phi4-mini:3.8b',
    name: 'Phi-4 Mini 3.8B',
    family: 'Phi',
    publisher: 'Microsoft',
    paramsBillion: 3.8,
    diskGB: 2.6,
    ramRequiredGB: 4,
    tags: ['fast', 'coding', 'reasoning'],
    description: 'Compact Phi-4 release with stronger multilingual and coding behavior per watt.',
    contextLength: 128000,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'phi4-reasoning:14b',
    name: 'Phi-4 Reasoning 14B',
    family: 'Phi',
    publisher: 'Microsoft',
    paramsBillion: 14,
    diskGB: 9.2,
    ramRequiredGB: 16,
    tags: ['reasoning', 'coding'],
    description: 'Reasoning-specialized Phi-4 variant for chain-of-thought-heavy tasks.',
    contextLength: 128000,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'qwen2.5:3b',
    name: 'Qwen 2.5 3B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 3,
    diskGB: 1.9,
    ramRequiredGB: 4,
    tags: ['chat', 'multilingual'],
    description: 'Small multilingual Qwen model for chat and assistant use-cases.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'qwen2.5:7b',
    name: 'Qwen 2.5 7B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 7,
    diskGB: 4.4,
    ramRequiredGB: 8,
    tags: ['chat', 'coding'],
    description: 'General-purpose Qwen model with solid coding and chat ability.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'qwen2.5:14b',
    name: 'Qwen 2.5 14B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 14,
    diskGB: 8,
    ramRequiredGB: 16,
    tags: ['reasoning', 'coding'],
    description: 'Large Qwen tier for stronger problem-solving and code generation.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'qwen2.5-coder:7b',
    name: 'Qwen 2.5 Coder 7B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 7,
    diskGB: 4.3,
    ramRequiredGB: 8,
    tags: ['coding'],
    description: 'Code-specialized Qwen model tuned for completion and refactoring.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'qwen2.5-coder:14b',
    name: 'Qwen 2.5 Coder 14B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 14,
    diskGB: 8.6,
    ramRequiredGB: 16,
    tags: ['coding'],
    description: 'Higher-capacity coder model for larger repositories and complex edits.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'qwen3:8b',
    name: 'Qwen 3 8B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 8,
    diskGB: 4.9,
    ramRequiredGB: 10,
    tags: ['chat', 'reasoning', 'coding'],
    description: 'Latest dense Qwen generation tuned for strong general-purpose and reasoning quality.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'qwen3:14b',
    name: 'Qwen 3 14B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 14,
    diskGB: 8.9,
    ramRequiredGB: 16,
    tags: ['reasoning', 'coding', 'multilingual'],
    description: 'Higher-capacity Qwen 3 model for deeper technical and multilingual workloads.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'qwen3.5:9b',
    name: 'Qwen 3.5 9B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 9,
    diskGB: 5.8,
    ramRequiredGB: 10,
    tags: ['chat', 'reasoning', 'vision', 'multilingual'],
    description: 'New multimodal Qwen line with strong utility across text and visual prompting.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'qwen3-coder-next:30b',
    name: 'Qwen 3 Coder Next 30B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 30,
    diskGB: 18.5,
    ramRequiredGB: 24,
    tags: ['coding', 'reasoning', 'large'],
    description: 'Latest Qwen coder branch focused on agentic software workflows and long-context coding.',
    contextLength: 262144,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'gemma2:2b',
    name: 'Gemma 2 2B',
    family: 'Gemma',
    publisher: 'Google',
    paramsBillion: 2,
    diskGB: 1.6,
    ramRequiredGB: 4,
    tags: ['fast', 'chat'],
    description: 'Small Gemma model for lightweight local assistant workflows.',
    contextLength: 8192,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'gemma2:9b',
    name: 'Gemma 2 9B',
    family: 'Gemma',
    publisher: 'Google',
    paramsBillion: 9,
    diskGB: 5.4,
    ramRequiredGB: 10,
    tags: ['chat', 'reasoning'],
    description: 'Balanced Gemma model for instruction following and reasoning tasks.',
    contextLength: 8192,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'gemma2:27b',
    name: 'Gemma 2 27B',
    family: 'Gemma',
    publisher: 'Google',
    paramsBillion: 27,
    diskGB: 16,
    ramRequiredGB: 20,
    tags: ['reasoning', 'large'],
    description: 'Large Gemma tier for heavier inference workloads.',
    contextLength: 8192,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'gemma3:4b',
    name: 'Gemma 3 4B',
    family: 'Gemma',
    publisher: 'Google',
    paramsBillion: 4,
    diskGB: 2.6,
    ramRequiredGB: 6,
    tags: ['chat', 'fast', 'vision'],
    description: 'Modern Gemma generation optimized for single-device multimodal usage.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'gemma4:e2b',
    name: 'Gemma 4 E2B',
    family: 'Gemma',
    publisher: 'Google',
    paramsBillion: 2,
    diskGB: 2.1,
    ramRequiredGB: 5,
    tags: ['fast', 'chat', 'vision'],
    description: 'Efficient Gemma 4 entry tier for laptop-class local assistants and multimodal prompts.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'gemma4:e4b',
    name: 'Gemma 4 E4B',
    family: 'Gemma',
    publisher: 'Google',
    paramsBillion: 4,
    diskGB: 4.4,
    ramRequiredGB: 8,
    tags: ['chat', 'reasoning', 'vision'],
    description: 'Balanced Gemma 4 tier with stronger reasoning while staying practical on a single GPU.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'gemma4:26b',
    name: 'Gemma 4 26B',
    family: 'Gemma',
    publisher: 'Google',
    paramsBillion: 26,
    diskGB: 16.8,
    ramRequiredGB: 22,
    tags: ['reasoning', 'coding', 'vision', 'large'],
    description: 'Frontier Gemma release designed for high-quality agentic, coding, and multimodal reasoning.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'gemma4:31b',
    name: 'Gemma 4 31B',
    family: 'Gemma',
    publisher: 'Google',
    paramsBillion: 31,
    diskGB: 20.2,
    ramRequiredGB: 26,
    tags: ['reasoning', 'coding', 'vision', 'large'],
    description: 'Highest-capacity Gemma 4 option for heavy local reasoning and agent workflows.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'deepseek-r1:7b',
    name: 'DeepSeek R1 7B',
    family: 'DeepSeek',
    publisher: 'DeepSeek',
    paramsBillion: 7,
    diskGB: 4.7,
    ramRequiredGB: 8,
    tags: ['reasoning', 'coding'],
    description: 'Reasoning-focused model that performs well on coding and logic prompts.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'deepseek-r1:14b',
    name: 'DeepSeek R1 14B',
    family: 'DeepSeek',
    publisher: 'DeepSeek',
    paramsBillion: 14,
    diskGB: 9,
    ramRequiredGB: 16,
    tags: ['reasoning', 'coding'],
    description: 'Higher-accuracy reasoning model with strong technical output quality.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'deepseek-r1:32b',
    name: 'DeepSeek R1 32B',
    family: 'DeepSeek',
    publisher: 'DeepSeek',
    paramsBillion: 32,
    diskGB: 19,
    ramRequiredGB: 24,
    tags: ['reasoning', 'large'],
    description: 'Large DeepSeek reasoning tier for difficult analytical tasks.',
    contextLength: 32768,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'deepseek-coder-v2:16b',
    name: 'DeepSeek Coder V2 16B',
    family: 'DeepSeek',
    publisher: 'DeepSeek',
    paramsBillion: 16,
    diskGB: 9.1,
    ramRequiredGB: 16,
    tags: ['coding'],
    description: 'Code-first model tuned for generation, explanation, and repair tasks.',
    contextLength: 16384,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'deepseek-v3.2:37b',
    name: 'DeepSeek V3.2 37B-Active',
    family: 'DeepSeek',
    publisher: 'DeepSeek',
    paramsBillion: 37,
    diskGB: 24,
    ramRequiredGB: 30,
    tags: ['reasoning', 'coding', 'large'],
    description: 'Latest DeepSeek V3 line balancing stronger reasoning quality with compute efficiency.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'codellama:7b',
    name: 'Code Llama 7B',
    family: 'Code Llama',
    publisher: 'Meta',
    paramsBillion: 7,
    diskGB: 3.8,
    ramRequiredGB: 8,
    tags: ['coding'],
    description: 'Classic code model that remains practical for local development tasks.',
    contextLength: 16384,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'codellama:13b',
    name: 'Code Llama 13B',
    family: 'Code Llama',
    publisher: 'Meta',
    paramsBillion: 13,
    diskGB: 7.4,
    ramRequiredGB: 16,
    tags: ['coding'],
    description: 'Higher-quality Code Llama variant for larger files and deeper edits.',
    contextLength: 16384,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'starcoder2:3b',
    name: 'StarCoder2 3B',
    family: 'StarCoder2',
    publisher: 'BigCode',
    paramsBillion: 3,
    diskGB: 1.7,
    ramRequiredGB: 4,
    tags: ['coding', 'fast'],
    description: 'Small and responsive coding model for autocomplete and snippets.',
    contextLength: 16384,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'starcoder2:7b',
    name: 'StarCoder2 7B',
    family: 'StarCoder2',
    publisher: 'BigCode',
    paramsBillion: 7,
    diskGB: 4,
    ramRequiredGB: 8,
    tags: ['coding'],
    description: 'General coding model with strong utility for repository-level context.',
    contextLength: 16384,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'starcoder2:15b',
    name: 'StarCoder2 15B',
    family: 'StarCoder2',
    publisher: 'BigCode',
    paramsBillion: 15,
    diskGB: 9.5,
    ramRequiredGB: 16,
    tags: ['coding', 'reasoning'],
    description: 'Largest StarCoder2 tier for high-fidelity code generation and repository understanding.',
    contextLength: 16384,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'nomic-embed-text',
    name: 'Nomic Embed Text',
    family: 'Nomic',
    publisher: 'Nomic AI',
    paramsBillion: 0.137,
    diskGB: 0.27,
    ramRequiredGB: 2,
    tags: ['embedding'],
    description: 'Efficient embedding model for semantic search and retrieval tasks.',
    contextLength: 8192,
    license: 'open',
    quantization: 'F16'
  },
  {
    id: 'mxbai-embed-large',
    name: 'MXBAI Embed Large',
    family: 'Mixedbread',
    publisher: 'Mixedbread',
    paramsBillion: 0.334,
    diskGB: 0.67,
    ramRequiredGB: 2,
    tags: ['embedding'],
    description: 'High-quality embedding model for ranking, search, and retrieval.',
    contextLength: 8192,
    license: 'open',
    quantization: 'F16'
  },
  {
    id: 'nomic-embed-text-v2-moe',
    name: 'Nomic Embed Text V2 MoE',
    family: 'Nomic',
    publisher: 'Nomic AI',
    paramsBillion: 0.6,
    diskGB: 1.1,
    ramRequiredGB: 3,
    tags: ['embedding', 'multilingual'],
    description: 'Newer multilingual MoE embedding model for retrieval and semantic ranking.',
    contextLength: 8192,
    license: 'open',
    quantization: 'F16'
  },
  {
    id: 'snowflake-arctic-embed2:568m',
    name: 'Snowflake Arctic Embed 2',
    family: 'Snowflake',
    publisher: 'Snowflake',
    paramsBillion: 0.568,
    diskGB: 1.2,
    ramRequiredGB: 3,
    tags: ['embedding', 'multilingual'],
    description: 'Frontier embedding refresh with stronger multilingual retrieval performance.',
    contextLength: 8192,
    license: 'open',
    quantization: 'F16'
  },
  {
    id: 'qwen3-embedding:4b',
    name: 'Qwen 3 Embedding 4B',
    family: 'Qwen',
    publisher: 'Alibaba',
    paramsBillion: 4,
    diskGB: 2.8,
    ramRequiredGB: 6,
    tags: ['embedding', 'multilingual'],
    description: 'Qwen3 embedding line delivering robust cross-lingual search and matching quality.',
    contextLength: 32768,
    license: 'open',
    quantization: 'F16'
  },
  {
    id: 'llava:7b',
    name: 'LLaVA 7B',
    family: 'LLaVA',
    publisher: 'LLaVA',
    paramsBillion: 7,
    diskGB: 4.2,
    ramRequiredGB: 10,
    tags: ['vision', 'chat'],
    description: 'Vision-language model for image understanding and conversational tasks.',
    contextLength: 8192,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'bakllava:7b',
    name: 'BakLLaVA 7B',
    family: 'LLaVA',
    publisher: 'Skunkworks',
    paramsBillion: 7,
    diskGB: 4,
    ramRequiredGB: 10,
    tags: ['vision', 'chat'],
    description: 'Compact multimodal model for local image+text experiments.',
    contextLength: 8192,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'mistral-small3.2:24b',
    name: 'Mistral Small 3.2 24B',
    family: 'Mistral',
    publisher: 'Mistral AI',
    paramsBillion: 24,
    diskGB: 14.8,
    ramRequiredGB: 20,
    tags: ['reasoning', 'chat', 'vision', 'large'],
    description: 'Latest Mistral Small update with stronger instruction-following and multimodal understanding.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'devstral-small-2:24b',
    name: 'Devstral Small 2 24B',
    family: 'Mistral',
    publisher: 'Mistral AI',
    paramsBillion: 24,
    diskGB: 15.2,
    ramRequiredGB: 20,
    tags: ['coding', 'reasoning', 'large'],
    description: 'Coding-agent-focused Mistral line tuned for tool use and repository editing workflows.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  },
  {
    id: 'gpt-oss:20b',
    name: 'GPT-OSS 20B',
    family: 'GPT-OSS',
    publisher: 'Open Source Community',
    paramsBillion: 20,
    diskGB: 12.4,
    ramRequiredGB: 18,
    tags: ['reasoning', 'coding', 'chat', 'large'],
    description: 'Open-weight GPT-OSS line targeting reasoning-heavy and agentic developer use cases.',
    contextLength: 131072,
    license: 'open',
    quantization: 'Q4_K_M'
  }
];

export function getCatalogModel(id: string): CatalogModel | undefined {
  return MODEL_CATALOG.find((model) => model.id === id);
}

export function getCatalogByTag(tag: ModelTag): CatalogModel[] {
  return MODEL_CATALOG.filter((model) => model.tags.includes(tag));
}

export function getCatalogByFamily(family: string): CatalogModel[] {
  const normalized = family.trim().toLowerCase();
  return MODEL_CATALOG.filter((model) => model.family.toLowerCase() === normalized);
}

function normalizeModelId(value: string): string {
  return value.trim().toLowerCase();
}

function splitModelId(value: string): { base: string; tag: string } {
  const normalized = normalizeModelId(value);
  const [base, tag] = normalized.split(':');
  return {
    base,
    tag: tag ?? 'latest'
  };
}

function idsAreEquivalent(leftId: string, rightId: string): boolean {
  const left = splitModelId(leftId);
  const right = splitModelId(rightId);

  if (left.base !== right.base) {
    return false;
  }

  if (left.tag === right.tag) {
    return true;
  }

  return left.tag === 'latest' || right.tag === 'latest';
}

export function isCatalogModelDownloaded(catalogId: string, installedIds: Iterable<string>): boolean {
  for (const installedId of installedIds) {
    if (idsAreEquivalent(catalogId, installedId)) {
      return true;
    }
  }

  return false;
}

export function resolveInstalledModelId(
  catalogId: string,
  installedModels: Array<{ id: string; name?: string }>
): string {
  const exact = installedModels.find((model) => normalizeModelId(model.id) === normalizeModelId(catalogId));
  if (exact) {
    return exact.id;
  }

  const wanted = splitModelId(catalogId);
  const sameBase = installedModels.filter((model) => splitModelId(model.id).base === wanted.base);

  if (sameBase.length === 0) {
    return catalogId;
  }

  const sameTag = sameBase.find((model) => splitModelId(model.id).tag === wanted.tag);
  if (sameTag) {
    return sameTag.id;
  }

  const latest = sameBase.find((model) => splitModelId(model.id).tag === 'latest');
  return latest?.id ?? sameBase[0].id;
}

export function getCatalogModelForInstalledId(installedId: string): CatalogModel | undefined {
  return MODEL_CATALOG.find((catalog) => idsAreEquivalent(catalog.id, installedId));
}

/**
 * Returns display-oriented CPU/GPU memory requirements for a model.
 */
export function getModelMemoryRequirements(model: CatalogModel): {
  cpuRamRequiredGB: number;
  gpuVramRequiredGB: number;
} {
  const cpuRamRequiredGB = model.cpuRamRequiredGB ?? model.ramRequiredGB;

  if (typeof model.gpuVramRequiredGB === 'number') {
    return {
      cpuRamRequiredGB,
      gpuVramRequiredGB: model.gpuVramRequiredGB
    };
  }

  const estimatedGpu = model.tags.includes('embedding')
    ? Math.max(1.5, model.ramRequiredGB * 0.5)
    : Math.max(2, model.ramRequiredGB * 0.65);

  return {
    cpuRamRequiredGB,
    gpuVramRequiredGB: Number(estimatedGpu.toFixed(1))
  };
}
