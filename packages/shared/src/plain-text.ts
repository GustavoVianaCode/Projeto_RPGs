import { TipTapNode } from './types';

/**
 * Extracts plain text from a TipTap AST node recursively.
 */
export function extractPlainText(node: TipTapNode | null | undefined): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  // If leaf text node
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text;
  }

  // If mention node
  if (node.type === 'mention') {
    const label =
      (node.attrs?.label as string) ||
      (node.attrs?.title as string) ||
      node.text ||
      '';
    return label ? (label.startsWith('@') ? label : `@${label}`) : '';
  }

  if (!node.content || !Array.isArray(node.content)) {
    return '';
  }

  const isBlock = [
    'doc',
    'paragraph',
    'heading',
    'blockquote',
    'codeBlock',
    'bulletList',
    'orderedList',
    'listItem',
    'table',
    'tableRow',
    'tableCell',
    'tableHeader',
  ].includes(node.type);

  const parts: string[] = [];
  for (const child of node.content) {
    const text = extractPlainText(child);
    if (text) {
      parts.push(text);
    }
  }

  const separator = isBlock ? ' ' : '';
  return parts.join(separator).replace(/\s+/g, ' ').trim();
}

/**
 * Extracts all unique target card IDs referenced in mention nodes or marks throughout the AST.
 */
export function extractMentionTargetIds(
  node: TipTapNode | null | undefined,
): string[] {
  const targetIds = new Set<string>();

  function traverse(n: TipTapNode | null | undefined) {
    if (!n || typeof n !== 'object') return;

    if (n.type === 'mention') {
      const targetId =
        (n.attrs?.id as string) ||
        (n.attrs?.targetCardId as string) ||
        '';
      if (targetId) {
        targetIds.add(targetId);
      }
    }

    if (n.marks && Array.isArray(n.marks)) {
      for (const mark of n.marks) {
        if (mark.type === 'mention') {
          const targetId =
            (mark.attrs?.id as string) ||
            (mark.attrs?.targetCardId as string) ||
            '';
          if (targetId) {
            targetIds.add(targetId);
          }
        }
      }
    }

    if (n.content && Array.isArray(n.content)) {
      for (const child of n.content) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return Array.from(targetIds);
}
