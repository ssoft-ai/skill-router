# End-to-end evaluation

The skills come from `test/fixtures/catalog/skills.json`, their instructions from
`test/fixtures/catalog/bodies/`: a catalog written for these checks, with six domain skills the
Claude Code listing shows, 35 narrower skills nested inside them that it does not show, and 23 flat
skills it shows beside them. The cases fall in groups named by the first word of the case:

| Group | Cases | A run passes when |
|---|---|---|
| a language: `en`, `de`, `es`, `ru`, `zh` | one task for each of 31 nested skills, written in that language by an agent that saw the skill names and none of the descriptions | the agent loads that skill through `load_skill` |
| `nested` | one task for each of four nested skills described in an organisation's own terms - Beacon, Lumen, Ledger, Kite - written without those terms, so a search may return the domain skill and not the nested one | the agent loads that skill through `load_skill` |
| `none` | five requests no skill of the catalog applies to | the agent loads no skill |

## Running

```sh
node scripts/build-eval-root.js <output folder>
claude plugin eval <root> --trust-plugin --model haiku --ablation none --mocks off \
  --allow-tools mcp__plugin_skill-router_skill-router__search_skills mcp__plugin_skill-router_skill-router__load_skill \
  --no-publish --keep-temp --json <result.json>
node scripts/eval-share.js <result.json>
```

The first command prints the root it builds: the router, an `.mcp.json` starting the server on the
root's own `skills/` folder, the catalog with its instructions, and these cases. The root stands
outside the repository, since `claude plugin eval` reads every `prompt.md` under any `evals` folder
of the tree it is given.

| Flag | Why |
|---|---|
| `--mocks off`, `--allow-tools` | the router has to run as a real MCP server, and a gated tool is granted by its exact name |
| `--ablation none` | without the router no agent can reach a skill the listing does not show |
| `--no-publish` | the report stays local |
| `--keep-temp` | a failed run is read from its trace, which the run's own temporary folder holds and the run deletes without this flag; each run's `tracePath` in the result names that folder, the only one to remove afterwards |

`scripts/eval-share.js` reports, per group, the share of runs that passed, and exits 1 when any
group falls below the threshold, 0.8 unless given. A run passes when every
grader of its case passed, though a run the turn limit ended does not pass a case whose graders
only check that nothing was loaded. It refuses a partial run, a run that ended in an error other
than the turn limit, fewer than three runs of a case and a result missing a case of this folder.

## Limits

- The agent works in an empty folder: a request it cannot act on there may end before it loads a
  skill.
- A grader matches the folder of the expected skill only, so a run that loads a listed skill of the
  same concern instead fails.
- The search matches words, so a skill whose name, description and instructions share none with
  the agent's query stays out of the results and is reached only through the skill whose folder
  holds it, as the `nested` cases measure.
- A grader counts one load of the expected skill and no more, so it does not tell a run that picks
  that skill from a run that loads every result.
- The queries of `test/fixtures/ranking/queries.json` are the ones the agent wrote for these
  tasks, so the ranking test and this evaluation share their requests.
