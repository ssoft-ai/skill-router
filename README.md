# skill-router

An MCP server that finds the skills for a request among every installed skill source, for any
agent reading the [Agent Skills](https://agentskills.io) format. An agent shows the model the name
and description of each installed skill in every session; with hundreds of skills that listing
costs tokens on skills the request does not need, and Claude Code leaves out a skill stored inside
another skill's folder. The router lets the agent search every source for the skills a task needs,
those the listing leaves out included; the listing itself stays as the agent builds it.

## Tools

| Tool | Takes | Returns |
|---|---|---|
| `search_skills` | `query` - the task in a few English words; `limit` - 1 to 20, 10 by default | the best matching skills, each with its name, path and description; copies of one skill, same name and description, as one result whose `otherPaths` lists the rest |
| `load_skill` | `path` - a path `search_skills` returned | the skill's `SKILL.md` and the path of its folder |

The search ranks a skill by the words its name, its description and its instructions share with
the query: a word of the name weighs most, a word of the instructions least, so a skill is found by
a term only its instructions use and still ranks below one whose description names that term.

The agent writes the query, so a request in another language reaches skills described in English
as an English query. A skill described in another language is found by a query in that language
where the language spaces its words; Chinese or Japanese text matches only as a whole unbroken run.
`load_skill` answers only a path that resolves to a skill of the index. It returns the text of
`SKILL.md` as written: unlike Claude Code's Skill tool, it substitutes no `$ARGUMENTS` or
`${CLAUDE_SKILL_DIR}` and grants no `allowed-tools`.

Every call walks the skill folders, at any folder depth, so the index never goes stale; a
`SKILL.md` is read again only when its modification time or size changed since the previous call.
Two skills of one name both stay, each under its own path.

## Where it looks

Folders given as arguments to `server.js` replace the defaults below.

| Agent | Folders |
|---|---|
| Claude Code | the `skills/` folder of every installed plugin Claude Code loads - enabled in the user or project settings, with every plugin it depends on loading too - and the folders its `plugin.json` key `skills` names, a project plugin only in its project; `$CLAUDE_CONFIG_DIR/skills` (`~/.claude/skills`); `<project>/.claude/skills` |
| Codex | `$CODEX_HOME/skills` (`~/.codex/skills`); `.agents/skills` and `.codex/skills` in the project and in every folder above it up to the root of its git repository |

The project is `$CLAUDE_PROJECT_DIR`, or the folder the server starts in.

## Ranking by project files

A skill whose `metadata` key `paths` matches a file of the project ranks above an otherwise equal
skill. The key holds glob patterns, as a list or as one string separated by commas:

```yaml
metadata:
  paths: "**/*.cpp, **/*.h, CMakeLists.txt"
```

A pattern without `/` matches a file name at any depth; `*` stays inside one folder, `**` crosses
any number of them, `{a,b}` gives alternatives. The folders `.git` and `node_modules` are not
searched.

## Installation

Node.js 20 or later. The server has no dependencies.

### Claude Code

```sh
claude plugin marketplace add ssoft-ai/marketplace
claude plugin install skill-router@ssoft-ai
```

The plugin loads both tools into every session and adds to each request a reminder to search
the skills, in English words, before any other tool.

### Codex

```sh
git clone https://github.com/ssoft-ai/skill-router.git
codex mcp add skill-router -- node <clone>/server.js
```

### Another MCP client

Register a local server started by `node <clone>/server.js` over standard input and output.

## Checks

| Command | Checks |
|---|---|
| `node --test` | the units, and the ranking of the queries an agent wrote for the skills of `test/fixtures/catalog/` |
| `evals/README.md` | whether Claude Code on Haiku loads a skill its listing does not show |

## Licence

[MIT](LICENSE.md).
