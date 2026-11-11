#!/usr/bin/env python3
"""rust-engineer's one hook: cargo check after an edit, fed back as information.

PostToolUse on Edit|Write|Bash. After an Edit or Write to a .rs file, or a Bash command that
leaves .rs files changed, untracked or deleted in the project, it runs
`cargo check --offline -p <crates> --all-targets --message-format=short` on the affected crates
and hands the errors and warnings to the agent as additionalContext. It never blocks: it is
guidance, and the gates are the repo's CI and its review checks. Silent when the crates check clean;
a skip is said once per session and is silent after that, so silence after a skip means unchecked.

Trust, not deny-lists: cargo check runs a repo's build scripts and proc macros, so no hook can make
an untrusted repo safe. The hook runs only when the project's real path is under a trusted root
listed in ~/.config/engineer-agents/trusted-roots (hookkit.py says how that file is read; nothing is
trusted by default). Elsewhere it says "not a trusted repo; type check skipped" once per session.

The toolchain is the repo's own pin when it is installed: the channel in the nearest rust-toolchain
or rust-toolchain.toml at or above the workspace, as rustup searches, matched against
`rustup toolchain list`. With no pin it is the user's `rustup default`. The hook never installs a
toolchain: RUSTUP_AUTO_INSTALL is 0, and a pinned channel that is not installed is said once per
session and its workspace skipped. Every report names the toolchain used.

Inside a trusted repo it still neutralizes the environment: RUSTUP_TOOLCHAIN is set to the toolchain
chosen above (rustup is asked from /, outside the project), RUSTC_WRAPPER, RUSTC_WORKSPACE_WRAPPER,
RUSTFLAGS and CARGO_ENCODED_RUSTFLAGS are cleared, cargo comes from outside the project, the
workspace must be inside the project, and each package name reaches cargo as its own argv item
matching [A-Za-z0-9_-]+ and not starting with -. Every child runs in its own process group under one
deadline (RUST_ENGINEER_DEADLINE_S, default 300 s).

The runner, trust, state, safe git, the changed-file list and its signature are hookkit's. After Bash the check is
skipped when no .rs file changed since the last Bash report.

Repo standards are not checked here: the agent's own checklist and the rulebook review hold them.
"""
import json
import os
import re
import sys
import tomllib

import hookkit
from hookkit import (UNTRUSTED, Deadline, HookCannotRun, Runner, changed_files, for_agent, info, inside,
                     project_root, read_state, signature, trusted, write_state)

NAME = "rust-engineer"
DEFAULT_DEADLINE_S = 300.0
SKIP_DIRS = ("target",)
CLEARED_ENV = ("RUSTC_WRAPPER", "RUSTC_WORKSPACE_WRAPPER", "RUSTFLAGS", "CARGO_ENCODED_RUSTFLAGS")
PKG_NAME = re.compile(r"[A-Za-z0-9_-]+")
CHANNEL = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")  # a toolchain name, never a path
DIAG = re.compile(r"^[^ ]+:[0-9]+:[0-9]+: (error|warning)|^error(\[|:)")


def first_time(data, proj: str, what: str) -> bool:
    """True once per session and project (hookkit's state)."""
    return hookkit.once(NAME, data, proj, what)


def package_of(path: str, proj: str):
    """(crate dir, package name) of the nearest Cargo.toml with a [package], not above proj."""
    d = os.path.dirname(path)
    while inside(d, proj):
        toml = os.path.join(d, "Cargo.toml")
        if os.path.isfile(toml):
            try:
                with open(toml, "rb") as f:
                    name = tomllib.load(f).get("package", {}).get("name")
            except (OSError, tomllib.TOMLDecodeError) as e:
                raise HookCannotRun(f"{os.path.relpath(toml, proj)} could not be read as TOML: {e}")
            if isinstance(name, str):
                return d, name
        if d == proj:
            break
        d = os.path.dirname(d)
    return None


def find_tool(name: str, proj: str) -> str:
    """Absolute path of name from an absolute PATH entry or ~/.cargo/bin, outside proj."""
    dirs = [d for d in os.environ.get("PATH", "").split(os.pathsep) if os.path.isabs(d)]
    for d in dirs + [os.path.expanduser("~/.cargo/bin")]:
        c = os.path.join(d, name)
        if os.path.isfile(c) and os.access(c, os.X_OK) and not inside(os.path.realpath(c), proj):
            return c
    raise HookCannotRun(f"{name} (not on PATH or at ~/.cargo/bin, outside the project)")


