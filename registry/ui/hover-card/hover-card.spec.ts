import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';

describe('HoverCard', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses(
        'hover-card',
        registrySource('ui/hover-card/hover-card.ts'),
        {
          'origin-(--radix-hover-card-content-transform-origin) ': '',
          'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2':
            'data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2',
        },
      ),
    ).toEqual([]);
  });
});
