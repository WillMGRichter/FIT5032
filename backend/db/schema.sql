-- GreenLink database schema
-- Core entities: users, categories, projects, project_participations, plants, project_plants

DROP TABLE IF EXISTS project_plants CASCADE;
DROP TABLE IF EXISTS project_participations CASCADE;
DROP TABLE IF EXISTS project_ratings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS plants CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  firebase_uid  VARCHAR(128) UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  first_name    VARCHAR(60)  NOT NULL,
  last_name     VARCHAR(60)  NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  profile_image VARCHAR(500),
  bio           VARCHAR(500),
  location      VARCHAR(160),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id          VARCHAR(40) PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  description TEXT        NOT NULL
);

CREATE TABLE plants (
  id                BIGSERIAL PRIMARY KEY,
  common_name       VARCHAR(120) NOT NULL,
  scientific_name   VARCHAR(160) NOT NULL UNIQUE,
  description       TEXT         NOT NULL,
  image             VARCHAR(255),
  habitat           VARCHAR(255),
  maintenance_level VARCHAR(10)  NOT NULL DEFAULT 'low'
                    CHECK (maintenance_level IN ('low', 'medium', 'high')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id          BIGSERIAL PRIMARY KEY,
  title       VARCHAR(160) NOT NULL,
  description TEXT         NOT NULL,
  category_id VARCHAR(40)  NOT NULL REFERENCES categories (id),
  location    VARCHAR(160) NOT NULL,
  latitude    NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude   NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  image       VARCHAR(255),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  capacity    INTEGER NOT NULL CHECK (capacity > 0),
  status      VARCHAR(12) NOT NULL DEFAULT 'planned'
              CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  created_by  BIGINT REFERENCES users (id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE project_participations (
  id         BIGSERIAL PRIMARY KEY,
  project_id BIGINT      NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'volunteer'
             CHECK (role IN ('organiser', 'volunteer')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE TABLE project_plants (
  project_id BIGINT  NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  plant_id   BIGINT  NOT NULL REFERENCES plants (id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (project_id, plant_id)
);

CREATE INDEX idx_projects_category ON projects (category_id);
CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_participations_user ON project_participations (user_id);
CREATE INDEX idx_project_plants_plant ON project_plants (plant_id);
CREATE INDEX idx_users_firebase_uid ON users (firebase_uid);

CREATE TABLE project_ratings (
  id         BIGSERIAL PRIMARY KEY,
  project_id BIGINT      NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  score      INTEGER     NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_ratings_project ON project_ratings (project_id);
CREATE INDEX idx_ratings_user ON project_ratings (user_id);

CREATE TABLE notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title      VARCHAR(120) NOT NULL,
  message    TEXT         NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  link       VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read);
