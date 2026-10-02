# Graphify Setup

[graphify](https://pypi.org/project/graphifyy/) turns this workspace into a knowledge graph that Claude Code can query. Follow these steps to set it up.

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- [Claude Code](https://claude.com/claude-code)

## Steps

### 1. Install the graphify CLI

```bash
uv tool install graphifyy
```

The package is `graphifyy` (double "y"); the command it provides is `graphify`.

### 2. Register the skill with Claude Code

```bash
graphify install
```

This copies the skill to `~/.claude/skills/graphify/` and adds a graphify section to `~/.claude/CLAUDE.md`, so `/graphify` works in Claude Code.

### 3. Build the graph

Skip this step if `graphify-out/` already exists in the repo.

```bash
cd r2sdet_AI
claude /graphify .
```

Output goes to `graphify-out/`:

| File | Purpose |
|------|---------|
| `graph.json` | Graph data used for queries |
| `graph.html` | Interactive graph, open in a browser |
| `GRAPH_REPORT.md` | Core nodes, communities, surprising connections |
| `manifest.json`, `cache/` | Per-file cache so updates skip unchanged files |

### 4. Install the git hooks and merge driver

```bash
graphify hook install
```

This sets up:

- `post-commit` hook: rebuilds the graph after each commit (code only, no LLM).
- `post-checkout` hook: rebuilds the graph when switching branches.
- `merge.graphify` driver in `.git/config`: union-merges `graph.json` instead of conflicting. It is enabled by this line in `.gitattributes`:

  ```
  graphify-out/graph.json merge=graphify
  ```

Hooks and `.git/config` are local and not pushed, so run this step after every fresh clone.

### 5. Commit the graph

```bash
git add graphify-out .gitattributes
git commit -m "chore: add graphify knowledge graph and merge driver"
git push
```

## Everyday commands

```bash
graphify update .            # re-extract code and refresh the graph
graphify explain "X"         # explain a node and its neighbours
graphify path "A" "B"        # shortest path between two nodes
```

Set `GRAPHIFY_SKIP_HOOK=1` to skip the automatic rebuild for a single commit.
