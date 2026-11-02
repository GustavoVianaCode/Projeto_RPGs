import { sanitizeWikiAst } from './sanitize';
import { TipTapNode } from './types';

describe('sanitizeWikiAst', () => {
  const SECRET = 'SEGREDO123';

  it('should remove hiddenBlock nodes containing sensitive information', () => {
    const ast: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Public Lore summary.' }],
        },
        {
          type: 'hiddenBlock',
          content: [{ type: 'text', text: `Classified details: ${SECRET}` }],
        },
      ],
    };

    const sanitized = sanitizeWikiAst(ast);

    expect(sanitized).toBeDefined();
    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain('hiddenBlock');
    expect(sanitized?.content).toHaveLength(1);
    expect(sanitized?.content?.[0].content?.[0].text).toBe('Public Lore summary.');
  });

  it('should remove nodes containing a hidden mark', () => {
    const ast: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'The secret passphrase is ' },
            {
              type: 'text',
              text: SECRET,
              marks: [{ type: 'hidden' }],
            },
            { type: 'text', text: '.' },
          ],
        },
      ],
    };

    const sanitized = sanitizeWikiAst(ast);
    const serialized = JSON.stringify(sanitized);

    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain('"type":"hidden"');
    expect(sanitized?.content?.[0].content).toHaveLength(2);
  });

  it('should preserve spoiler nodes and inject semantic attribute isSpoiler', () => {
    const ast: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'spoiler',
          attrs: { severity: 'major' },
          content: [{ type: 'text', text: 'Darth Vader is Luke’s father.' }],
        },
      ],
    };

    const sanitized = sanitizeWikiAst(ast);

    expect(sanitized?.content?.[0].type).toBe('spoiler');
    expect(sanitized?.content?.[0].attrs?.isSpoiler).toBe(true);
    expect(sanitized?.content?.[0].attrs?.severity).toBe('major');
  });

  it('should preserve spoiler marks and inject semantic attribute isSpoiler', () => {
    const ast: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Snape kills Dumbledore',
              marks: [{ type: 'spoiler' }],
            },
          ],
        },
      ],
    };

    const sanitized = sanitizeWikiAst(ast);
    const marks = sanitized?.content?.[0].content?.[0].marks;

    expect(marks?.[0].type).toBe('spoiler');
    expect(marks?.[0].attrs?.isSpoiler).toBe(true);
  });

  it('should degrade restricted mentions to plain text', () => {
    const ast: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              attrs: { id: 'allowed-card-1', label: 'Gandalf' },
            },
            {
              type: 'mention',
              attrs: { id: 'hidden-gm-card-99', label: 'The Traitor' },
            },
          ],
        },
      ],
    };

    const allowedCardIds = new Set(['allowed-card-1']);
    const sanitized = sanitizeWikiAst(ast, { allowedCardIds });

    const p = sanitized?.content?.[0];
    expect(p?.content?.[0].type).toBe('mention');
    expect(p?.content?.[0].attrs?.id).toBe('allowed-card-1');

    // Restricted mention must degrade to plain text node
    expect(p?.content?.[1].type).toBe('text');
    expect(p?.content?.[1].text).toBe('@The Traitor');
  });

  it('should never mutate the input AST', () => {
    const ast: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'hiddenBlock',
          content: [{ type: 'text', text: SECRET }],
        },
      ],
    };

    const astClone = JSON.parse(JSON.stringify(ast));
    sanitizeWikiAst(ast);

    expect(ast).toEqual(astClone);
  });
});

