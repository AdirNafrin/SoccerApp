import { ATTR_KEYS, calcOverall } from '../types';
import type { Player } from '../types';

interface TeamOutput {
  team_index: number;
  team_name: string;
  team_emoji: string;
  players: { id: string; name: string }[];
  avgOv: number;
  avgAttrs: Record<string, number>;
}

export function generateBalancedTeams(pool: Player[], randomness: number): TeamOutput[] {
  // Add noise proportional to randomness (max +/-2 points)
  const noisy = pool.map(p => ({
    ...p,
    sortKey: calcOverall(p) + (Math.random() * 2 - 1) * randomness * 2
  }));

  // Sort descending by sortKey
  noisy.sort((a, b) => b.sortKey - a.sortKey);

  // Snake draft: A B C | C B A | A B C | C B A | A B C
  const order = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];
  const teams: { id: string; name: string; attrs: Record<string, number> }[][] = [[], [], []];

  noisy.slice(0, 15).forEach((p, i) => {
    const attrs: Record<string, number> = {};
    for (const k of ATTR_KEYS) attrs[k] = p[k] || 5;
    teams[order[i]].push({ id: p.id, name: p.name, attrs });
  });

  const names = ["קבוצה א'", "קבוצה ב'", "קבוצה ג'"];
  const emojis = ['🩵', '💙', '💜'];

  return teams.map((pl, i) => {
    const avgAttrs: Record<string, number> = {};
    for (const k of ATTR_KEYS) {
      avgAttrs[k] = +(pl.reduce((s, p) => s + (p.attrs[k] || 5), 0) / pl.length).toFixed(1);
    }
    const avgOv = +(pl.reduce((s, p) => {
      const sum = ATTR_KEYS.reduce((ss, k) => ss + (p.attrs[k] || 5), 0);
      return s + sum / ATTR_KEYS.length;
    }, 0) / pl.length).toFixed(2);

    return {
      team_index: i,
      team_name: names[i],
      team_emoji: emojis[i],
      players: pl.map(p => ({ id: p.id, name: p.name })),
      avgOv,
      avgAttrs
    };
  });
}
