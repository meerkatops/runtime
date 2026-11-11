#!/usr/bin/env python3
"""python-engineer's one hook: PostToolUse on Edit|Write|Bash. It runs the coding rulebook's Python tool gate on each
changed .py/.pyi file, `ruff format --check`, `ruff check` and the project's type checker, and feeds what they find back
to the agent as information. It never blocks; the gates are the repo's CI and its review checks.

  Edit|Write  the edited file, when it is Python inside the project
  Bash        every changed or untracked Python file in the repo (git status), skipped when nothing changed
              since the last report; when a Python file was deleted (or renamed away), the type checker also runs
              over the whole project it sat in, since the files that imported it are not in the change

The project is the nearest folder holding pyproject.toml, from the file up to CLAUDE_PROJECT_DIR. Its environment is
.venv/ or venv/ there or at the project root. The type checker is mypy, run with --strict, when the project configures
it, in any file mypy itself reads from the project folder (https://mypy.readthedocs.io/en/stable/config_file.html):
mypy.ini, .mypy.ini, pyproject.toml with [tool.mypy], or setup.cfg with [mypy]. Else it is pyright, the rulebook's
choice for a new repo. mypy loads the project's
plugins, so it is used only from the project's own environment; ruff and pyright come from that environment, else PATH.
A tool that is missing is said once per session, never a silent pass. Tests are not run here: the agent runs them.

Trust and state are hookkit's: only trusted repos are checked, and files whose real path is outside the project are
ignored. `--agent NAME` keeps a plugin-wide hook to that agent.
"""
import json
import os
import re
import shutil
import sys

import hookkit
from hookkit import (UNTRUSTED, Deadline, HookCannotRun, Runner, changed_files, for_agent, info, inside,
                     project_root, read_state, rel, signature, trusted, write_state)

NAME = "python-engineer"
PY_EXT = (".py", ".pyi")
SKIP_DIRS = (".venv", "venv", "__pycache__", "node_modules", "site-packages", ".tox", ".nox")
DEADLINE_S = 240  # hooks.json timeout is 330
MAX_LINES = 60


def once(data, root, what):
    return hookkit.once(NAME, data, root, what)


# ---------- the project, its environment and its tools ----------

def project_of(file, root):
    """The nearest folder from the file up to root that holds pyproject.toml; root when none does."""
    d = os.path.dirname(file)
    while inside(d, root):
        if os.path.isfile(os.path.join(d, "pyproject.toml")):
            return d
        if d == root:
            break
        d = os.path.dirname(d)
    return root


def env_bin(project, root):
    """The project's environment bin dir, real path inside root, or None."""
    for base in (project, root):
        for name in (".venv", "venv"):
            b = os.path.join(base, name, "bin")
            if os.path.isdir(b) and inside(b, root):
                return os.path.realpath(b)
    return None


def tool(name, bin_dir, root, path_ok):
    """The tool from the project's environment (inside root), else from PATH when path_ok; None when neither."""
    if bin_dir:
        cand = os.path.join(bin_dir, name)
        if os.path.isfile(cand) and os.access(cand, os.X_OK) and inside(cand, root):
            return cand
    return shutil.which(name) if path_ok else None


MYPY_CONFIGS = (("mypy.ini", None), (".mypy.ini", None),  # mypy's own order; these two need no section to count
                ("pyproject.toml", re.compile(r"^\s*\[\[?tool\.mypy[\].]", re.M)),
                ("setup.cfg", re.compile(r"^\s*\[mypy\]", re.M)))


def uses_mypy(project):
    """True when the project folder holds a config file mypy would read: mypy.ini, .mypy.ini, a pyproject.toml with a
    [tool.mypy] table, or a setup.cfg with a [mypy] section."""
    for name, section in MYPY_CONFIGS:
        try:
            with open(os.path.join(project, name), encoding="utf-8", errors="replace") as f:
                if section is None or section.search(f.read()):
                    return True
        except OSError:
            continue
    return False


# ---------- the checks ----------

def short(lines, title):
    more = f"\n… {len(lines) - MAX_LINES} more" if len(lines) > MAX_LINES else ""
    return f"{title}: {len(lines)} finding(s):\n" + "\n".join(lines[:MAX_LINES]) + more


def ruff_format(run, ruff, project, files, root):
    r = run.run([ruff, "format", "--check", "--output-format", "concise", *files], cwd=project)
    if r.returncode == 0:
        return None
    lines = [l for l in (r.stdout + r.stderr).splitlines() if ": unformatted:" in l] or \
        (r.stdout + r.stderr).strip().splitlines()[-10:]
    return short(lines, f"ruff format --check ({rel(project, root) or '.'})") + \
        "\nRun `ruff format <file>` on each."


def ruff_check(run, ruff, project, files, root):
    r = run.run([ruff, "check", "--no-fix", "--output-format", "json", *files], cwd=project)
    if r.returncode == 0:
        return None
    try:
        found = json.loads(r.stdout or "[]")
    except ValueError:
        return f"ruff check exited {r.returncode} without JSON:\n" + (r.stderr or r.stdout).strip()[-800:]
    lines = [f"{rel(d['filename'], root)}:{d['location']['row']}:{d['location']['column']} {d.get('code') or ''} "
             f"{d['message']}" for d in found]
    if not lines:
        return f"ruff check exited {r.returncode}:\n" + r.stderr.strip()[-800:]
    return short(lines, "ruff check")


