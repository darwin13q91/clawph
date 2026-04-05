# Skill: [skill-name]

## Purpose
One-line description of what this skill does.

## Capabilities

- Thing it can do #1
- Thing it can do #2
- Thing it can do #3

## Commands

```bash
# Example commands this skill handles
skill-name action --param value
skill-name status
```

## Data Storage

File: `data/[skill-name].json`

```json
{
  "example": "data structure"
}
```

## Response Format

**Success:**
```
✅ [Action completed]
Details: [what happened]
```

**Error:**
```
❌ [What went wrong]
Suggestion: [how to fix]
```

## Safety / Boundaries

- What NOT to do
- When to ask for confirmation

---

## How to Add a New Skill

1. **Create folder:**
   ```bash
   mkdir /home/darwin/.openclaw/workspace/business/agents/husband/skills/YOUR-SKILL-NAME
   ```

2. **Create SKILL.md:**
   ```bash
   touch /home/darwin/.openclaw/workspace/business/agents/husband/skills/YOUR-SKILL-NAME/SKILL.md
   ```

3. **Write the skill definition** (copy this template, fill in your details)

4. **Update AGENTS.md** to list the new skill as active

5. **(Optional) Create data file** if skill needs to store data:
   ```bash
   touch /home/darwin/.openclaw/workspace/business/agents/husband/data/YOUR-SKILL-NAME.json
   ```

That's it. The agent now "knows" this skill exists and can reference it.
