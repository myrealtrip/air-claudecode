# GitHub Labels

## Label Categories

Labels are organized by prefix with pastel tone colors for easy identification.

| Prefix | Color | Hex | Purpose |
|--------|-------|-----|---------|
| `for:` | Pastel Blue | #A8D8FF | Team coordination |
| `theme:` | Pastel Purple | #D4B8E3 | Topic/area of codebase |
| `type:` | Pastel Green | #B8E3C4 | Type of issue/PR |

## Labels

### for: (Team Coordination)

| Label | Description |
|-------|-------------|
| `for: team-attention` | An issue we'd like other members of the team to review |

### theme: (Topic/Area)

| Label | Description |
|-------|-------------|
| `theme: datasource` | Issues relating to data sources |
| `theme: error-handling` | Issues relating to error handling |
| `theme: modularization` | Issues related to the structure of the project and its code |
| `theme: observability` | Issues related to observability |
| `theme: performance` | Issues related to performance |
| `theme: testing` | Issues related to testing |

### type: (Issue Type)

| Label | Description |
|-------|-------------|
| `type: blocker` | An issue that is blocking us from releasing |
| `type: bug` | A general bug |
| `type: dependency-upgrade` | A dependency upgrade |
| `type: documentation` | A documentation update |
| `type: enhancement` | A general enhancement |
| `type: feature` | A general feature |
| `type: task` | A general task |

## Commands

### Delete all labels

```bash
gh label list --json name -q '.[].name' | while read label; do
  gh label delete "$label" --yes
done
```

### Create labels

```bash
# for: prefix - pastel blue
gh label create "for: team-attention" --description "An issue we'd like other members of the team to review" --color "A8D8FF"

# theme: prefix - pastel purple
gh label create "theme: datasource" --description "Issues relating to data sources" --color "D4B8E3"
gh label create "theme: error-handling" --description "Issues relating to error handling" --color "D4B8E3"
gh label create "theme: modularization" --description "Issues related to the structure of the project and its code" --color "D4B8E3"
gh label create "theme: observability" --description "Issues related to observability" --color "D4B8E3"
gh label create "theme: performance" --description "Issues related to performance" --color "D4B8E3"
gh label create "theme: testing" --description "Issues related to testing" --color "D4B8E3"

# type: prefix - pastel green
gh label create "type: blocker" --description "An issue that is blocking us from releasing" --color "B8E3C4"
gh label create "type: bug" --description "A general bug" --color "B8E3C4"
gh label create "type: dependency-upgrade" --description "A dependency upgrade" --color "B8E3C4"
gh label create "type: documentation" --description "A documentation update" --color "B8E3C4"
gh label create "type: enhancement" --description "A general enhancement" --color "B8E3C4"
gh label create "type: feature" --description "A general feature" --color "B8E3C4"
gh label create "type: task" --description "A general task" --color "B8E3C4"
```