def default_toolchain(run: Runner, rustup: str):
    """rustup's default toolchain, or None when none is set (a repo's pin can still name one)."""
    r = run.run([rustup, "default"], cwd="/")
    channel = (r.stdout.split() or [""])[0]
    return channel if r.returncode == 0 and channel and not channel.startswith("no") else None


def rustup_host(run: Runner, rustup: str):
    """rustup's configured host triple, from `rustup show`'s "Default host:" line, or None."""
    r = run.run([rustup, "show"], cwd="/")
    for line in r.stdout.splitlines():
        if line.startswith("Default host:"):
            return line.split(":", 1)[1].strip() or None
    return None


def pinned_channel(ws: str):
    """(channel or None, file) from the nearest rust-toolchain or rust-toolchain.toml at or above ws, the way
    rustup searches (the legacy name wins when a folder has both); None when no folder has one."""
    d = ws
    while True:
        for name in ("rust-toolchain", "rust-toolchain.toml"):
            f = os.path.join(d, name)
            if os.path.isfile(f):
                with open(f, encoding="utf-8") as fh:
                    text = fh.read()
                try:
                    channel = tomllib.loads(text).get("toolchain", {}).get("channel")
                except tomllib.TOMLDecodeError:
                    channel = None  # a legacy one-line file is not TOML
                if isinstance(channel, str):
                    return channel, f
                lines = [l.strip() for l in text.splitlines() if l.strip()]
                bare = name == "rust-toolchain" and len(lines) == 1 and "=" not in lines[0] and "[" not in lines[0]
                return (lines[0] if bare else None), f
        if os.path.dirname(d) == d:
            return None
        d = os.path.dirname(d)


def installed_toolchain(run: Runner, rustup: str, channel: str):
    """The installed toolchain's full name for a pinned channel, or None. A channel is followed by its host
    triple, so `nightly` does not match `nightly-2026-01-01-<host>`."""
    r = run.run([rustup, "toolchain", "list"], cwd="/")
    if r.returncode != 0:
        raise HookCannotRun(f"`rustup toolchain list` failed: {(r.stderr or r.stdout).strip()[:200]}")
    found = []
    for line in r.stdout.splitlines():
        name = (line.split() or [""])[0]
        rest = name[len(channel) + 1:]
        if name == channel or (name.startswith(channel + "-") and rest and not rest[0].isdigit()):
            found.append(name)
    host = rustup_host(run, rustup)
    for name in found:
        if name == channel or (host and name == f"{channel}-{host}"):
            return name  # the pin for this machine's host, never a cross toolchain listed first
    return found[0] if len(found) == 1 and host is None else None


def cargo_env(toolchain: str) -> dict:
    env = {k: v for k, v in os.environ.items() if k not in CLEARED_ENV}
    return dict(env, RUSTUP_TOOLCHAIN=toolchain, RUSTUP_AUTO_INSTALL="0", CARGO_TERM_COLOR="never")


def targets(data, run: Runner, proj: str):
    """The .rs files whose crates to check: the edited file, or after Bash every changed, untracked or deleted one in
    the project (a deleted module breaks the crate that declared it); none when Bash left them as the last Bash
    report saw them."""
    tool = data.get("tool_name", "")
    if tool in ("Edit", "Write"):
        f = (data.get("tool_input") or {}).get("file_path", "")
        return [os.path.realpath(f)] if isinstance(f, str) and f.endswith(".rs") and os.path.exists(f) else []
    if tool != "Bash":
        return []
    files, gone = changed_files(run, proj, (".rs",), SKIP_DIRS)
    if not files and not gone:
        return []
    sig, key = signature(files, gone), hookkit.state_file(NAME, data, proj, "sig")
    if read_state(key) == sig:
        return []  # no Rust changed since the last Bash report
    write_state(key, sig)
    return files + gone


def check(data) -> str:
    proj = project_root(data)
    if not trusted(proj):
        return UNTRUSTED if first_time(data, proj, "untrusted") else ""
    return check_crates(data, proj)


