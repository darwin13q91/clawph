# Memory System Configuration

## Status: Enabled
## Date: March 3, 2026

## Configuration
- **Source:** memory-core plugin
- **Vector Store:** Enabled (fts ready)
- **Index Location:** ~/.openclaw/memory/
- **Cache:** On

## Indexed Files
- MEMORY.md — Long-term curated memory
- memory/*.md — Daily notes and context
- AGENTS.md — Agent configurations
- SOUL.md — Agent personalities
- USER.md — User preferences

## How It Works
1. Session starts → Memory plugin loads indexed files
2. User asks question → Semantic search finds relevant context
3. Agent recalls prior decisions, preferences, todos
4. Automatic pruning after 30 days (configurable)

## Maintenance
- Review daily files weekly
- Archive old conversations
- Update MEMORY.md with distilled learnings
