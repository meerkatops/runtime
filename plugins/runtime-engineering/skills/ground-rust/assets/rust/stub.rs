//! <What belongs here, in one line>; <what does not, and the module it goes to instead>.

use crate::types::{Error, not_built};

/// <One line: what it answers, with the unit in each name.>
///
/// # Errors
///
/// `Error::NotBuilt` until task <task> fills it.
pub fn <name>(_<input>: &<Input>) -> Result<<Output>, Error> {
    Err(not_built("<task>"))
}