def check_crates(data, proj: str) -> str:
    run = Runner(hookkit.deadline_s(NAME, DEFAULT_DEADLINE_S))
    pkgs, out, sel = {}, [], ""
    try:
        for path in targets(data, run, proj):
            pkg = package_of(path, proj) if inside(path, proj) else None  # outside, or a symlink out: ignored
            if not pkg:
                continue
            if PKG_NAME.fullmatch(pkg[1]) and not pkg[1].startswith("-"):
                pkgs.setdefault(pkg[0], pkg[1])
            else:
                out.append(f"skipped: package name {pkg[1]!r} in {pkg[0]}/Cargo.toml is not [A-Za-z0-9_-]+ "
                           "(or starts with -), so cargo check did not run on it; run it yourself.")
        if not pkgs:
            return "\n\n".join(out)
        cargo, rustup = find_tool("cargo", proj), find_tool("rustup", proj)
        default = default_toolchain(run, rustup)
        # locate-project runs on the default, so a pin can never start an install; with no default it runs
        # with installs off and whatever toolchain the folder resolves to.
        env = cargo_env(default) if default else {k: v for k, v in cargo_env("").items() if k != "RUSTUP_TOOLCHAIN"}
        by_ws = {}
        for d, name in pkgs.items():
            r = run.run([cargo, "locate-project", "--workspace", "--message-format", "plain", "--offline"],
                        cwd=d, env=env)
            ws = os.path.realpath(os.path.dirname(r.stdout.strip())) if r.returncode == 0 else d
            if inside(ws, proj):
                by_ws.setdefault(ws, []).append(name)
            else:
                out.append(f"skipped: {name}'s cargo workspace {ws} is outside the project, so cargo check "
                           "did not run on it.")
        for ws, names in sorted(by_ws.items()):
            plist = [a for n in sorted(names) for a in ("-p", n)]
            sel = " ".join(plist)  # display only; cargo gets plist
            pin, toolchain = pinned_channel(ws), default
            if not pin and default is None:
                if first_time(data, proj, "no-default"):
                    out.append(f"skipped: rustup has no default toolchain and {ws} pins none, so cargo check did "
                               f"not run on {sel}. Run `rustup default stable` or pin one; said once per session.")
                continue
            if pin:
                channel, pin_file = pin
                usable = channel is not None and CHANNEL.fullmatch(channel) is not None
                toolchain = installed_toolchain(run, rustup, channel) if usable else None
                if toolchain is None:
                    why = (f"pins toolchain {channel}, which is not installed" if usable
                           else "names no channel this hook can use")
                    if first_time(data, proj, f"toolchain:{pin_file}:{channel}"):
                        out.append(f"skipped: {pin_file} {why}, and the hook installs nothing, so cargo check "
                                   f"did not run on {sel}. Install the toolchain or run the check yourself; "
                                   "this is said once per session.")
                    continue
            r = run.run([cargo, "check", "--offline", *plist, "--all-targets", "--message-format=short"],
                        cwd=ws, env=cargo_env(toolchain))
            text = r.stdout + r.stderr
            diag = [l for l in text.splitlines() if DIAG.search(l) and not l.startswith("warning: `")][:60]
            if r.returncode != 0:
                out.append(f"cargo check --offline {sel} failed (toolchain {toolchain}). "
                           "Fix these errors before the next edit:\n"
                           + "\n".join(diag or text.splitlines()[-30:]))
            elif diag:
                out.append(f"cargo check --offline {sel} passed with warnings (toolchain {toolchain}; "
                           "CI runs clippy -D warnings; "
                           "fix them before you finish):\n" + "\n".join(diag))
        return "\n\n".join(out)
    except Deadline as e:
        return (f"cargo check timed out: the hook's {run.limit_s:g} s deadline passed while running "
                f"`{' '.join(e.cmd[:6])}`, and it was killed, so nothing was checked. Run "
                f"`cargo check --offline {sel or '-p <crate>'} --all-targets` yourself before you finish.")


def main(argv) -> int:
    try:
        data = json.loads(sys.stdin.read())
        if not isinstance(data, dict):
            raise ValueError("not an object")
    except ValueError as e:
        json.dump(info(f"hook could not run: hook input unreadable ({e}). cargo check did not run; run it yourself."),
                  sys.stdout)
        return 0
    if not for_agent(argv, data):
        return 0  # plugin hooks fire in every agent; keep this one to NAME or plugin:NAME
    try:
        text = check(data)
    except HookCannotRun as e:
        text = f"hook could not run: {e}. cargo check did not run; run it yourself and report the hook problem."
    except Exception as e:  # noqa: BLE001 - a crash is reported, never silent
        text = f"hook could not run: cargo-check crashed: {type(e).__name__}: {e}"
    if text:
        json.dump(info(text), sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
