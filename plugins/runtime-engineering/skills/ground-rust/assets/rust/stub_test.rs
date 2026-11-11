//! <module>'s face, through the crate's public items. Task <task> replaces this test with the ones it fills.

use <crate>::types::Error;

#[test]
fn <name>_is_not_built_yet() {
    let answered = <crate>::<module>::<name>(&<input>);
    assert!(matches!(answered, Err(Error::NotBuilt { task: "<task>" })));
}
