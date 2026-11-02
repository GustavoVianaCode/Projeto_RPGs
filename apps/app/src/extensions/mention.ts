import { Node, mergeAttributes } from '@tiptap/core';

export interface MentionOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const Mention = Node.create<MentionOptions>({
  name: 'mention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { 'data-id': attributes.id };
        },
      },
      targetCardId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-target-card-id'),
        renderHTML: (attributes) => {
          if (!attributes.targetCardId) return {};
          return { 'data-target-card-id': attributes.targetCardId };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => {
          if (!attributes.label) return {};
          return { 'data-label': attributes.label };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="mention"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = node.attrs.label || node.attrs.id || 'Card';
    return [
      'span',
      mergeAttributes({ 'data-type': 'mention' }, this.options.HTMLAttributes, HTMLAttributes),
      `@${label}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label || node.attrs.id || 'Card'}`;
  },
});

