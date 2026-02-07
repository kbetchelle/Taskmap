#!/usr/bin/env bash
# Remove macOS ._* metadata files from .git/objects/pack that cause
# "non-monotonic index" errors. Run from repo root: bash scripts/fix-git-pack.sh

set -e
PACK_DIR=".git/objects/pack"
if [[ ! -d "$PACK_DIR" ]]; then
  echo "Not a git repo or no pack dir. Run from repo root."
  exit 1
fi
count=0
for f in "$PACK_DIR"/._*; do
  [[ -e "$f" ]] || continue
  rm -f "$f"
  echo "Removed: $f"
  ((count++)) || true
done
if [[ $count -eq 0 ]]; then
  echo "No ._* files found in $PACK_DIR"
else
  echo "Done. Removed $count file(s). Try: git add ."
fi
