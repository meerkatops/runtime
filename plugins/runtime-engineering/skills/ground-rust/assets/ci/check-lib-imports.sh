#!/bin/sh
# The lib layer's import ban, read from cargo's own graph. A lib-* crate never depends on a product crate (every
# workspace member not named lib-*), and depends on another lib-* crate only by an edge listed in $allowed. A lib-*
# crate and a *-core crate never depend on an async runtime named in $runtimes, directly or through any dependency:
# a runtime belongs to the entry crate.
# Every target is read (--target all), so a Linux-only dependency is seen on a Mac; normal, build and dev edges all
# count. Exit 0 clean; 1 a forbidden edge, one line each; 2 cargo could not answer.
set -u
cd "$(dirname "$0")/.." || exit 2
command -v cargo >/dev/null 2>&1 || PATH="$HOME/.cargo/bin:$PATH"

# The lib-to-lib edges this repo allows, "<lib>:<dep>" each, space-separated; a listed edge is a difference from
# the standard and is named in MAP.md. It never excuses a lib-to-product edge or an async runtime.
allowed=""
# The async runtimes no lib-* or *-core crate may depend on.
runtimes="tokio async-std smol"

name_of() { sed -n 's/^\([A-Za-z0-9_-][A-Za-z0-9_-]*\) v.*/\1/p'; }

if ! members=$(cargo tree --workspace --locked --depth 0 --prefix none --format '{p}' 2>&1); then
  printf 'check-lib-imports: cargo could not list the workspace:\n%s\n' "$members" >&2
  exit 2
fi
names=$(printf '%s\n' "$members" | name_of | sort -u)
libs=$(printf '%s\n' "$names" | grep '^lib-')
products=$(printf '%s\n' "$names" | grep -v '^lib-')
cores=$(printf '%s\n' "$names" | grep -e '-core$')
if [ -z "$libs" ]; then
  echo "check-lib-imports: the workspace has no lib-* crate, so nothing was checked" >&2
  exit 2
fi

status=0
for crate in $libs $cores; do
  tree() { cargo tree -p "$crate" --all-features --target all -e normal,build,dev --prefix none --format '{p}' --locked "$@" 2>&1; }
  if ! all=$(tree) || ! deps=$(tree --depth 1); then
    printf 'check-lib-imports: cargo could not read the dependencies of %s:\n%s\n' "$crate" "$all$deps" >&2
    exit 2
  fi
  # The runtime ban reads the whole tree, so a runtime reached through another dependency is seen too.
  for dep in $(printf '%s\n' "$all" | name_of | sort -u); do
    case " $runtimes " in *" $dep "*)
      echo "check-lib-imports: $crate may not depend on the async runtime $dep"
      status=1 ;;
    esac
  done
  for dep in $(printf '%s\n' "$deps" | name_of | sort -u); do
    [ "$dep" = "$crate" ] && continue
    case " $runtimes " in *" $dep "*) continue ;; esac
    # The rest is the lib layer's ban; a core crate is a product crate and imports as MAP.md says.
    case "$crate" in lib-*) ;; *) continue ;; esac
    case "$dep" in
      lib-*) case " $allowed " in *" $crate:$dep "*) continue ;; esac ;;
      *) case " $(echo $products) " in *" $dep "*) ;; *) continue ;; esac ;;
    esac
    echo "check-lib-imports: $crate may not depend on $dep"
    status=1
  done
done
# shellcheck disable=SC2086 # one word per crate name
[ "$status" -eq 0 ] && echo "check-lib-imports: no product crate and no async runtime under" $libs $cores
exit "$status"
