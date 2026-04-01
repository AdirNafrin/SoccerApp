import { Hono } from 'hono';
import type { Env, Player } from '../types';

const players = new Hono<{ Bindings: Env }>();

// GET /api/players - list all active players (or all if ?all=1)
players.get('/', async (c) => {
  const all = c.req.query('all') === '1';
  const sql = all
    ? 'SELECT * FROM players ORDER BY name'
    : 'SELECT * FROM players WHERE active = 1 ORDER BY name';
  const { results } = await c.env.DB.prepare(sql).all<Player>();
  return c.json(results);
});

// GET /api/players/:id
players.get('/:id', async (c) => {
  const player = await c.env.DB.prepare('SELECT * FROM players WHERE id = ?')
    .bind(c.req.param('id'))
    .first<Player>();
  if (!player) return c.json({ error: 'Player not found' }, 404);
  return c.json(player);
});

// POST /api/players - create player (admin)
players.post('/', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO players (id, name, name_he, name_en, position, dob, height, weight, phone, email,
      favorite_team, team_logo_url, photo_url, attack, defense, fitness, technique, passing, movement, speed, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(
    id,
    body.name,
    body.name_he || null,
    body.name_en || null,
    body.position || 'General',
    body.dob || null,
    body.height || null,
    body.weight || null,
    body.phone || null,
    body.email || null,
    body.favorite_team || null,
    body.team_logo_url || null,
    body.photo_url || null,
    body.attack ?? 5,
    body.defense ?? 5,
    body.fitness ?? 5,
    body.technique ?? 5,
    body.passing ?? 5,
    body.movement ?? 5,
    body.speed ?? 5
  ).run();

  return c.json({ id, ...body }, 201);
});

// PUT /api/players/:id - update player (admin)
players.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const fields: string[] = [];
  const values: unknown[] = [];

  const allowedFields = [
    'name', 'name_he', 'name_en', 'position', 'dob', 'height', 'weight',
    'phone', 'email', 'favorite_team', 'team_logo_url', 'photo_url',
    'attack', 'defense', 'fitness', 'technique', 'passing', 'movement', 'speed'
  ];

  for (const field of allowedFields) {
    if (field in body) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);

  values.push(id);
  await c.env.DB.prepare(`UPDATE players SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return c.json({ ok: true });
});

// DELETE /api/players/:id (admin)
players.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM players WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// PATCH /api/players/:id/toggle-active (admin)
players.patch('/:id/toggle-active', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE players SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?')
    .bind(id)
    .run();
  return c.json({ ok: true });
});

export default players;
