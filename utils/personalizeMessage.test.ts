import { describe, it, expect } from 'vitest';
import { personalize } from './personalizeMessage';
import { Child } from '../types';

describe('personalizeMessage', () => {
  const boyChild: Child = {
    id: 'child-1',
    parent_id: 'parent-1',
    name: 'თომა',
    avatar_id: 'avatar_1',
    gender: 'boy',
    created_at: '2026-01-01T00:00:00Z',
  };

  const girlChild: Child = {
    id: 'child-2',
    parent_id: 'parent-1',
    name: 'ნიტა',
    avatar_id: 'avatar_2',
    gender: 'girl',
    created_at: '2026-01-01T00:00:00Z',
  };

  it('replaces {name} and {gender} for a boy child', () => {
    const phrase = 'ყოჩაღ, {name} კაი {gender} ხარ';
    expect(personalize(phrase, boyChild)).toBe('ყოჩაღ, თომა კაი ბიჭი ხარ');
  });

  it('replaces {name} and {gender} for a girl child', () => {
    const phrase = 'ყოჩაღ, {name} კაი {gender} ხარ';
    expect(personalize(phrase, girlChild)).toBe('ყოჩაღ, ნიტა კაი გოგო ხარ');
  });

  it('uses neutral fallbacks when child is null', () => {
    const phrase = 'ყოჩაღ, {name} კაი {gender} ხარ';
    expect(personalize(phrase, null)).toBe('ყოჩაღ, ჩემპიონო კაი მოთამაშე ხარ');
  });

  it('replaces multiple occurrences with replaceAll', () => {
    const phrase = '{name}, შენ ხარ {gender}. {name}, ნამდვილი {gender}!';
    expect(personalize(phrase, boyChild)).toBe('თომა, შენ ხარ ბიჭი. თომა, ნამდვილი ბიჭი!');
    expect(personalize(phrase, girlChild)).toBe('ნიტა, შენ ხარ გოგო. ნიტა, ნამდვილი გოგო!');
  });

  it('leaves phrases without placeholders completely unchanged', () => {
    const phrase = 'სააღოლ ძმაო! მალადეეც, ბრავო!';
    expect(personalize(phrase, boyChild)).toBe('სააღოლ ძმაო! მალადეეც, ბრავო!');
    expect(personalize(phrase, null)).toBe('სააღოლ ძმაო! მალადეეც, ბრავო!');
  });
});
