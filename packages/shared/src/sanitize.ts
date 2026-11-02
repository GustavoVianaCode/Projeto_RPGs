import { TipTapNode, TipTapMark, SanitizeWikiAstOptions } from './types';

/**
 * Sanitizes a TipTap/ProseMirror JSON AST for public wiki rendering.
 *
 * Rules:
 * - Completely purges nodes of type 'hiddenBlock' or 'hidden' (returns null).
 * - Completely purges nodes containing a 'hidden' mark (returns null).
 * - Preserves 'spoiler' nodes and marks, adding semantic attribute `isSpoiler: true`.
 * - Degrades mentions to plain text if the target card is restricted or not in allowedCardIds.
 * - Recursively processes child content.
 * - Never mutates the original node.
 */
export function sanitizeWikiAst(
  node: TipTapNode | null | undefined,
  options?: SanitizeWikiAstOptions,
): TipTapNode | null {
  if (!node || typeof node !== 'object') {
    return null;
  }

  // 1. Purge hidden node types
  if (node.type === 'hiddenBlock' || node.type === 'hidden') {
    return null;
  }

  // 2. Check marks for hidden
  if (node.marks && Array.isArray(node.marks)) {
    const hasHiddenMark = node.marks.some(
      (mark) => mark && (mark.type === 'hidden' || mark.type === 'hiddenBlock'),
    );
    if (hasHiddenMark) {
      return null;
    }
  }

  // 3. Handle mentions degradation if options.allowedCardIds is provided
  if (node.type === 'mention') {
    const targetId =
      (node.attrs?.id as string) ||
      (node.attrs?.targetCardId as string) ||
      '';

    if (options?.allowedCardIds && !options.allowedCardIds.has(targetId)) {
      const label =
        (node.attrs?.label as string) ||
        (node.attrs?.title as string) ||
        node.text ||
        '@mention';
      return {
        type: 'text',
        text: label.startsWith('@') ? label : `@${label}`,
      };
    }
  }

  // 4. Clone and process marks
  let processedMarks: TipTapMark[] | undefined;
  if (node.marks && Array.isArray(node.marks)) {
    processedMarks = node.marks.map((mark) => {
      if (mark.type === 'spoiler') {
        return {
          ...mark,
          attrs: {
            ...(mark.attrs || {}),
            isSpoiler: true,
          },
        };
      }
      return { ...mark };
    });
  }

  // 5. Clone and process attributes
  let processedAttrs = node.attrs ? { ...node.attrs } : undefined;
  if (node.type === 'spoiler') {
    processedAttrs = {
      ...processedAttrs,
      isSpoiler: true,
    };
  }

  // 6. Recursively process children
  let processedContent: TipTapNode[] | undefined;
  if (node.content && Array.isArray(node.content)) {
    const sanitizedChildren: TipTapNode[] = [];
    for (const child of node.content) {
      const sanitizedChild = sanitizeWikiAst(child, options);
      if (sanitizedChild !== null) {
        sanitizedChildren.push(sanitizedChild);
      }
    }
    processedContent = sanitizedChildren;
  }

  const result: TipTapNode = {
    ...node,
    ...(processedAttrs ? { attrs: processedAttrs } : {}),
    ...(processedMarks ? { marks: processedMarks } : {}),
    ...(processedContent !== undefined ? { content: processedContent } : {}),
  };

  return result;
}

