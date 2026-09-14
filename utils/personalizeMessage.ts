import { Child } from '../types';

export function personalize(phrase: string, child: Child | null): string {
  const genderWord =
    child?.gender === 'girl' ? 'გოგო' :
    child?.gender === 'boy' ? 'ბიჭი' :
    'მოთამაშე'; // ნეიტრალური fallback, child===null-ზე (პრაქტიკულად არ ხდება — activeChild ყოველთვის არსებობს თამაშის დაწყებამდე), 'ბიჭი'-ს არ ვვარაუდობთ

  return phrase
    .replaceAll('{name}', child?.name ?? 'ჩემპიონო')
    .replaceAll('{gender}', genderWord);
}
