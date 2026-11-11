// expect: prints false (rustc --edition 2024 float-rounding.rs && ./float-rounding)
fn main() {
    println!("{}", 0.1_f64 + 0.2 == 0.3);
}
