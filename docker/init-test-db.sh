#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE DATABASE spatial_cms_test;
  GRANT ALL PRIVILEGES ON DATABASE spatial_cms_test TO spatial_cms;
  \c spatial_cms_test
  CREATE EXTENSION IF NOT EXISTS postgis;
EOSQL
