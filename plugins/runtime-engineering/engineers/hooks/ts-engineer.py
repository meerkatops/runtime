#!/usr/bin/env python3
"""The one hook typescript-engineer and react-engineer share: PostToolUse on Edit|Write|Bash. It runs `tsc --noEmit -p` on the project whose
program includes each changed .ts/.tsx file and feeds the errors back to the agent as information. It never blocks.

Guidance, not gates: the gates are the repo's CI and its review checks.

  Edit|Write  the edited file, when it is TypeScript inside the project
  Bash        every changed or untracked TypeScript file in the repo (git status), skipped when nothing changed
              since the last report; a deleted file (or a rename's old name) is in no Program, so the nearest
              tsconfig above where it was is checked, where its importers now fail

The project is the tsconfig whose full Program (root files and everything they import) holds the file, found with the
project's own TypeScript compiler API (ts-scan.mjs `owners`, file list cached per tsconfig and mtimes). A file in no
Program is reported once per session as "not in any tsconfig; not type-checked".
All tsc runs share one deadline, each in its own process group, killed at the deadline.

Trust, not deny-lists: the hook runs the project's own installed compiler (node_modules/typescript), which is project
code, so no hook can make an untrusted repo safe. (tsc itself loads no language-service plugins.) The hook
runs only when CLAUDE_PROJECT_DIR's real path is under a trusted root listed in ~/.config/engineer-agents/trusted-roots
(hookkit.py says how that file is read; nothing is trusted by default).
Elsewhere it says "not a trusted repo; type check skipped" once per session. Each skip (untrusted repo, no tsc, a file
in no tsconfig) is said once and is silent after that, so silence after a skip means unchecked.

Security: acts only on files whose real path is inside CLAUDE_PROJECT_DIR. tsc and the compiler API are the project's
own node_modules/typescript, found from the file up to the project root and used only when its real path is inside
the project; a project with none gets "no tsc in this project; skipped" once per session. git runs with fsmonitor and
hooks off and no system config; state lives in a per-user 0700 dir checked with lstat and opened with O_NOFOLLOW.
A hook that cannot run says so.

Repo standards are not checked here: the agent's own checklist and the rulebook review hold them.
`--agent NAME`, given once per agent, keeps a plugin-wide hook to the agents it names; report lines name the agent the
hook ran for, and the state dir keeps the name typescript-engineer for both.
"""
import hashlib
import json
import os
import re
import shutil
import sys

from hookkit import (UNTRUSTED, Deadline, HookCannotRun, Runner, agent_name, changed_files, for_agent, info, inside,
                     project_root, read_state, rel, signature, trusted, write_state)
import hookkit

HERE = os.path.dirname(os.path.realpath(__file__))
TS_EXT = (".ts", ".tsx", ".mts", ".cts")
DEADLINE_S = 240  # hooks.json timeout is 330
NO_TSC = "no tsc in this project; skipped"
NAME = "typescript-engineer"



def state_dir():
    return hookkit.state_dir(NAME)


def state_file(data, root, what):
    return hookkit.state_file(NAME, data, root, what)


def once(data, root, what):
    return hookkit.once(NAME, data, root, what)


def changed_ts(run, root):
    """(files, gone): hookkit's changed and deleted TypeScript files."""
    return changed_files(run, root, TS_EXT, ("node_modules",))



def node():
    n = shutil.which("node")
    if not n:
        raise HookCannotRun("node not found on PATH")
    return n


def project_ts(file, root):
    """The nearest node_modules/typescript from the file up to root whose real path is inside root, or None."""
    d = os.path.dirname(file)
    while inside(d, root):
        cand = os.path.join(d, "node_modules", "typescript")
        if os.path.isfile(os.path.join(cand, "package.json")) and inside(cand, root):
            return os.path.realpath(cand)
        if d == root:
            break
        d = os.path.dirname(d)
    return None


def owners(run, ts_dir, files, gone, root):
    """({file: tsconfig or None}, [tsconfigs to check for the gone files]) from ts-scan.mjs."""
    if not os.path.isfile(os.path.join(ts_dir, "lib", "typescript.js")):
        raise HookCannotRun("this project's typescript has no JS compiler API (TypeScript 7 or later), "
                            "which the hook needs to find each file's tsconfig")
    r = run.run([node(), os.path.join(HERE, "ts-scan.mjs"), ts_dir], cwd=HERE,
                stdin=json.dumps({"owners": {"root": root, "files": files, "gone": gone, "cacheDir": state_dir()}}))
    if r.returncode != 0:
        raise HookCannotRun("ts-scan.mjs failed: " + (r.stderr.strip() or r.stdout.strip())[-400:])
    try:
        reply = json.loads(r.stdout)
        return reply["owners"], reply["goneConfigs"]
    except (ValueError, KeyError) as e:
        raise HookCannotRun(f"ts-scan.mjs printed no owners ({e})")


