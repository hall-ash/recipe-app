CREATE TABLE users (
  username VARCHAR(25) PRIMARY KEY CHECK (username = lower(username)),
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL
    CHECK (position('@' IN email) > 1),
  is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  username VARCHAR(25) NOT NULL
    REFERENCES users ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  source_name TEXT,
  image TEXT, 
  servings SMALLINT DEFAULT 1 CHECK (servings > 0),
  notes TEXT,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE
);

CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  metric_unit VARCHAR(20) NOT NULL,
  us_unit VARCHAR(20) NOT NULL,
  UNIQUE (metric_unit, us_unit)
);

CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL
    REFERENCES recipes ON DELETE CASCADE,
  unit_id INTEGER NOT NULL
    REFERENCES units ON DELETE CASCADE,
  label TEXT NOT NULL,
  ordinal SMALLINT NOT NULL CHECK (ordinal > 0),
  metric_amount NUMERIC NOT NULL CHECK (metric_amount > 0),
  us_amount NUMERIC NOT NULL CHECK (us_amount > 0)
);

CREATE TABLE instructions (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL
    REFERENCES recipes ON DELETE CASCADE,
  ordinal SMALLINT NOT NULL CHECK (ordinal > 0),
  step TEXT NOT NULL 
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  username VARCHAR(25) NOT NULL
    REFERENCES users ON DELETE CASCADE,
  label VARCHAR(25) NOT NULL CHECK (label = lower(label)),
  parent_id INTEGER CHECK (parent_id <> id)
    REFERENCES categories ON DELETE CASCADE,
  UNIQUE (label, parent_id)
);

CREATE TABLE recipes_categories (
  recipe_id INTEGER
    REFERENCES recipes ON DELETE CASCADE,
  category_id INTEGER
    REFERENCES categories ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, category_id)
);


CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.edited_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp 
BEFORE UPDATE ON recipes
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- CREATE OR REPLACE FUNCTION trigger_update_recipe_timestamp()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   UPDATE recipes 
--   SET edited_at = NOW()
--   WHERE id = NEW.recipe_id;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER update_recipe_after_ingredient
-- AFTER UPDATE ON ingredients
-- FOR EACH ROW
-- EXECUTE PROCEDURE trigger_update_recipe_timestamp();

-- CREATE TRIGGER update_recipe_after_instruction
-- AFTER UPDATE ON instructions
-- FOR EACH ROW
-- EXECUTE PROCEDURE  trigger_update_recipe_timestamp();

CREATE OR REPLACE FUNCTION trigger_set_default_categories()
RETURNS TRIGGER AS $$
BEGIN 
  INSERT INTO categories (username, label, parent_id)
  VALUES (NEW.username, 'cuisines', null),
         (NEW.username, 'diets', null),
         (NEW.username, 'courses', null),
         (NEW.username, 'occasions', null);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_default_categories
AFTER INSERT ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_default_categories();
