import { Hono } from 'hono';
import type { Env, Player, Registration, Team } from '../types';
import { generateBalancedTeams } from '../services/team-generator';
import { getSeasonStats } from '../services/stats';

const weeks = new Hono<{ Bindings: Env }>();

// Helper: ensure week exists, create if not
async function ensureWeek(db: D1Database, weekId: string) {
  const existing = await db.prepare('SELECT id FROM weeks WHERE id = ?').bind(weekId).first();
  if (!existing) {
    await db.prepare('INSERT INTO weeks (id) VALUES (?)').bind(weekId).run();
  }
}

// GET /api/weeks/stats - season stats
weeks.get('/stats', async (c) => {
  const stats = await getSeasonStats(c.env.DB);
  return c.json(stats);
});

// GET /api/weeks/current - get current week id (next Saturday)
weeks.get('/current', async (c) => {
  const now = new Date();
  const day = now.getDay();
  const diff = (6 - day + 7) % 7 || 7; // days until next Saturday
  const sat = new Date(now);
  sat.setDate(now.getDate() + (day === 6 ? 0 : diff));
  const weekId = sat.toISOString().split('T')[0];

  await ensureWeek(c.env.DB, weekId);

  const week = await c.env.DB.prepare('SELECT * FROM weeks WHERE id = ?').bind(weekId).first();
  const { results: registrations } = await c.env.DB.prepare(
    'SELECT r.*, p.name as player_name FROM registrations r JOIN players p ON p.id = r.player_id WHERE r.week_id = ? ORDER BY r.position'
  ).bind(weekId).all();

  const { results: teams } = await c.env.DB.prepare(
    'SELECT * FROM teams WHERE week_id = ? ORDER BY team_index'
  ).bind(weekId).all<Team>();

  let teamsWithPlayers = null;
  if (teams && teams.length > 0) {
    teamsWithPlayers = await Promise.all(teams.map(async (t) => {
      const { results: tp } = await c.env.DB.prepare(
        'SELECT tp.player_id, p.name, p.attack, p.defense, p.fitness, p.technique, p.passing, p.movement, p.speed FROM team_players tp JOIN players p ON p.id = tp.player_id WHERE tp.team_id = ?'
      ).bind(t.id).all();
      return { ...t, players: tp || [] };
    }));
  }

  const { results: gameResults } = await c.env.DB.prepare(
    'SELECT * FROM results WHERE week_id = ?'
  ).bind(weekId).all();

  const { results: ratings } = await c.env.DB.prepare(
    'SELECT wr.*, p.name as player_name FROM weekly_ratings wr JOIN players p ON p.id = wr.player_id WHERE wr.week_id = ?'
  ).bind(weekId).all();

  const { results: payments } = await c.env.DB.prepare(
    'SELECT player_id FROM payments WHERE week_id = ?'
  ).bind(weekId).all();

  return c.json({
    ...week,
    registrations: registrations || [],
    teams: teamsWithPlayers,
    results: gameResults || [],
    ratings: ratings || [],
    payments: (payments || []).map((p: any) => p.player_id)
  });
});

// GET /api/weeks - list all weeks (history)
weeks.get('/', async (c) => {
  const { results: allWeeks } = await c.env.DB.prepare(
    'SELECT * FROM weeks ORDER BY id DESC'
  ).all();

  const enriched = await Promise.all((allWeeks || []).map(async (w: any) => {
    const { results: regs } = await c.env.DB.prepare(
      'SELECT r.*, p.name as player_name FROM registrations r JOIN players p ON p.id = r.player_id WHERE r.week_id = ? ORDER BY r.position'
    ).bind(w.id).all();

    const { results: gameResults } = await c.env.DB.prepare(
      'SELECT * FROM results WHERE week_id = ?'
    ).bind(w.id).all();

    const { results: payments } = await c.env.DB.prepare(
      'SELECT player_id FROM payments WHERE week_id = ?'
    ).bind(w.id).all();

    return {
      ...w,
      registrations: regs || [],
      results: gameResults || [],
      payments: (payments || []).map((p: any) => p.player_id)
    };
  }));

  return c.json(enriched);
});

