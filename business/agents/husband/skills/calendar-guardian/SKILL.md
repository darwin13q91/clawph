# Skill: calendar-guardian

## Purpose
Monitor calendar, prevent conflicts, send prep reminders.

## Capabilities

- Check for conflicts in next 48h
- Send prep reminders (30 min before, night before)
- Block focus time on clear days
- Alert on double-bookings

## Commands

```bash
# Check calendar
calendar check           # Next 48h overview
calendar conflicts       # Check for overlaps
calendar tomorrow        # What's tomorrow?

# Request focus time
calendar block "Focus" --duration 2h --tomorrow
```

## Data Sources

- System calendar (via calendar CLI or API)
- Or manual list in `data/calendar.json`

## Response Format

**Daily briefing:**
```
📅 Today — Monday, March 3
9:00 AM - Standup (15 min)
2:00 PM - Client call (30 min)

⚠️ Gap: 4 hours free between 10am-2pm
💡 Suggestion: Block 2 hours for deep work?
```

**Conflict alert:**
```
🚨 CONFLICT DETECTED
Tuesday 3:00 PM:
- "Dentist appointment"
- "Team sync"

Action needed: Reschedule one
```

**Prep reminder:**
```
⏰ Tomorrow: Client call at 2:00 PM
Prep:
- Review last meeting notes
- Check deliverables status
- Test video/audio
```

## Daily Schedule

**8:00 AM — Morning check:**
1. List today's events
2. Check for conflicts tomorrow
3. Suggest focus blocks if gaps exist

**8:00 PM — Evening prep:**
1. List tomorrow's events
2. Send prep reminders for important meetings
3. Flag any conflicts to resolve

## Integration

Uses system calendar or file-based fallback:
```json
{
  "events": [
    {
      "title": "Client call",
      "start": "2026-03-03T14:00:00",
      "end": "2026-03-03T14:30:00",
      "priority": "high"
    }
  ]
}
```
