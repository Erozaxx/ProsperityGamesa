#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
PARSER="$ROOT/tools/parse_agent_definitions.py"
DEFINITIONS_DIR="$ROOT/agent_definitions"
rc=0

compare_file_content() {
  local expected_file="$1"
  local actual_file="$2"
  local label="$3"
  if ! cmp -s "$expected_file" "$actual_file"; then
    printf 'Obsah neodpovídá definici: %s\n' "$label"
    rc=1
  fi
}

python3 "$PARSER" validate-dir "$DEFINITIONS_DIR" >/dev/null

expected_slugs="$(mktemp)"
cleanup() {
  rm -f "$expected_slugs"
}
trap cleanup EXIT

while IFS= read -r slug; do
  printf '%s\n' "$slug" >> "$expected_slugs"
  d="$ROOT/agents/$slug"
  definition_file="$(find "$DEFINITIONS_DIR" -type f -name "*-$slug.json" | sort | head -n 1)"
  if [[ -z "$definition_file" ]]; then
    printf 'Chybí definice agenta: %s\n' "$slug"
    rc=1
    continue
  fi
  for p in AGENTS.md CLAUDE.md CODEX.md logs context/inbox context/outbox artifacts/final state/current-task.md; do
    if [[ ! -e "$d/$p" ]]; then
      printf 'Chybí: %s/%s\n' "$slug" "$p"
      rc=1
    fi
  done
  # Zkontroluj že AGENTS.md má Gallup sekci (CLAUDE.md a CODEX.md jsou symlinky)
  if ! grep -q 'Gallup Talent Profile' "$d/AGENTS.md" 2>/dev/null; then
    printf 'Varování: %s/AGENTS.md chybí Gallup Talent Profile\n' "$slug"
    rc=1
  fi

  expected_doc="$(mktemp)"
  python3 "$PARSER" render-agent-doc "$definition_file" > "$expected_doc"
  compare_file_content "$expected_doc" "$d/AGENTS.md" "$slug/AGENTS.md"
  rm -f "$expected_doc"
done < <(python3 "$PARSER" list-slugs "$DEFINITIONS_DIR")

for d in "$ROOT"/agents/*; do
  [[ -d "$d" ]] || continue
  slug="$(basename "$d")"
  if ! grep -Fqx "$slug" "$expected_slugs"; then
    printf 'Neočekávaný agent workspace bez definice: %s\n' "$slug"
    rc=1
  fi
done

expected_table="$(python3 "$PARSER" catalog-table "$DEFINITIONS_DIR")"
expected_count="$(python3 "$PARSER" count "$DEFINITIONS_DIR")"
root_agents_content="$(<"$ROOT/AGENTS.md")"
readme_content="$(<"$ROOT/README.md")"
if [[ "$root_agents_content" != *"$expected_table"* ]]; then
  printf 'Obsah neodpovídá definicím: root AGENTS.md katalog agentů\n'
  rc=1
fi
if [[ "$readme_content" != *"## Dostupní agenti ($expected_count)"* ]]; then
  printf 'Obsah neodpovídá definicím: README.md count agentů\n'
  rc=1
fi
if [[ "$readme_content" != *"$expected_table"* ]]; then
  printf 'Obsah neodpovídá definicím: README.md katalog agentů\n'
  rc=1
fi

[[ $rc -eq 0 ]] && printf 'Všechny agent složky jsou v pořádku.\n'
exit $rc
