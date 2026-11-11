"""What the engineer agents' checker hooks share: the trust check, the per-user state dir, a deadline-bound runner,
safe git, the changed-file list and the report envelope. One home, so a fix to trust or state lands in every hook.

A hook passes its own NAME (the agent it serves): the state dir is ~/.cache/<NAME>-hooks (or $XDG_STATE_HOME), and
the deadline override is <NAME as UPPER_SNAKE>_DEADLINE_S.

Trust, not deny-lists: a checker runs project code (the project's own compiler, its build scripts, its plugins), so no
hook can make an untrusted repo safe. A hook
runs only when CLAUDE_PROJECT_DIR's real path is under a trusted root: each absolute path in
~/.config/engineer-agents/trusted-roots, one per line (read only when it is a regular file the user owns and no one
else can write). Nothing is trusted by default.
"""
import hashlib
import os
import shutil
import signal
import stat
import subprocess
import time

ROOTS_FILE = "~/.config/engineer-agents/trusted-roots"
UNTRUSTED = "not a trusted repo; type check skipped"
GIT_SAFE = ["-c", "core.fsmonitor=", "-c", "core.hooksPath=/dev/null"]
GIT_ENV = dict(os.environ, GIT_CONFIG_NOSYSTEM="1", GIT_TERMINAL_PROMPT="0", GIT_OPTIONAL_LOCKS="0")


class HookCannotRun(Exception):
    pass


class Deadline(Exception):
    """The total deadline passed; `cmd` is the child that was running or about to run."""

    def __init__(self, cmd=()):
        super().__init__(" ".join(cmd))
        self.cmd = list(cmd)