def run_tsc(run, ts_dir, tsconfig, root):
    cache = os.path.join(state_dir(), hashlib.sha256(tsconfig.encode()).hexdigest()[:16] + ".tsbuildinfo")
    r = run.run([node(), os.path.join(ts_dir, "bin", "tsc"), "--noEmit", "-p", tsconfig, "--pretty", "false", "--incremental",
                 "--tsBuildInfoFile", cache], cwd=os.path.dirname(tsconfig))
    if r.returncode == 0:
        return None
    out = (r.stdout + r.stderr).splitlines()
    diag = [l for l in out if re.search(r"error TS\d+:", l)] or out[-30:]
    return f"tsc --noEmit -p {rel(tsconfig, root)}: {len(diag)} error(s):\n" + "\n".join(diag[:60])


def unowned_lines(data, root, found):
    """'not in any tsconfig', once per file per session: a repo with many such files must not drown the agent."""
    loose = [f for f, c in found.items() if c is None]
    if not loose:
        return []
    key = state_file(data, root, "unowned")
    told = set((read_state(key) or "").splitlines())
    new = [f for f in loose if f not in told]
    if new:
        write_state(key, "\n".join(sorted(told | set(new))))
    return [f"{rel(f, root)}: not in any tsconfig; not type-checked." for f in new]


def report(data, run, files, gone, root):
    """Report lines for these files: no tsc or unincluded (once each), then tsc per owning project, and per project
    a deleted file sat in, under the deadline."""
    by_ts = {}
    for f in files:
        by_ts.setdefault(project_ts(f, root), ([], []))[0].append(f)
    for f in gone:
        by_ts.setdefault(project_ts(f, root), ([], []))[1].append(f)
    lines = [NO_TSC] if by_ts.pop(None, None) and once(data, root, "no-tsc") else []
    jobs, done = [], []
    for ts_dir, (group, lost) in sorted(by_ts.items()):
        found, lost_cfgs = owners(run, ts_dir, group, lost, root)
        lines += unowned_lines(data, root, found)
        jobs += [(ts_dir, c) for c in dict.fromkeys([c for c in found.values() if c] + lost_cfgs)
                 if (ts_dir, c) not in jobs]
    try:
        for ts_dir, cfg in jobs:
            e = run_tsc(run, ts_dir, cfg, root)
            done.append(cfg)
            if e:
                lines.append(e)
    except Deadline:
        left = ", ".join(rel(c, root) for _, c in jobs if c not in done)
        lines.append(f"tsc timed out on {left}: the {run.limit_s:g} s deadline passed and it was killed, so this "
                     "was not checked. Run `tsc --noEmit -p <config>` yourself before you finish.")
    return lines


def check(data, root):
    if not trusted(root):
        return [UNTRUSTED] if once(data, root, "untrusted") else None
    return check_files(data, root)


def check_files(data, root):
    run = Runner(hookkit.deadline_s(NAME, DEADLINE_S))
    tool = data.get("tool_name", "")
    if tool in ("Edit", "Write"):
        path = (data.get("tool_input") or {}).get("file_path", "")
        if not path.endswith(TS_EXT) or not inside(path, root) or not os.path.isfile(path):
            return None
        files, gone = [os.path.realpath(path)], []
    elif tool == "Bash":
        files, gone = changed_ts(run, root)
        if not files and not gone:
            return None
        sig, key = signature(files, gone), state_file(data, root, "sig")
        if read_state(key) == sig:
            return None  # no TypeScript changed since the last report
        write_state(key, sig)
    else:
        return None
    return report(data, run, files, gone, root)


def main():
    try:
        data = json.load(sys.stdin)
        if not isinstance(data, dict):
            raise ValueError("not an object")
    except ValueError as e:
        json.dump(info(f"typescript-engineer hook could not run: hook input is not JSON ({e})."), sys.stdout)
        return 0
    if not for_agent(sys.argv, data):
        return 0  # another agent or the main session
    who = agent_name(sys.argv, data, NAME)
    try:
        lines = check(data, project_root(data))
        notice = (UNTRUSTED, NO_TSC)
        if lines and all(l.startswith(notice) for l in lines):
            out = info("\n".join(lines))
        else:
            out = info(f"{who} tsc report (information; fix before you finish):\n\n"
                       + "\n\n".join(lines)) if lines else None
    except Deadline:
        out = info(f"{who} hook timed out before tsc ran; run `tsc --noEmit` yourself.")
    except HookCannotRun as e:
        out = info(f"{who} hook could not run: {e}. Nothing was checked; run `tsc --noEmit` "
                   "yourself and tell the caller the hook is broken.")
    except Exception as e:  # a bug in this hook is reported, never a silent pass
        out = info(f"{who} hook could not run: {type(e).__name__}: {e}. Run `tsc --noEmit` yourself.")
    if out:
        json.dump(out, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
