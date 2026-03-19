# SKILL_SECURITY.md - Guidelines for Adding New Skills

## Security Checklist for New Skills

### 1. File System Access
- ✅ Use absolute paths only
- ✅ Validate paths before writing
- ✅ Check file permissions (644 for files, 755 for dirs)
- ❌ Never use `eval()` or `exec()` on user input
- ❌ Never write to `/tmp` without cleanup

### 2. Process Management
- ✅ Always use lock files with `flock`
- ✅ Clean up zombie processes
- ✅ Set timeouts on all network calls
- ❌ Never run processes as root without validation
- ❌ Never leave processes running indefinitely

### 3. Network Security
- ✅ Use HTTPS for all external APIs
- ✅ Validate SSL certificates
- ✅ Set connection timeouts (10-30s)
- ❌ Never hardcode API keys in skills
- ❌ Never log sensitive data (tokens, passwords)

### 4. Error Handling
- ✅ Wrap all file operations in try/except
- ✅ Log errors with context (file, line, operation)
- ✅ Fail gracefully - don't crash the pipeline
- ✅ Alert on failures via Telegram

### 5. Data Validation
- ✅ Validate JSON before parsing
- ✅ Check data types before processing
- ✅ Sanitize file names (no special chars)
- ✅ Limit file sizes (max 10MB for logs)

### 6. Cron/Automation
- ✅ Use `flock -n` to prevent overlapping runs
- ✅ Log start/end times
- ✅ Alert if job hasn't run in expected interval
- ❌ Don't run CPU-intensive tasks every minute

## Current Skills That Need Hardening

### echo_monitor.py
- [ ] Add file size limits for logs
- [ ] Add circuit breaker for failed IMAP connections
- [ ] Validate email addresses before processing

### store_analyzer.py
- [ ] Add timeout for RapidAPI calls
- [ ] Validate Scout data structure before using
- [ ] Add retry logic with exponential backoff

### audit_queue.py
- [ ] Add max queue depth (100 jobs)
- [ ] Validate ASIN format before processing
- [ ] Add disk space check before creating files

## Recommended New Skills for Atlas

### 1. `system_diagnostics`
- Check disk space, memory, CPU
- Monitor log file sizes
- Alert on system resource issues

### 2. `pipeline_monitor`
- Track job flow through all agents
- Detect bottlenecks and failures
- Auto-restart stuck processes

### 3. `config_validator`
- Validate agent configs on startup
- Check for required environment variables
- Alert on missing credentials

### 4. `error_recovery`
- Auto-fix common issues (stale locks, permissions)
- Rollback failed deployments
- Restore from backups

### 5. `security_scanner`
- Check for exposed credentials in logs
- Validate file permissions
- Scan for suspicious activity

## Adding a New Skill - Step by Step

1. **Create SKILL.md** with:
   - Purpose and scope
   - Required permissions
   - Input/output formats
   - Error handling strategy

2. **Add to `skills/` directory**:
   ```
   skills/
   └── new_skill/
       ├── SKILL.md
       ├── scripts/
       ├── tests/
       └── README.md
   ```

3. **Update AGENTS.md** with agent assignments

4. **Test in isolation** before integration

5. **Add monitoring** (alerts on failure)

## Contact
For security questions, escalate to: Allysa (Master Orchestrator)
