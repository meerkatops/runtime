// expect: E0133 (rustc --edition 2024 set-var-2024.rs)
fn main() {
    std::env::set_var("FIXTURE", "1");
}