// GET /api/weeks/:id - get specific week
weeks.get('/:id', async (c) => {
  const weekId = c.req.param('id');
  const week = await c.env.DB.prepare('SELECT * FROM weeks WHERE id = ?').bind(weekId).first();
  if (!week) return c.json({ error: 'Week not found' }, 404);

  const { results: registrations } = await c.env.DB.prepare(
    'SELECT r.*, p.name as player_name FROM registrations r JOIN players p ON p.id = r.player_id WHERE r.week_id = ? ORDER BY r.position'
  ).bind(weekId).all();

  const { results: teams } = await c.env.DB.prepare(
    'SELECT * FROM teams WHERE week_id = ? ORDER BY team_index'
  ).bind(weekId).all<Team>();

  let teamsWithPlayers = null;
  if (teams && teams.length > 0) {
    teamsWithPlayers = await Promise.all(teams.map(async (t) => {
      const { results: tp } = await c.env.DB.prepare(
        'SELECT tp.player_id, p.name, p.attack, p.defense, p.fitness, p.technique, p.passing, p.movement, p.speed FROM team_players tp JOIN players p ON p.id = tp.player_id WHERE tp.team_id = ?'
      ).bind(t.id).all();
      return { ...t, players: tp || [] };
    }));
  }

  const { results: gameResults } = await c.env.DB.prepare(
    'SELECT * FROM results WHERE week_id = ?'
  ).bind(weekId).all();

  const { results: ratings } = await c.env.DB.prepare(
    'SELECT wr.*, p.name as player_name FROM weekly_ratings wr JOIN players p ON p.id = wr.player_id WHERE wr.week_id = ?'
  ).bind(weekId).all();

  const { results: payments } = await c.env.DB.prepare(
    'SELECT player_id FROM payments WHERE week_id = ?'
  ).bind(weekId).all();

  return c.json({
    ...week,
    registrations: registrations || [],
    teams: teamsWithPlayers,
    results: gameResults || [],
    ratings: ratings || [],
    payments: (payments || []).map((p: any) => p.player_id)
  });
});

// PATCH /api/weeks/:id/registration - open/close/clear registration (admin)
weeks.patch('/:id/registration', async (c) => {
  const weekId = c.req.param('id');
  const body = await c.req.json<{ action: 'open' | 'close' | 'clear' }>();

  await ensureWeek(c.env.DB, weekId);

  if (body.action === 'open') {
    await c.env.DB.prepare('UPDATE weeks SET registration_open = 1 WHERE id = ?').bind(weekId).run();
  } else if (body.action === 'close') {
    await c.env.DB.prepare('UPDATE weeks SET registration_open = 0 WHERE id = ?').bind(weekId).run();
  } else if (body.action === 'clear') {
    await c.env.DB.prepare('DELETE FROM registrations WHERE week_id = ?').bind(weekId).run();
  }

  return c.json({ ok: true });
});

// POST /api/weeks/:id/register/:playerId - register player
weeks.post('/:id/register/:playerId', async (c) => {
  const weekId = c.req.param('id');
  const playerId = c.req.param('playerId');

  await ensureWeek(c.env.DB, weekId);

  // Check if already registered
  const existing = await c.env.DB.prepare(
    'SELECT id FROM registrations WHERE week_id = ? AND player_id = ?'
  ).bind(weekId, playerId).first();

  if (existing) return c.json({ error: 'Already registered' }, 409);

  // Get next position
  const maxPos = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(position), 0) as max_pos FROM registrations WHERE week_id = ?'
  ).bind(weekId).first<{ max_pos: number }>();

  const position = (maxPos?.max_pos || 0) + 1;

  await c.env.DB.prepare(
    'INSERT INTO registrations (week_id, player_id, position) VALUES (?, ?, ?)'
  ).bind(weekId, playerId, position).run();

  return c.json({ ok: true, position }, 201);
});

// DELETE /api/weeks/:id/register/:playerId - unregister player (admin)
weeks.delete('/:id/register/:playerId', async (c) => {
  const weekId = c.req.param('id');
  const playerId = c.req.param('playerId');

  const reg = await c.env.DB.prepare(
    'SELECT position FROM registrations WHERE week_id = ? AND player_id = ?'
  ).bind(weekId, playerId).first<{ position: number }>();

  if (!reg) return c.json({ error: 'Not registered' }, 404);

  await c.env.DB.prepare(
    'DELETE FROM registrations WHERE week_id = ? AND player_id = ?'
  ).bind(weekId, playerId).run();

  // Reorder positions
  await c.env.DB.prepare(
    'UPDATE registrations SET position = position - 1 WHERE week_id = ? AND position > ?'
  ).bind(weekId, reg.position).run();

  return c.json({ ok: true });
});

