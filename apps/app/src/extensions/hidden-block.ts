import { Node, mergeAttributes } from '@tiptap/core';

export interface HiddenBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const HiddenBlock = Node.create<HiddenBlockOptions>({
  name: 'hiddenBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      hidden: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-hidden') !== 'false',
        renderHTML: () => ({ 'data-hidden': 'true' }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="hidden-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'hidden-block' }, this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

