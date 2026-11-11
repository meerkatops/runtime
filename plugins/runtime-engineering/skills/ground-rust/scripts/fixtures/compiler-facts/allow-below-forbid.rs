// expect: E0453 (rustc --edition 2024 -F unsafe_code allow-below-forbid.rs)
#![allow(unsafe_code)]
fn main() {}
