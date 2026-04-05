# Skill: task-tracker

## Purpose
Track todos, reminders, and follow-ups for daily life operations.

## Capabilities

- Add tasks with due dates
- List tasks (all, today, overdue)
- Mark tasks complete
- Set recurring reminders
- Prioritize tasks

## Commands

```bash
# Add a task
task add "Call mom" --due "Sunday 6pm" --priority high

# List tasks
task list --today
task list --overdue
task list --all

# Complete a task
task complete <task_id>

# Set recurring
task add "Check budget" --recur weekly --on sunday
```

## Data Storage

File: `data/tasks.json`

```json
{
  "tasks": [
    {
      "id": "uuid",
      "text": "Call mom",
      "due": "2026-03-08T18:00:00",
      "priority": "high|medium|low",
      "status": "pending|done|snoozed",
      "created": "2026-03-02T22:45:00",
      "recurring": null
    }
  ]
}
```

## Response Format

**Adding task:**
```
✅ Task added: "Call mom"
Due: Sunday, March 8 at 6:00 PM
Priority: High
```

**Listing tasks:**
```
📋 Today's Tasks (2):
1. [🔴 HIGH] Submit invoice — Due: Today 5pm
2. [🟡 MED] Review paper trades — Due: Today 8pm

📋 Overdue (1):
3. [🔴 HIGH] Fix dashboard — Due: Yesterday
```

## Daily Check

Every morning at 8 AM:
1. Load tasks.json
2. Filter: due today OR overdue
3. Sort by priority (high → low)
4. Present top 3 with "Want me to prioritize?"

## Safety

- Never delete tasks without confirmation
- Snooze available for 1 hour, 1 day, 1 week
- Archive completed tasks to `data/tasks-archive.json`
