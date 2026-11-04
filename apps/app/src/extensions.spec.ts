import { Mention, Spoiler, HiddenBlock } from './extensions';

describe('TipTap Lore Custom Extensions', () => {
  it('should define Mention extension with correct configuration', () => {
    expect(Mention.name).toBe('mention');
    expect(Mention.type).toBe('node');
    const config = Mention.config;
    expect(config.inline).toBe(true);
    expect(config.group).toBe('inline');
    expect(config.atom).toBe(true);
    expect(config.selectable).toBe(false);
  });

  it('should define Spoiler mark with correct configuration', () => {
    expect(Spoiler.name).toBe('spoiler');
    expect(Spoiler.type).toBe('mark');
  });

  it('should define HiddenBlock node with correct configuration', () => {
    expect(HiddenBlock.name).toBe('hiddenBlock');
    expect(HiddenBlock.type).toBe('node');
  });
});