// POST /api/weeks/:id/teams/generate - generate balanced teams (admin)
weeks.post('/:id/teams/generate', async (c) => {
  const weekId = c.req.param('id');
  const body = await c.req.json<{ randomness?: number }>();
  const randomness = (body.randomness ?? 50) / 100;

  // Get first 15 registered players
  const { results: regs } = await c.env.DB.prepare(
    'SELECT r.player_id FROM registrations r WHERE r.week_id = ? ORDER BY r.position LIMIT 15'
  ).bind(weekId).all<{ player_id: string }>();

  if (!regs || regs.length < 3) {
    return c.json({ error: 'Need at least 3 registered players' }, 400);
  }

  const playerIds = regs.map(r => r.player_id);
  const placeholders = playerIds.map(() => '?').join(',');
  const { results: playerRows } = await c.env.DB.prepare(
    `SELECT * FROM players WHERE id IN (${placeholders})`
  ).bind(...playerIds).all<Player>();

  if (!playerRows) return c.json({ error: 'No players found' }, 400);

  const teams = generateBalancedTeams(playerRows, randomness);

  // Clear existing teams for this week
  const { results: existingTeams } = await c.env.DB.prepare(
    'SELECT id FROM teams WHERE week_id = ?'
  ).bind(weekId).all<{ id: number }>();

  if (existingTeams && existingTeams.length > 0) {
    for (const t of existingTeams) {
      await c.env.DB.prepare('DELETE FROM team_players WHERE team_id = ?').bind(t.id).run();
    }
    await c.env.DB.prepare('DELETE FROM teams WHERE week_id = ?').bind(weekId).run();
  }

  // Insert new teams
  for (const team of teams) {
    const result = await c.env.DB.prepare(
      'INSERT INTO teams (week_id, team_index, team_name, team_emoji) VALUES (?, ?, ?, ?)'
    ).bind(weekId, team.team_index, team.team_name, team.team_emoji).run();

    const teamId = result.meta.last_row_id;
    for (const p of team.players) {
      await c.env.DB.prepare(
        'INSERT INTO team_players (team_id, player_id) VALUES (?, ?)'
      ).bind(teamId, p.id).run();
    }
  }

  return c.json({ ok: true, teams });
});

// DELETE /api/weeks/:id/teams - clear teams (admin)
weeks.delete('/:id/teams', async (c) => {
  const weekId = c.req.param('id');

  const { results: existingTeams } = await c.env.DB.prepare(
    'SELECT id FROM teams WHERE week_id = ?'
  ).bind(weekId).all<{ id: number }>();

  if (existingTeams) {
    for (const t of existingTeams) {
      await c.env.DB.prepare('DELETE FROM team_players WHERE team_id = ?').bind(t.id).run();
    }
  }
  await c.env.DB.prepare('DELETE FROM teams WHERE week_id = ?').bind(weekId).run();

  return c.json({ ok: true });
});

// PUT /api/weeks/:id/results - save scores + awards (admin)
weeks.put('/:id/results', async (c) => {
  const weekId = c.req.param('id');
  const body = await c.req.json<{
    results: { team_name: string; score: number }[];
    mvp?: string;
    goal_of_round?: string;
    save_of_round?: string;
  }>();

  await ensureWeek(c.env.DB, weekId);

  // Clear and re-insert results
  await c.env.DB.prepare('DELETE FROM results WHERE week_id = ?').bind(weekId).run();
  for (const r of body.results) {
    await c.env.DB.prepare(
      'INSERT INTO results (week_id, team_name, score) VALUES (?, ?, ?)'
    ).bind(weekId, r.team_name, r.score).run();
  }

  // Update awards
  await c.env.DB.prepare(
    'UPDATE weeks SET mvp = ?, goal_of_round = ?, save_of_round = ? WHERE id = ?'
  ).bind(body.mvp || null, body.goal_of_round || null, body.save_of_round || null, weekId).run();

  return c.json({ ok: true });
});

// PUT /api/weeks/:id/ratings - save weekly ratings (admin)
weeks.put('/:id/ratings', async (c) => {
  const weekId = c.req.param('id');
  const body = await c.req.json<{ ratings: { player_id: string; score: number }[] }>();

  // Upsert ratings
  for (const r of body.ratings) {
    await c.env.DB.prepare(`
      INSERT INTO weekly_ratings (week_id, player_id, score) VALUES (?, ?, ?)
      ON CONFLICT(week_id, player_id) DO UPDATE SET score = ?
    `).bind(weekId, r.player_id, r.score, r.score).run();
  }

  return c.json({ ok: true });
});

// POST /api/weeks/:id/payments/:playerId - toggle paid (admin)
weeks.post('/:id/payments/:playerId', async (c) => {
  const weekId = c.req.param('id');
  const playerId = c.req.param('playerId');

  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM payments WHERE week_id = ? AND player_id = ?'
  ).bind(weekId, playerId).first();

  if (existing) {
    await c.env.DB.prepare(
      'DELETE FROM payments WHERE week_id = ? AND player_id = ?'
    ).bind(weekId, playerId).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO payments (week_id, player_id) VALUES (?, ?)'
    ).bind(weekId, playerId).run();
  }

  return c.json({ ok: true, paid: !existing });
});

// PATCH /api/weeks/:id/settings - update payment URL, gallery URL (admin)
weeks.patch('/:id/settings', async (c) => {
  const weekId = c.req.param('id');
  const body = await c.req.json<{ payment_url?: string; gallery_url?: string }>();

  await ensureWeek(c.env.DB, weekId);

  const fields: string[] = [];
  const values: unknown[] = [];

  if ('payment_url' in body) { fields.push('payment_url = ?'); values.push(body.payment_url); }
  if ('gallery_url' in body) { fields.push('gallery_url = ?'); values.push(body.gallery_url); }

  if (fields.length > 0) {
    values.push(weekId);
    await c.env.DB.prepare(`UPDATE weeks SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  return c.json({ ok: true });
});

export default weeks;
