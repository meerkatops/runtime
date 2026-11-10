// Prints one line that proves this plugin's bundled script ran here.
import { hostname } from "node:os";

console.log(`hello-runtime 0.1.0 works on ${hostname()} · node ${process.version}`);
