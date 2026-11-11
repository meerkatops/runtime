#![allow(
    clippy::unwrap_used,
    clippy::indexing_slicing,
    reason = "tests fail on the first unexpected value"
)]
//! Optional: only for a binary shipped as a Claude Code plugin; any other repo leaves this file out.
//! The answer contract, on the built binary run from a plugin cache with a newer version beside it: with
//! `--json` stdout holds exactly one JSON value, an object answer and a failure carry `version` and `newer`, a bare
//! array keeps its shape, and a person's footer goes to stderr.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

const VERSION: &str = env!("CARGO_PKG_VERSION");

/// A home for one test under cargo's temp folder for integration tests, holding a plugin cache with this build
/// installed and a newer 99.0.0 beside it; removed when the test ends.
struct Cache {
    home: PathBuf,
    exe: PathBuf,
}

impl Cache {
    fn new(name: &str) -> Cache {
        let home =
            Path::new(env!("CARGO_TARGET_TMPDIR")).join(format!("{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&home);
        let plugin = home.join(".claude/plugins/cache/<marketplace>/<plugin>");
        let bin = plugin.join(VERSION).join("bin/aarch64-apple-darwin");
        fs::create_dir_all(&bin).unwrap();
        fs::create_dir_all(plugin.join("99.0.0")).unwrap();
        let exe = bin.join("<bin>");
        fs::copy(env!("CARGO_BIN_EXE_<bin>"), &exe).unwrap();
        Cache { home, exe }
    }

    fn run(&self, args: &[&str]) -> Output {
        Command::new(&self.exe)
            .args(args)
            .current_dir(&self.home)
            .env("HOME", &self.home)
            .output()
            .unwrap()
    }
}

impl Drop for Cache {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.home);
    }
}

/// `bytes` as exactly one JSON value, surrounding whitespace allowed.
fn one_value(bytes: &[u8]) -> serde_json::Value {
    let mut values = serde_json::Deserializer::from_slice(bytes).into_iter::<serde_json::Value>();
    let first = values.next().unwrap().unwrap();
    assert!(
        values.next().is_none(),
        "more than one value: {}",
        String::from_utf8_lossy(bytes)
    );
    first
}

#[test]
fn an_object_answer_is_one_value_carrying_the_version_and_the_newer_install() {
    let cache = Cache::new("answer-object");
    let ran = cache.run(&["--json", "<object-verb>"]);
    assert!(ran.status.success(), "{ran:?}");
    let answer = one_value(&ran.stdout);
    assert_eq!(answer["version"], VERSION, "{answer}");
    assert_eq!(answer["newer"], "99.0.0", "{answer}");
    assert!(ran.stderr.is_empty(), "{ran:?}");
}

#[test]
fn a_bare_array_keeps_its_shape() {
    let cache = Cache::new("answer-array");
    let ran = cache.run(&["--json", "<array-verb>"]);
    assert!(ran.status.success(), "{ran:?}");
    assert!(one_value(&ran.stdout).is_array(), "{ran:?}");
}

#[test]
fn a_json_failure_is_one_object_carrying_the_version_exit_and_newer_install() {
    let cache = Cache::new("answer-failure");
    let failed = cache.run(&["--json", "no-such-verb"]);
    let code = failed.status.code().unwrap();
    assert_ne!(code, 0);
    // Whichever stream carries the failure, the two together are that one object.
    let mut both = failed.stdout.clone();
    both.extend_from_slice(&failed.stderr);
    let failure = one_value(&both);
    assert_eq!(failure["exit"], code, "{failure}");
    assert_eq!(failure["version"], VERSION, "{failure}");
    assert_eq!(failure["newer"], "99.0.0", "{failure}");
}

#[test]
fn a_persons_text_leaves_stdout_empty_and_ends_with_the_footer_on_stderr() {
    let cache = Cache::new("answer-text");
    let ran = cache.run(&["--version"]);
    assert!(ran.status.success(), "{ran:?}");
    assert!(ran.stdout.is_empty(), "{ran:?}");
    let text = String::from_utf8(ran.stderr).unwrap();
    assert!(text.ends_with(&format!("<bin> {VERSION}\n")), "{text}");
}
