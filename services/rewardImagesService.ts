import { getSupabase } from '../lib/supabase';
import { ChildRewardImage, ChildRewardImagesState } from '../types';
import { ImageConfig } from '../data/rewards';

const EMPTY_STATE: ChildRewardImagesState = {
  isPersonalized: false,
  winner: [],
  loser: [],
  super_winner: [],
};

export async function fetchChildRewardImages(childId: string): Promise<ChildRewardImagesState> {
  if (!childId) {
    return EMPTY_STATE;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return EMPTY_STATE;
  }

  try {
    const { data, error } = await supabase
      .from('child_reward_images')
      .select('*')
      .eq('child_id', childId)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return EMPTY_STATE;
    }

    const rows = data as ChildRewardImage[];

    const winnerRows: ChildRewardImage[] = [];
    const loserRows: ChildRewardImage[] = [];
    const superWinnerRows: ChildRewardImage[] = [];

    for (const row of rows) {
      if (row.category === 'winner') {
        winnerRows.push(row);
      } else if (row.category === 'loser') {
        loserRows.push(row);
      } else if (row.category === 'super_winner') {
        superWinnerRows.push(row);
      }
    }

    // All-or-nothing: if any category has 0 rows in DB, personalized state is impossible
    if (winnerRows.length === 0 || loserRows.length === 0 || superWinnerRows.length === 0) {
      return EMPTY_STATE;
    }

    const allPaths = rows.map((r) => r.storage_path).filter(Boolean);
    if (allPaths.length === 0) {
      return EMPTY_STATE;
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from('child-reward-images')
      .createSignedUrls(allPaths, 7200);

    if (signedError || !signedData || !Array.isArray(signedData)) {
      return EMPTY_STATE;
    }

    const signedUrlMap = new Map<string, string>();
    for (const item of signedData) {
      if (item && !item.error && item.path && (item.signedUrl || (item as any).signedURL)) {
        signedUrlMap.set(item.path, item.signedUrl || (item as any).signedURL);
      }
    }

    const mapRowsToConfig = (categoryRows: ChildRewardImage[]): ImageConfig[] => {
      const result: ImageConfig[] = [];
      for (const row of categoryRows) {
        const signedUrl = signedUrlMap.get(row.storage_path);
        if (signedUrl) {
          result.push({
            url: signedUrl,
            caption: row.caption,
          });
        }
      }
      return result;
    };

    const winner = mapRowsToConfig(winnerRows);
    const loser = mapRowsToConfig(loserRows);
    const super_winner = mapRowsToConfig(superWinnerRows);

    const isPersonalized = winner.length >= 1 && loser.length >= 1 && super_winner.length >= 1;

    if (!isPersonalized) {
      return EMPTY_STATE;
    }

    return {
      isPersonalized: true,
      winner,
      loser,
      super_winner,
    };
  } catch (err) {
    console.error('Error fetching child reward images:', err);
    return EMPTY_STATE;
  }
}
