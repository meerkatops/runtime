#!/bin/sh
# Validates JSON files against a JSON Schema with check-jsonschema 0.33.3, run through uvx so nothing is
# installed into the repo:  ci/schema-check.sh <schema> <file>...
# Exit 0 every file valid; 1 a file refused, naming the field; 2 a usage error or uvx missing.
set -u
if [ "$#" -lt 2 ]; then
  echo "usage: ci/schema-check.sh <schema> <file>..." >&2
  exit 2
fi
if ! command -v uvx >/dev/null 2>&1; then
  echo "schema-check: uvx is not on PATH; install uv: curl -LsSf https://astral.sh/uv/install.sh | sh (or brew install uv)" >&2
  exit 2
fi
schema=$1
shift
exec uvx --from check-jsonschema==0.33.3 check-jsonschema --schemafile "$schema" "$@"
