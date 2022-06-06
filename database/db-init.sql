\echo 'Delete and recreate recipe_app db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE IF EXISTS recipe_app;
CREATE DATABASE recipe_app;
\connect recipe_app

\i db-schema.sql

\echo 'Delete and recreate recipe_app_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE IF EXISTS recipe_app_test;
CREATE DATABASE recipe_app_test;
\connect recipe_app_test

\i db-schema.sql