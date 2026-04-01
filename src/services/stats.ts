export interface SeasonStats {
  totalGames: number;
  topMvp: { name: string; count: number } | null;
  topRatedPlayers: { player_id: string; name: string; totalScore: number; gamesRated: number }[];
}

export async function getSeasonStats(db: D1Database): Promise<SeasonStats> {
  // Total games played (weeks with results)
  const gamesResult = await db.prepare(
    'SELECT COUNT(DISTINCT week_id) as count FROM results'
  ).first<{ count: number }>();
  const totalGames = gamesResult?.count || 0;

  // Top MVP
  const mvpResult = await db.prepare(`
    SELECT mvp as name, COUNT(*) as count FROM weeks
    WHERE mvp IS NOT NULL AND mvp != ''
    GROUP BY mvp ORDER BY count DESC LIMIT 1
  `).first<{ name: string; count: number }>();

  // Top rated players (by total weekly rating score)
  const { results: topRated } = await db.prepare(`
    SELECT wr.player_id, p.name, SUM(wr.score) as totalScore, COUNT(*) as gamesRated
    FROM weekly_ratings wr
    JOIN players p ON p.id = wr.player_id
    GROUP BY wr.player_id
    ORDER BY totalScore DESC
    LIMIT 5
  `).all<{ player_id: string; name: string; totalScore: number; gamesRated: number }>();

  return {
    totalGames,
    topMvp: mvpResult || null,
    topRatedPlayers: topRated || []
  };
}
