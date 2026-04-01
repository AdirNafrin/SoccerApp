CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_he TEXT,
  name_en TEXT,
  position TEXT DEFAULT 'General',
  dob TEXT,
  height INTEGER,
  weight INTEGER,
  phone TEXT,
  email TEXT,
  favorite_team TEXT,
  team_logo_url TEXT,
  photo_url TEXT,
  attack INTEGER DEFAULT 5,
  defense INTEGER DEFAULT 5,
  fitness INTEGER DEFAULT 5,
  technique INTEGER DEFAULT 5,
  passing INTEGER DEFAULT 5,
  movement INTEGER DEFAULT 5,
  speed INTEGER DEFAULT 5,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weeks (
  id TEXT PRIMARY KEY,
  registration_open INTEGER DEFAULT 0,
  payment_url TEXT,
  gallery_url TEXT,
  mvp TEXT,
  goal_of_round TEXT,
  save_of_round TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id TEXT NOT NULL REFERENCES weeks(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  position INTEGER NOT NULL,
  registered_at TEXT DEFAULT (datetime('now')),
  UNIQUE(week_id, player_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id TEXT NOT NULL REFERENCES weeks(id),
  team_index INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  team_emoji TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  player_id TEXT NOT NULL REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id TEXT NOT NULL REFERENCES weeks(id),
  team_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weekly_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id TEXT NOT NULL REFERENCES weeks(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  score INTEGER NOT NULL,
  UNIQUE(week_id, player_id)
);

CREATE TABLE IF NOT EXISTS payments (
  week_id TEXT NOT NULL REFERENCES weeks(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  PRIMARY KEY (week_id, player_id)
);
