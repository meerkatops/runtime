//! The crash record (coding-rulebook A6): what a panic leaves behind, installed as `main`'s first statement, before
//! argument parsing and any logger. One JSON object per crash at `~/.<bin>/crashes/<time>-<pid>.json`, mode 0600 in a
//! 0700 folder, the last 50 kept; stderr keeps the default message through the previous hook. Nothing else sets a
//! panic hook. The context (verb, redacted args, session) lives in a `OnceLock`: `main` installs the hook first with
//! only the crashes folder known, then `set_context` once argument parsing has found the verb; a crash before that
//! records an empty verb. Under `panic = "abort"` the hook is the last code that runs: no Drop follows, and nothing
//! here may panic.

use std::backtrace::Backtrace;
use std::fmt::Write as _;
use std::io::Write as _;
use std::panic::PanicHookInfo;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};

const KEEP: usize = 50;

static CONTEXT: OnceLock<CrashContext> = OnceLock::new();

/// What the run knew once its arguments were parsed. Args are redacted by the caller (a value after a secret-bearing
/// flag is `***`); env holds names only, never values, and is read at crash time.
#[derive(Debug, Default, Clone)]
pub struct CrashContext {
    /// The verb being run.
    pub verb: String,
    /// The arguments after redaction.
    pub args: Vec<String>,
    /// The session id the run was given, if any.
    pub session: Option<String>,
}

/// Installs the panic hook; `main` calls it first, before anything that can panic. The previous hook (the default)
/// still runs, so stderr keeps its message.
pub fn install_crash_hook(crashes_dir: PathBuf) {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        write_crash(info, &crashes_dir);
        previous(info);
    }));
}

/// Gives the hook the verb, args and session once parsing has them. The first call wins; a later one is ignored,
/// so this never panics and never races the hook.
pub fn set_context(context: CrashContext) {
    let _ = CONTEXT.set(context);
}

/// The crash folder for `bin`: `$HOME/.<bin>/crashes`, or the current folder's `.<bin>/crashes` with no HOME.
#[must_use]
pub fn crashes_dir(bin: &str) -> PathBuf {
    std::env::var_os("HOME")
        .map_or_else(|| PathBuf::from("."), PathBuf::from)
        .join(format!(".{bin}"))
        .join("crashes")
}

fn write_crash(info: &PanicHookInfo<'_>, crashes_dir: &Path) {
    let empty = CrashContext::default();
    let context = CONTEXT.get().unwrap_or(&empty);
    let place = info.location().map_or_else(
        || "an unknown place".to_owned(),
        |at| format!("{}:{}", at.file(), at.line()),
    );
    let message = info.payload_as_str().unwrap_or("a panic with no message");
    let backtrace = Backtrace::force_capture().to_string();
    let time_s = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs());
    let pid = std::process::id();
    let cwd = std::env::current_dir().map_or_else(|_| "?".to_owned(), |p| p.display().to_string());
    let mut env_names: Vec<String> = std::env::vars_os()
        .map(|(k, _)| k.to_string_lossy().into_owned())
        .collect();
    env_names.sort();

    let mut record = String::with_capacity(4096);
    record.push('{');
    field(&mut record, "message", message);
    field(&mut record, "at", &place);
    field(&mut record, "backtrace", &backtrace);
    field(&mut record, "version", env!("CARGO_PKG_VERSION"));
    field(&mut record, "verb", &context.verb);
    list(&mut record, "args", &context.args);
    field(&mut record, "cwd", &cwd);
    list(&mut record, "env_names", &env_names);
    field(
        &mut record,
        "session",
        context.session.as_deref().unwrap_or(""),
    );
    // A write into a String cannot fail; the Result is dropped so the hook never panics.
    let _ = writeln!(record, "\"pid\":{pid},\"time_s\":{time_s}}}");

    // Every write's error is ignored here: a hook that fails must still let the abort happen.
    let _ = make_private_dir(crashes_dir);
    let file = crashes_dir.join(format!("{time_s}-{pid}.json"));
    if let Ok(mut f) = open_private(&file) {
        let _ = f.write_all(record.as_bytes());
        let _ = f.sync_all();
    }
    keep_last(crashes_dir, KEEP);
}

#[cfg(unix)]
fn make_private_dir(dir: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::DirBuilderExt as _;
    std::fs::DirBuilder::new()
        .recursive(true)
        .mode(0o700)
        .create(dir)
}

#[cfg(not(unix))]
fn make_private_dir(dir: &Path) -> std::io::Result<()> {
    std::fs::DirBuilder::new().recursive(true).create(dir)
}

#[cfg(unix)]
fn open_private(file: &Path) -> std::io::Result<std::fs::File> {
    use std::os::unix::fs::OpenOptionsExt as _;
    std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(file)
}

#[cfg(not(unix))]
fn open_private(file: &Path) -> std::io::Result<std::fs::File> {
    std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(file)
}

/// Removes the oldest `.json` records past `keep`; names sort by time since they start with the epoch seconds.
fn keep_last(dir: &Path, keep: usize) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    let mut names: Vec<PathBuf> = entries
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .collect();
    names.sort();
    let extra = names.len().saturating_sub(keep);
    for old in names.iter().take(extra) {
        let _ = std::fs::remove_file(old);
    }
}

fn field(out: &mut String, key: &str, value: &str) {
    out.push('"');
    out.push_str(key);
    out.push_str("\":");
    quoted(out, value);
    out.push(',');
}

fn list(out: &mut String, key: &str, values: &[String]) {
    out.push('"');
    out.push_str(key);
    out.push_str("\":[");
    for (i, v) in values.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        quoted(out, v);
    }
    out.push_str("],");
}

/// `value` as a JSON string, escaped by hand so the hook needs no serializer and cannot fail.
fn quoted(out: &mut String, value: &str) {
    out.push('"');
    for c in value.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", c as u32);
            }
            c => out.push(c),
        }
    }
    out.push('"');
}

#[cfg(test)]
mod tests {
    //! The record is one JSON object with every field coding-rulebook A6 names. This module only proves the escaping; the repo
    //! writes the integration test that proves the record under the release profile's `panic = "abort"`, by
    //! running the built binary with a verb that panics on purpose and reading the newest record.
    use super::quoted;

    #[test]
    fn a_message_with_quotes_and_newlines_is_one_json_string() {
        let mut out = String::new();
        quoted(&mut out, "a \"quoted\"\nline\t\u{1}");
        assert_eq!(out, "\"a \\\"quoted\\\"\\nline\\t\\u0001\"");
    }
}
