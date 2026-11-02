import { Mark, mergeAttributes } from '@tiptap/core';

export interface SpoilerOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const Spoiler = Mark.create<SpoilerOptions>({
  name: 'spoiler',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      isSpoiler: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-spoiler') === 'true',
        renderHTML: (attributes) => ({
          'data-spoiler': attributes.isSpoiler ? 'true' : 'false',
        }),
      },
      severity: {
        default: 'mild',
        parseHTML: (element) => element.getAttribute('data-severity') || 'mild',
        renderHTML: (attributes) => ({
          'data-severity': attributes.severity,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="spoiler"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': 'spoiler' }, this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

