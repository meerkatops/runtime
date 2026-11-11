#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::print_stderr,
    reason = "test fixtures: a fixture that cannot be built fails the test; a skipped test says why on stderr"
)]
//! Test fixtures: each test's repo and HOME inside its own temp folder, git run with an env built from nothing,
//! and the one `find_on_path`. A fixture never reads or writes outside its folder or in a real checkout; a test
//! hands the command under test `root()` as the folder to work in. A path a test writes is checked component by
//! component, since `Path::starts_with` is lexical and lets `..` through.

use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicUsize, Ordering};

static FIXTURES: AtomicUsize = AtomicUsize::new(0);

/// One test's folder under cargo's temp folder for integration tests, holding `repo/` and `home/`; removed when
/// dropped.
pub struct Fixture {
    dir: PathBuf,
    git: PathBuf,
}

impl Fixture {
    /// A fresh folder named for the test, with an empty repository on `main` and an empty HOME. `test` is one
    /// path component; the folder is new (`create_dir`, never a pre-deleted predictable path), so two fixtures with
    /// one label in one process never share it.
    ///
    /// # Panics
    /// When `test` is not a single plain component, when the folder cannot be made, or when git is not on PATH.
    pub fn new(test: &str) -> Fixture {
        assert!(
            one_component(test),
            "{test:?} is not a single path component"
        );
        let git = find_on_path("git").expect("the fixtures need git on PATH");
        let n = FIXTURES.fetch_add(1, Ordering::Relaxed);
        let dir = Path::new(env!("CARGO_TARGET_TMPDIR"))
            .join(format!("{test}-{}-{n}", std::process::id()));
        std::fs::create_dir_all(dir.parent().unwrap()).unwrap();
        std::fs::create_dir(&dir).unwrap_or_else(|e| panic!("{}: {e}", dir.display()));
        let fixture = Fixture { dir, git };
        std::fs::create_dir(fixture.root()).unwrap();
        std::fs::create_dir(fixture.home()).unwrap();
        let _ = fixture.git(&["init", "-q", "-b", "main"]);
        fixture
    }

    /// The repository's top, given to the command under test as the folder to work in.
    #[must_use]
    pub fn root(&self) -> PathBuf {
        self.dir.join("repo")
    }

    /// The HOME every child of this fixture runs with.
    #[must_use]
    pub fn home(&self) -> PathBuf {
        self.dir.join("home")
    }

    /// Runs git in the repo and answers its stdout. The child's env is built from nothing (so no `GIT_DIR`,
    /// `GIT_CONFIG_*`, `XDG_CONFIG_HOME` or other override from the outer run or a hook reaches it), with the
    /// fixture's HOME, no system config and this run's PATH.
    ///
    /// # Panics
    /// When git cannot be started, exits non-zero, or writes bytes that are not UTF-8.
    #[must_use]
    pub fn git(&self, args: &[&str]) -> String {
        let out = Command::new(&self.git)
            .current_dir(self.root())
            .args([
                "-c",
                "user.name=Fixture",
                "-c",
                "user.email=fixture@fixture",
                "-c",
                "commit.gpgsign=false",
            ])
            .args(args)
            .env_clear()
            .env("PATH", std::env::var_os("PATH").unwrap_or_default())
            .env("HOME", self.home())
            .env("GIT_CONFIG_NOSYSTEM", "1")
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "git {args:?}: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        String::from_utf8(out.stdout).unwrap()
    }

    /// Writes `content` at `path` inside the repo, making its folders. `path` is relative with plain components
    /// only (no `..`, no root, no prefix), and the file is new: a second write to one path is a test bug, not an
    /// overwrite.
    ///
    /// # Panics
    /// When `path` would leave the repo, when a folder on it is a symlink, or when the file exists. Each existing
    /// ancestor is checked with `symlink_metadata` before any folder is made, so a symlink on the path creates
    /// nothing outside the fixture.
    pub fn write(&self, path: &str, content: &str) {
        let rel = Path::new(path);
        assert!(
            rel.components().all(|c| matches!(c, Component::Normal(_)))
                && rel.components().count() > 0,
            "{path:?} is not a relative path of plain components"
        );
        let file = self.root().join(rel);
        let mut ancestor = self.root();
        for part in rel.components().take(rel.components().count() - 1) {
            ancestor.push(part);
            let Ok(meta) = std::fs::symlink_metadata(&ancestor) else {
                // Not there yet: nothing below it exists either, so the rest is safe to create.
                break;
            };
            assert!(
                !meta.file_type().is_symlink(),
                "{} is a symlink",
                ancestor.display()
            );
            assert!(meta.is_dir(), "{} is not a folder", ancestor.display());
        }
        if let Some(parent) = file.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        let mut f = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&file)
            .unwrap_or_else(|e| panic!("{}: {e}", file.display()));
        std::io::Write::write_all(&mut f, content.as_bytes()).unwrap();
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

fn one_component(name: &str) -> bool {
    let mut parts = Path::new(name).components();
    matches!(
        (parts.next(), parts.next()),
        (Some(Component::Normal(_)), None)
    )
}

/// The executable `tool` on this run's PATH, or `None` after printing `SKIPPED: <tool> not on PATH`; never a panic.
/// A test that needs a real tool returns early on `None`.
#[must_use]
pub fn find_on_path(tool: &str) -> Option<PathBuf> {
    use std::os::unix::fs::PermissionsExt as _;
    let found = std::env::var_os("PATH").and_then(|path| {
        std::env::split_paths(&path)
            .filter(|dir| dir.is_absolute())
            .map(|dir| dir.join(tool))
            .find(|candidate| {
                std::fs::metadata(candidate)
                    .is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
            })
    });
    if found.is_none() {
        eprintln!("SKIPPED: {tool} not on PATH");
    }
    found
}
