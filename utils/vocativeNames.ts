export const VOCATIVE_NAMES: Record<string, string> = {
  'თომა': 'თომა',
  'ნიტა': 'ნიტა',
  'გიორგი': 'გიორგი',
  'დავითი': 'დავით',
  'ლუკა': 'ლუკა',
};

export function getVocativeName(name: string): string {
  const trimmed = name.trim();
  return VOCATIVE_NAMES[trimmed] ?? trimmed;
}