class Runner:
    """Every child in its own process group, against one total deadline. On the deadline the group is killed."""

    def __init__(self, limit_s):
        self.limit_s = limit_s
        self.end = time.monotonic() + limit_s

    def run(self, cmd, cwd=None, env=None, stdin=None):
        left = self.end - time.monotonic()
        if left <= 0:
            raise Deadline(cmd)
        p = subprocess.Popen(cmd, cwd=cwd, env=env, start_new_session=True,
                             stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            out, err = p.communicate(stdin.encode() if stdin is not None else None, timeout=left)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            p.communicate()
            raise Deadline(cmd)
        return subprocess.CompletedProcess(cmd, p.returncode, out.decode("utf-8", "replace"),
                                           err.decode("utf-8", "replace"))


def deadline_s(name, default_s):
    var = name.upper().replace("-", "_") + "_DEADLINE_S"
    raw = os.environ.get(var, "")
    try:
        return float(raw) if raw else default_s
    except ValueError:
        raise HookCannotRun(f"{var}={raw!r} is not a number")


# ---------- paths and state ----------

def git_top(folder):
    """The git work tree's top folder holding `folder`, or None."""
    try:
        r = subprocess.run(["git", "-C", folder, "rev-parse", "--show-toplevel"], capture_output=True, text=True,
                           timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        return None
    top = r.stdout.strip()
    return os.path.realpath(top) if r.returncode == 0 and top else None


def project_root(data=None):
    """The repo the tool call worked in. An entered worktree moves the session's cwd but not CLAUDE_PROJECT_DIR, so:
    an edited file's work tree, else the hook input's cwd's work tree, else CLAUDE_PROJECT_DIR."""
    if isinstance(data, dict):
        f = (data.get("tool_input") or {}).get("file_path") if data.get("tool_name") in ("Edit", "Write") else None
        for folder in (os.path.dirname(f) if isinstance(f, str) and f else None, data.get("cwd")):
            if isinstance(folder, str) and os.path.isdir(folder):
                top = git_top(folder)
                if top:
                    return top
    p = os.environ.get("CLAUDE_PROJECT_DIR")
    if not p:
        raise HookCannotRun("CLAUDE_PROJECT_DIR is not set")
    return os.path.realpath(p)


def inside(path, root):
    rp = os.path.realpath(path)
    return rp == root or rp.startswith(root + os.sep)


def private_file(path):
    """Text of a regular file the user owns that no one else can write; None when absent. Refuses a symlink."""
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    except FileNotFoundError:
        return None
    except OSError as e:
        raise HookCannotRun(f"{path}: {e} (a symlink is refused)")
    with os.fdopen(fd, encoding="utf-8") as f:
        st = os.fstat(f.fileno())
        if not stat.S_ISREG(st.st_mode) or st.st_uid != os.getuid() or st.st_mode & 0o022:
            raise HookCannotRun(f"{path} must be a regular file you own that no one else can write")
        return f.read()


def trusted(root):
    roots = []
    for line in (private_file(os.path.expanduser(ROOTS_FILE)) or "").splitlines():
        line = os.path.expanduser(line.strip())
        if os.path.isabs(line):
            roots.append(line)
    return any(inside(root, os.path.realpath(r)) for r in roots)


def rel(path, root):
    return os.path.relpath(path, root)


def state_dir(name):
    """Per-user 0700 dir; refuses one that is a symlink, another user's, or open to others."""
    xdg = os.environ.get("XDG_STATE_HOME", "")
    base = xdg if os.path.isabs(xdg) else os.path.join(os.path.expanduser("~"), ".cache")
    d = os.path.join(base, f"{name}-hooks")
    try:
        os.makedirs(base, mode=0o700, exist_ok=True)
        try:
            os.mkdir(d, 0o700)
        except FileExistsError:
            pass
        st = os.lstat(d)
    except OSError as e:
        raise HookCannotRun(f"state dir {d}: {e}")
    if stat.S_ISLNK(st.st_mode) or not stat.S_ISDIR(st.st_mode):
        raise HookCannotRun(f"state dir {d} is a symlink or not a directory")
    if st.st_uid != os.getuid():
        raise HookCannotRun(f"state dir {d} is owned by uid {st.st_uid}, not {os.getuid()}")
    if stat.S_IMODE(st.st_mode) != 0o700:
        raise HookCannotRun(f"state dir {d} has mode {oct(stat.S_IMODE(st.st_mode))}, not 0o700")
    return d


def state_file(name, data, root, what):
    k = f"{data.get('session_id', '')}\0{data.get('agent_id', '')}\0{root}\0{what}"
    return os.path.join(state_dir(name), hashlib.sha256(k.encode()).hexdigest()[:32])


def read_state(p):
    try:
        fd = os.open(p, os.O_RDONLY | os.O_NOFOLLOW)
    except FileNotFoundError:
        return None
    except OSError as e:
        raise HookCannotRun(f"state file {p}: {e}")
    with os.fdopen(fd, encoding="utf-8") as f:
        return f.read()


def write_state(p, v):
    fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(v)


def once(name, data, root, what):
    """True the first time this session asks about `what` in this project."""
    key = state_file(name, data, root, what)
    if read_state(key) is not None:
        return False
    write_state(key, "")
    return True


# ---------- which files ----------

def git(run, cwd, *args):
    if not shutil.which("git"):
        raise HookCannotRun("git not found on PATH")
    return run.run(["git", *GIT_SAFE, "-C", cwd, *args], env=GIT_ENV)


def changed_files(run, root, exts, skip_dirs):
    """(files, gone) for names ending in `exts` inside root, none under a `skip_dirs` folder: `files` are the real
    paths of changed and untracked files, `gone` the paths git lists that no longer exist (a deleted file, a
    rename's old name), whose importers may now be broken. ([], []) outside git."""
    top = git(run, root, "rev-parse", "--show-toplevel")
    if top.returncode != 0:
        return [], []
    top = top.stdout.strip()
    r = git(run, top, "status", "--porcelain=v1", "-z", "-uall")
    if r.returncode != 0:
        raise HookCannotRun("git status failed: " + r.stderr.strip()[:300])
    parts, files, gone, i = r.stdout.split("\0"), set(), set(), 0
    while i < len(parts):
        entry = parts[i]
        i += 1
        if len(entry) < 4:
            continue
        names = [entry[3:]]
        if entry[0] in "RC":
            names.append(parts[i])  # -z puts the rename or copy source next
            i += 1
        for name in names:
            path = os.path.join(top, name)
            if not path.endswith(exts) or not inside(path, root) or set(skip_dirs) & set(name.split("/")):
                continue
            if os.path.isfile(path):
                files.add(os.path.realpath(path))
            elif not os.path.lexists(path):
                gone.add(os.path.realpath(path))
    return sorted(files), sorted(gone)


def signature(files, gone=()):
    h = hashlib.sha256()
    for path in files:
        st = os.stat(path)
        h.update(f"{path}:{st.st_mtime_ns}:{st.st_size}\n".encode())
    for path in gone:
        h.update(f"{path}:gone\n".encode())
    return h.hexdigest()


def info(text):
    return {"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": text}}


def for_agent(argv, data):
    """False when `--agent NAME` is given, once or more, and the hook input is from an agent it does not name
    or from the main session."""
    wants = [argv[i + 1] for i, arg in enumerate(argv[:-1]) if arg == "--agent"]
    if not wants:
        return True
    got = data.get("agent_type")
    return isinstance(got, str) and any(is_agent(got, want) for want in wants)


# This plugin's own agent prefix. Only this plugin's agents (or a bare agent of the same name) match, never
# another plugin's agent that happens to share a name.
PLUGIN_PREFIX = "runtime-engineering:"


def is_agent(got: str, want: str) -> bool:
    return got == want or got == PLUGIN_PREFIX + want


def agent_name(argv, data, default):
    """The `--agent NAME` the hook input's agent_type matched (its plugin prefix dropped), for report text;
    `default` when the hook names no agent or the input matches none."""
    got = data.get("agent_type") if isinstance(data, dict) else None
    if isinstance(got, str):
        for i, arg in enumerate(argv[:-1]):
            if arg == "--agent" and is_agent(got, argv[i + 1]):
                return argv[i + 1]
    return default
