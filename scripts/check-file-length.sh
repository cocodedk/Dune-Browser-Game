#!/bin/sh
set -eu

MAX_LINES=200

is_limited_file() {
  case "$1" in
    src/*|website/*|scripts/*|.githooks/*|*.ts|*.tsx|*.js|*.jsx|*.css|*.html|*.sh)
      return 0
      ;;
    *.mjs|*.cjs|*.mts|*.cts)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

staged_files=$(git diff --cached --name-only --diff-filter=ACMR)

if [ -z "$staged_files" ]; then
  exit 0
fi

violations=""

for file in $staged_files; do
  if ! is_limited_file "$file"; then
    continue
  fi

  if ! git cat-file -e ":$file" 2>/dev/null; then
    continue
  fi

  line_count=$(git show ":$file" | wc -l | tr -d ' ')

  if [ "$line_count" -gt "$MAX_LINES" ]; then
    violations="${violations}${file}:${line_count}
"
  fi
done

if [ -n "$violations" ]; then
  echo "ERROR: Staged files must stay at or below ${MAX_LINES} lines."
  echo "Split large files before committing:"
  printf '%s' "$violations"
  exit 1
fi
