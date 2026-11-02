import {
  extractPlainText,
  extractPublicPlainText,
  extractMentionTargetIds,
} from './plain-text';
import { TipTapNode } from './types';

describe('plain-text extraction', () => {
  const SECRET = 'SEGREDO123';

  it('should extract plain text from nested nodes', () => {
    const ast: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Chapter One' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'mention',
              attrs: { id: 'card-1', label: 'Frodo' },
            },
            { type: 'text', text: ', welcome to the Shire.' },
          ],
        },
      ],
    };

    const text = extractPlainText(ast);
    expect(text).toBe('Chapter One Hello @Frodo , welcome to the Shire.');
  });

  it('MUST NOT leak SEGREDO123 in public plain text when placed in hiddenBlock or hidden marks', () => {
    const ast: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Public history of the kingdom.' },
            {
              type: 'text',
              text: ` GM Secret: ${SECRET}`,
              marks: [{ type: 'hidden' }],
            },
          ],
        },
        {
          type: 'hiddenBlock',
          content: [
            { type: 'text', text: `True murderer identity: ${SECRET}` },
          ],
        },
      ],
    };

    const publicText = extractPublicPlainText(ast);

    expect(publicText).not.toContain(SECRET);
    expect(publicText).toContain('Public history of the kingdom.');
  });

  it('should extract all mention targetCardIds deduplicated', () => {
    const ast: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              attrs: { id: 'card-a', label: 'Card A' },
            },
            { type: 'text', text: ' talks to ' },
            {
              type: 'mention',
              attrs: { targetCardId: 'card-b', label: 'Card B' },
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              attrs: { targetCardId: 'card-a', label: 'Card A again' },
            },
          ],
        },
      ],
    };

    const ids = extractMentionTargetIds(ast);
    expect(ids).toEqual(['card-a', 'card-b']);
  });
});

