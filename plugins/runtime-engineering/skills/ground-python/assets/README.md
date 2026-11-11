# Starting files

Copied into a new Python repo, then edited for the repo's name. Each setting is explained in [start](../references/start.md).

- `pyproject.toml`: the manifest with its three tables, `requires-python`, and one command; a `dev` dependency group pinning ruff, pyright and pytest, and each tool's `[tool]` table, so the coding-rulebook's Python tool gate runs from the first commit. The build backend is one of those the Packaging Authority's tutorial lists; change it there if the repo chooses another.
- Layout to create beside it: `src/<name>/__init__.py`, `src/<name>/cli.py` with `main()`, `tests/` with a first `test_*.py`, and a README naming the environment tool.
