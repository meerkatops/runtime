// expect: compiles (rustc --edition 2024 -D unsafe_code allow-below-deny.rs)
#![allow(unsafe_code)]
#![deny(unsafe_op_in_unsafe_fn)]
fn main() {
    let x = 5u32;
    let p = &raw const x;
    // SAFETY: p points at x, which is alive and aligned for the whole read.
    let y = unsafe { p.read() };
    assert_eq!(y, 5);
}