def pyright(run, exe, bin_dir, project, files, root):
    """pyright on `files`; with none, on the whole project as its own config names it."""
    cmd = [exe, "--outputjson"]
    py = os.path.join(bin_dir, "python") if bin_dir else None
    if py and os.path.isfile(py):
        cmd += ["--pythonpath", py]
    r = run.run([*cmd, *files], cwd=project)
    if r.returncode == 0:
        return None
    try:
        diags = json.loads(r.stdout)["generalDiagnostics"]
    except (ValueError, KeyError):
        return f"pyright exited {r.returncode} without its JSON report:\n" + (r.stderr or r.stdout).strip()[-800:]
    lines = [f"{rel(d['file'], root)}:{d['range']['start']['line'] + 1}:{d['range']['start']['character'] + 1} "
             f"{d['severity']} {d.get('rule', '')} {d['message'].splitlines()[0]}"
             for d in diags if d.get("severity") in ("error", "warning")]
    return short(lines, "pyright" if files else "pyright, whole project") if lines else None


def mypy(run, exe, project, files, root):
    """mypy on `files`; with none, on the whole project folder."""
    r = run.run([exe, "--strict", "--no-error-summary", "--show-error-codes", "--no-pretty", "--no-color-output",
                 *(files or ["."])], cwd=project)
    if r.returncode == 0:
        return None
    lines = [l for l in r.stdout.splitlines() if ": error:" in l]
    if not lines:
        return f"mypy exited {r.returncode}:\n" + (r.stderr or r.stdout).strip()[-800:]
    return short(lines, "mypy" if files else "mypy, whole project")


def report(data, run, files, gone, root):
    by_project = {}
    for f in files:
        by_project.setdefault(project_of(f, root), ([], []))[0].append(f)
    for f in gone:
        by_project.setdefault(project_of(f, root), ([], []))[1].append(f)
    lines = []
    for project, (group, lost) in sorted(by_project.items()):
        bin_dir = env_bin(project, root)
        ruff = tool("ruff", bin_dir, root, path_ok=True)
        if not group:
            pass  # only deletions here: nothing to format or lint
        elif ruff is None:
            if once(data, root, f"no-ruff:{project}"):
                lines.append(f"{rel(project, root) or '.'}: no ruff in the project's environment or on PATH; "
                             "format and lint not checked.")
        else:
            lines += [x for x in (ruff_format(run, ruff, project, group, root),
                                  ruff_check(run, ruff, project, group, root)) if x]
        # The changed files, then the whole project when a file is gone: its importers are not among the changed.
        scopes = ([group] if group else []) + ([[]] if lost else [])
        note = f"{', '.join(rel(f, root) for f in lost[:5])} deleted or renamed; its importers are checked:\n"
        if uses_mypy(project):
            exe = tool("mypy", bin_dir, root, path_ok=False)
            if exe is None:
                if once(data, root, f"no-mypy:{project}"):
                    lines.append(f"{rel(project, root) or '.'}: the project configures mypy but its environment "
                                 "has none; types not checked.")
                continue
            found = [(s, mypy(run, exe, project, s, root)) for s in scopes]
        else:
            exe = tool("pyright", bin_dir, root, path_ok=True)
            if exe is None:
                if once(data, root, f"no-pyright:{project}"):
                    lines.append(f"{rel(project, root) or '.'}: no pyright in the project's environment or on "
                                 "PATH; types not checked.")
                continue
            found = [(s, pyright(run, exe, bin_dir, project, s, root)) for s in scopes]
        lines += [e if s else note + e for s, e in found if e]
    return lines


def check(data, root):
    if not trusted(root):
        return [UNTRUSTED] if once(data, root, "untrusted") else None
    run = Runner(hookkit.deadline_s(NAME, DEADLINE_S))
    name = data.get("tool_name", "")
    if name in ("Edit", "Write"):
        path = (data.get("tool_input") or {}).get("file_path", "")
        if not path.endswith(PY_EXT) or not inside(path, root) or not os.path.isfile(path):
            return None
        files, gone = [os.path.realpath(path)], []
    elif name == "Bash":
        files, gone = changed_files(run, root, PY_EXT, SKIP_DIRS)
        if not files and not gone:
            return None
        sig, key = signature(files, gone), hookkit.state_file(NAME, data, root, "sig")
        if read_state(key) == sig:
            return None  # no Python changed since the last report
        write_state(key, sig)
    else:
        return None
    try:
        return report(data, run, files, gone, root)
    except Deadline:
        return [f"the Python checks passed the {run.limit_s:g} s deadline and were killed, so not everything was "
                "checked. Run ruff and the type checker yourself before you finish."]


def main():
    try:
        data = json.load(sys.stdin)
        if not isinstance(data, dict):
            raise ValueError("not an object")
    except ValueError as e:
        json.dump(info(f"python-engineer hook could not run: hook input is not JSON ({e})."), sys.stdout)
        return 0
    if not for_agent(sys.argv, data):
        return 0  # another agent or the main session
    try:
        lines = check(data, project_root(data))
        if lines == [UNTRUSTED]:
            out = info(UNTRUSTED)
        else:
            out = info("python-engineer check report (information; fix before you finish):\n\n"
                       + "\n\n".join(lines)) if lines else None
    except HookCannotRun as e:
        out = info(f"python-engineer hook could not run: {e}. Nothing was checked; run ruff and the type checker "
                   "yourself and tell the caller the hook is broken.")
    except Exception as e:  # a bug in this hook is reported, never a silent pass
        out = info(f"python-engineer hook could not run: {type(e).__name__}: {e}. Run ruff and the type checker "
                   "yourself.")
    if out:
        json.dump(out, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
