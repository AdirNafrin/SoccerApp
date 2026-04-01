export interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
}

export interface Player {
  id: string;
  name: string;
  name_he: string | null;
  name_en: string | null;
  position: string | null;
  dob: string | null;
  height: number | null;
  weight: number | null;
  phone: string | null;
  email: string | null;
  favorite_team: string | null;
  team_logo_url: string | null;
  photo_url: string | null;
  attack: number;
  defense: number;
  fitness: number;
  technique: number;
  passing: number;
  movement: number;
  speed: number;
  active: number;
  created_at: string;
}

export interface Week {
  id: string;
  registration_open: number;
  payment_url: string | null;
  gallery_url: string | null;
  mvp: string | null;
  goal_of_round: string | null;
  save_of_round: string | null;
  created_at: string;
}

export interface Registration {
  id: number;
  week_id: string;
  player_id: string;
  position: number;
  registered_at: string;
}

export interface Team {
  id: number;
  week_id: string;
  team_index: number;
  team_name: string;
  team_emoji: string;
}

export interface TeamPlayer {
  team_id: number;
  player_id: string;
}

export interface Result {
  id: number;
  week_id: string;
  team_name: string;
  score: number;
}

export interface WeeklyRating {
  id: number;
  week_id: string;
  player_id: string;
  score: number;
}

export const ATTR_KEYS = ['attack', 'defense', 'fitness', 'technique', 'passing', 'movement', 'speed'] as const;
export type AttrKey = typeof ATTR_KEYS[number];

export function calcOverall(player: Pick<Player, AttrKey>): number {
  const sum = ATTR_KEYS.reduce((s, k) => s + (player[k] || 5), 0);
  return sum / ATTR_KEYS.length;
}
