//! The crate's shared types: its one `Error`, the entities and requests the plan names, and the `not_built`
//! helper every stub returns through. No logic belongs here; behavior lives in the module that owns it.

use core::fmt;

/// Everything this crate can fail with: one enum per crate, a variant and a `From` for each wrapped cause.
#[derive(Debug)]
#[non_exhaustive]
pub enum Error {
    /// A stub was called before its task filled it.
    NotBuilt {
        /// The task that fills it.
        task: &'static str,
    },
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::NotBuilt { task } => write!(f, "not built yet: task {task} fills it"),
        }
    }
}

impl core::error::Error for Error {}

/// The error a stub returns until `task` fills it; a stub never panics.
#[must_use]
pub fn not_built(task: &'static str) -> Error {
    Error::NotBuilt { task }
}
