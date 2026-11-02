export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
  [key: string]: unknown;
}

export interface SanitizeWikiAstOptions {
  allowedCardIds?: Set<string>;
}

