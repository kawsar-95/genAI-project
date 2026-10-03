#!/usr/bin/env bash
# PreToolUse hook (matcher: Skill) -- graphify pre-hook.
# For the test-design and find-bug skills, runs `graphify query` itself and injects the
# result as context before the skill starts. Other skills pass through untouched.

in=$(cat)
skill=$(printf '%s' "$in" | jq -r '.tool_input.skill // empty')
printf '%s' "$skill" | grep -qE '(^|:)(test-design|find-bug)$' || exit 0

args=$(printf '%s' "$in" | jq -r '.tool_input.args // empty')
d=${CLAUDE_PROJECT_DIR:-$(printf '%s' "$in" | jq -r '.cwd // empty')}
while [ -n "$d" ] && [ "$d" != "/" ] && [ ! -f "$d/graphify-out/graph.json" ]; do d=$(dirname "$d"); done

emit() { jq -n --arg c "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",additionalContext:$c}}'; }

if [ ! -f "$d/graphify-out/graph.json" ]; then
  emit "graphify pre-hook: no graphify-out/graph.json found for this repo, so graphify was not queried before $skill. Say so in your output, or build the graph first with /graphify."
  exit 0
fi

# Query topic: the skill arguments when given, otherwise the graph's overview report.
if [ -n "$args" ]; then
  out=$(cd "$d" && timeout 30 graphify query "$args" --budget 1200 2>&1 | head -70)
  what="graphify query \"$args\""
else
  out=$(sed -n '1,45p' "$d/graphify-out/GRAPH_REPORT.md" 2>&1)
  what="graphify-out/GRAPH_REPORT.md overview (no skill arguments to query)"
fi

built=$(date -r "$d/graphify-out/graph.json" '+%Y-%m-%d %H:%M' 2>/dev/null)
head_c=$(git -C "$d" log -1 --format='%cd' --date=format:'%Y-%m-%d %H:%M' 2>/dev/null)

emit "graphify pre-hook ran for the '$skill' skill: $what
Graph built: $built | latest commit: $head_c (if the commit is newer, the graph may be stale; say so in your output, do not rebuild without asking).
Use this for domain rules, relationships and known findings. Narrow further with: graphify explain \"<node>\" or graphify path \"<A>\" \"<B>\". The Serena pre-hook has activated the repo's Serena project, so use get_symbols_overview / find_symbol / find_referencing_symbols for code relationships.

$out"
exit 0
