import { Child } from '../types';
import { getVocativeName } from './vocativeNames';

export function personalize(phrase: string, child: Child | null): string {
  const genderWord =
    child?.gender === 'girl' ? 'გოგო' :
    child?.gender === 'boy' ? 'ბიჭი' :
    'მოთამაშე'; // ნეიტრალური fallback, child===null-ზე (პრაქტიკულად არ ხდება — activeChild ყოველთვის არსებობს თამაშის დაწყებამდე), 'ბიჭი'-ს არ ვვარაუდობთ

  const vocativeName = child?.name ? getVocativeName(child.name) : 'ჩემპიონო';

  return phrase
    .replaceAll('{name}', child?.name ?? 'ჩემპიონო')
    .replaceAll('{vocative}', vocativeName)
    .replaceAll('{gender}', genderWord);
}
