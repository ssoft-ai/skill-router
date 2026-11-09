# skill-router

An MCP server that finds the skills for a request among every installed skill source, for any
agent reading the [Agent Skills](https://agentskills.io) format. An agent shows the model the name
and description of each installed skill in every session; with hundreds of skills that listing
costs tokens on skills the request does not need, and Claude Code leaves out a skill stored inside
another skill's folder. The router lets the agent search every source for the skills a task needs,
those the listing leaves out included. In Claude Code the plugin also cuts the listing down to the
skill names, as the section Installation describes; other agents keep the listing as they build it.

## Tools

| Tool | Takes | Returns |
|---|---|---|
| `search_skills` | `query` - the task in a few English words; `limit` - 1 to 20, 10 by default | the best matching skills, best first, as text: each name once, then the folder of every skill of that name and its description, one description for copies sharing it |
| `load_skill` | `path` - a folder `search_skills` returned, or the path of its `SKILL.md` | the skill's instructions and the path of its folder |

The search ranks a skill by the words its name, its description and its instructions share with
the query, each counted once in each of them however often it is repeated; the articles,
conjunctions and prepositions of the query are not searched. A word weighs more the fewer skills
write it: in the name or the description, the fewer names and descriptions, however many
instructions write it; in the instructions, the fewer skills write it anywhere. A word of the name
weighs at least twice a word of the description, and a word of the description more than one of
the instructions. Longer instructions weigh their words less, a longer description down to half,
and shorter ones no more. A skill is found by a term only its instructions use, and ranks below a
skill that differs from it only in writing that term in its description.
A common abbreviation of software work matches its full form - `PR` and pull request, `CI` and
continuous integration, `k8s` and Kubernetes, `PRs` and pull requests; `src/abbreviations.js` lists
them with the plurals each abbreviation takes. A skill is still found by every word it writes; a
query writing a full form counts as the abbreviation alone.

The agent writes the query, so a request in another language reaches skills described in English
as an English query. A skill described in another language is found by a query in that language
where the language spaces its words; Chinese or Japanese text matches only as a whole unbroken run.
A path inside the home folder is shown from `~`, and `load_skill` takes it so. `load_skill` answers
only a path that resolves to a skill of the index. It returns `SKILL.md` without its frontmatter,
whose name and description the search already gave: unlike Claude Code's Skill tool, it substitutes
no `$ARGUMENTS` or `${CLAUDE_SKILL_DIR}` and grants no `allowed-tools`.

Every call walks the skill folders, at any folder depth, so a skill added or removed is found by the
next call. The walk enters no folder whose name starts with a dot, such as `.git` or `.trash`, and
no `node_modules` folder. A `SKILL.md` is read again only when its modification time or size
changed since the previous call.
A `SKILL.md` larger than 1 MiB is left out of the index. A `SKILL.md` that links to a file, of any
name, is a skill of the folder holding the link, so two links to one file are two skills. As
Claude Code lists them, a skill whose frontmatter gives no name takes the name of its folder, and
one giving no description, or a `SKILL.md` with no frontmatter, is described by the first line of
its instructions.

## Where it looks

Folders given as arguments to `server.js` replace the defaults below.

| Agent | Folders |
|---|---|
| Claude Code | the `skills/` folder of every installed plugin Claude Code loads - enabled in the user or project settings, with every plugin it depends on loading too - and the folders its `plugin.json` key `skills` names, a project plugin only in its project; `$CLAUDE_CONFIG_DIR/skills` (`~/.claude/skills`) without its `synced` folder, and `synced/<organization>_<account>` in it, the claude.ai skills of the account Claude Code is signed in to, read from `oauthAccount` in `$CLAUDE_CONFIG_DIR/.claude.json` (`~/.claude.json`); `<project>/.claude/skills` |
| Codex | `$CODEX_HOME/skills` (`~/.codex/skills`) and its `.system` folder, the skills Codex ships; `.agents/skills` and `.codex/skills` in the project and in every folder above it up to the root of its git repository |

The project is `$CLAUDE_PROJECT_DIR`, or the folder the server starts in.

Several skills can share a name: a copy installed for two agents, an older version a plugin keeps
in a folder such as `skills/v1`, a different skill nested elsewhere. No file tells which of them is
current, so a search returns them as one result, the name with the folder and description of each,
and the agent picks by description and place. The result ranks by the best of them. It lists the
user's skills first, then the project's, then the plugins' and last those Codex ships. A skill in
`<project>/.claude/skills` is left out where `$CLAUDE_CONFIG_DIR/skills` holds one of the same name,
since Claude Code hides it.

## Installation

Node.js 20 or later. The server has no dependencies.

### Claude Code

```sh
claude plugin marketplace add ssoft-ai/marketplace
claude plugin install skill-router@ssoft-ai
```

The plugin loads both tools into every session and adds to each request a reminder to search
the skills, in English words, before any other tool. Once a search or a load completes, the console
shows the names the search found, or that it found none, and the name of the skill loaded; the
model's context does not receive these notices.

Its option `skill_names_only`, on by default, shows every installed skill in Claude Code's skill
listing by its name alone, plugin skills included, so the descriptions no longer fill the context
and the search chooses the skill. While a session runs the plugin sets `skillListingMaxDescChars`
to 1 in `<project>/.claude/settings.local.json` of the session's project, so a project where the
router is disabled keeps its listing, unless a settings file of the session sets that key or
`skillListingBudgetFraction`. The last session of the project to end removes the key, and the file
and the `.claude` folder where the plugin created them. A prompt given on the command line, as
`claude -p` gives it, may reach the model before the value is read.

| Limit of `skill_names_only` | What it leaves |
|---|---|
| a session killed before its `SessionEnd` event | the key, until the next session of that project ends; once the plugin is uninstalled, the key stays until removed from that file by hand |
| a session whose router server fails to start | every skill listed by name with nothing to search them, since the hook runs before the server connects |

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
