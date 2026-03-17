/**
 * Activity Logger - Unified activity tracking for OpenClaw systems
 * Multiple systems can write to this to feed the dashboard activity feed
 */
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Activity log file path
const ACTIVITY_LOG_PATH = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'activity_log.jsonl');
const SKILL_LOG_PATH = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'skill_log.jsonl');
const MAX_ACTIVITIES = 100;
const MAX_SKILLS = 50;

// Event emitter for real-time updates
const activityEmitter = new EventEmitter();
const skillEmitter = new EventEmitter();

// Ensure directory exists
function ensureDirectory() {
  const dir = path.dirname(ACTIVITY_LOG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Activity types and their metadata
const ACTIVITY_TYPES = {
  SUBAGENT: {
    id: 'subagent',
    label: 'Subagent',
    icon: '🤖',
    color: '#B06CDB' // violet
  },
  CRON: {
    id: 'cron',
    label: 'Cron Job',
    icon: '⏰',
    color: '#CFFF00' // neon
  },
  GATEWAY: {
    id: 'gateway',
    label: 'Gateway',
    icon: '🌐',
    color: '#22C55E' // green
  },
  CHANNEL: {
    id: 'channel',
    label: 'Channel',
    icon: '💬',
    color: '#3B82F6' // blue
  },
  SYSTEM: {
    id: 'system',
    label: 'System',
    icon: '⚙️',
    color: '#6B7280' // gray
  },
  EMAIL: {
    id: 'email',
    label: 'Email',
    icon: '📧',
    color: '#F59E0B' // amber
  },
  TRADE: {
    id: 'trade',
    label: 'Trade',
    icon: '📈',
    color: '#10B981' // emerald
  },
  SKILL: {
    id: 'skill',
    label: 'Skill',
    icon: '🎯',
    color: '#EC4899' // pink
  }
};

// Status types for activities
const STATUS_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning'
};

/**
 * Log a new activity
 * @param {Object} activity - Activity object
 * @param {string} activity.type - Activity type (from ACTIVITY_TYPES)
 * @param {string} activity.status - Status (info, success, error, warning)
 * @param {string} activity.title - Activity title
 * @param {string} activity.description - Activity description
 * @param {string} [activity.source] - Source system/agent
 * @param {Object} [activity.metadata] - Additional metadata
 */
function logActivity(activity) {
  ensureDirectory();
  
  const typeConfig = ACTIVITY_TYPES[activity.type?.toUpperCase()] || ACTIVITY_TYPES.SYSTEM;
  
  const entry = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: typeConfig.id,
    typeLabel: typeConfig.label,
    icon: activity.icon || typeConfig.icon,
    color: typeConfig.color,
    status: activity.status || STATUS_TYPES.INFO,
    title: activity.title,
    description: activity.description,
    source: activity.source || 'system',
    timestamp: Date.now(),
    metadata: activity.metadata || {}
  };

  // Append to log file (JSON Lines format)
  try {
    fs.appendFileSync(ACTIVITY_LOG_PATH, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('[ActivityLogger] Failed to write activity:', err.message);
  }

  // Emit real-time event
  activityEmitter.emit('activity', entry);

  return entry;
}

/**
 * Get recent activities
 * @param {number} limit - Maximum number of activities to return
 * @param {string} [typeFilter] - Filter by activity type
 * @returns {Array} Array of activity objects
 */
function getRecentActivities(limit = 20, typeFilter = null) {
  ensureDirectory();
  
  try {
    if (!fs.existsSync(ACTIVITY_LOG_PATH)) {
      return [];
    }

    const content = fs.readFileSync(ACTIVITY_LOG_PATH, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    
    let activities = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);

    // Apply type filter if specified
    if (typeFilter) {
      activities = activities.filter(a => a.type === typeFilter);
    }

    return activities.slice(0, limit);
  } catch (err) {
    console.error('[ActivityLogger] Failed to read activities:', err.message);
    return [];
  }
}

/**
 * Get activities since a specific timestamp
 * @param {number} since - Timestamp to get activities from
 * @returns {Array} Array of activity objects
 */
function getActivitiesSince(since) {
  const activities = getRecentActivities(MAX_ACTIVITIES);
  return activities.filter(a => a.timestamp > since);
}

/**
 * Clean up old activities (keep only MAX_ACTIVITIES)
 */
function cleanupActivities() {
  try {
    const activities = getRecentActivities(MAX_ACTIVITIES * 2);
    if (activities.length > MAX_ACTIVITIES) {
      const toKeep = activities.slice(0, MAX_ACTIVITIES);
      const content = toKeep.map(a => JSON.stringify(a)).join('\n') + '\n';
      fs.writeFileSync(ACTIVITY_LOG_PATH, content);
    }
  } catch (err) {
    console.error('[ActivityLogger] Failed to cleanup activities:', err.message);
  }
}

/**
 * Log a subagent run activity
 * @param {Object} runData - Subagent run data
 */
function logSubagentActivity(runData) {
  const status = runData.outcome?.status === 'ok' ? STATUS_TYPES.SUCCESS :
                 runData.outcome?.status === 'error' ? STATUS_TYPES.ERROR :
                 STATUS_TYPES.INFO;
  
  const agentName = runData.childSessionKey?.split(':')[1] || 'unknown';
  
  return logActivity({
    type: 'SUBAGENT',
    status: status,
    title: `${agentName.charAt(0).toUpperCase() + agentName.slice(1)} Activity`,
    description: runData.label || runData.task?.substring(0, 60) || 'Task executed',
    source: agentName,
    metadata: {
      runId: runData.runId,
      duration: runData.endedAt ? runData.endedAt - runData.startedAt : null,
      outcome: runData.outcome
    }
  });
}

/**
 * Log a cron job execution
 * @param {Object} jobData - Cron job data
 */
function logCronActivity(jobData) {
  const status = jobData.failed ? STATUS_TYPES.ERROR :
                 jobData.success ? STATUS_TYPES.SUCCESS :
                 STATUS_TYPES.INFO;
  
  return logActivity({
    type: 'CRON',
    status: status,
    title: `Cron Job: ${jobData.name || jobData.id}`,
    description: jobData.description || `Schedule: ${jobData.schedule || 'unknown'}`,
    source: 'cron',
    metadata: {
      jobId: jobData.id,
      schedule: jobData.schedule,
      exitCode: jobData.exitCode
    }
  });
}

/**
 * Log a gateway event
 * @param {Object} eventData - Gateway event data
 */
function logGatewayActivity(eventData) {
  const status = eventData.status === 'error' ? STATUS_TYPES.ERROR :
                 eventData.status === 'started' ? STATUS_TYPES.SUCCESS :
                 STATUS_TYPES.INFO;
  
  const action = eventData.action || 'event';
  
  return logActivity({
    type: 'GATEWAY',
    status: status,
    title: `Gateway ${action.charAt(0).toUpperCase() + action.slice(1)}`,
    description: eventData.message || `Gateway ${action} at ${new Date().toLocaleTimeString()}`,
    source: 'gateway',
    metadata: {
      action: eventData.action,
      pid: eventData.pid,
      port: eventData.port
    }
  });
}

/**
 * Log a channel message/interaction
 * @param {Object} messageData - Channel message data
 */
function logChannelActivity(messageData) {
  const status = messageData.error ? STATUS_TYPES.ERROR :
                 messageData.success ? STATUS_TYPES.SUCCESS :
                 STATUS_TYPES.INFO;
  
  const channel = messageData.channel || 'unknown';
  
  return logActivity({
    type: 'CHANNEL',
    status: status,
    title: `${channel.charAt(0).toUpperCase() + channel.slice(1)} ${messageData.action || 'Interaction'}`,
    description: messageData.description || `New ${channel} activity`,
    source: channel,
    icon: channel === 'telegram' ? '📱' : channel === 'discord' ? '💬' : '💬',
    metadata: {
      channel: channel,
      action: messageData.action,
      userId: messageData.userId
    }
  });
}

/**
 * Log a system event
 * @param {Object} eventData - System event data
 */
function logSystemActivity(eventData) {
  return logActivity({
    type: 'SYSTEM',
    status: eventData.status || STATUS_TYPES.INFO,
    title: eventData.title || 'System Event',
    description: eventData.description,
    source: 'system',
    metadata: eventData.metadata
  });
}

/**
 * Log a skill execution
 * @param {Object} skillData - Skill execution data
 */
function logSkillActivity(skillData) {
  ensureDirectory();
  
  const status = skillData.success === false ? STATUS_TYPES.ERROR :
                 skillData.success === true ? STATUS_TYPES.SUCCESS :
                 STATUS_TYPES.INFO;
  
  const entry = {
    id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'skill',
    status: status,
    skillName: skillData.skillName || skillData.name || 'Unknown Skill',
    agent: skillData.agent || skillData.source || 'system',
    title: skillData.title || `${skillData.skillName || skillData.name} executed`,
    description: skillData.description || skillData.task || 'Skill execution',
    startTime: skillData.startTime || Date.now(),
    endTime: skillData.endTime || null,
    duration: skillData.duration || (skillData.endTime ? skillData.endTime - skillData.startTime : null),
    success: skillData.success,
    actions: skillData.actions || [],
    metadata: skillData.metadata || {},
    timestamp: Date.now()
  };

  // Append to skill log file
  try {
    fs.appendFileSync(SKILL_LOG_PATH, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('[ActivityLogger] Failed to write skill activity:', err.message);
  }

  // Emit real-time event
  skillEmitter.emit('skill', entry);
  
  // Also log as regular activity for feed visibility
  logActivity({
    type: 'SKILL',
    status: status,
    title: entry.title,
    description: entry.description,
    source: entry.agent,
    metadata: { skillId: entry.id, skillName: entry.skillName }
  });

  return entry;
}

/**
 * Get recent skill executions
 * @param {number} limit - Maximum number of skills to return
 * @param {string} [agentFilter] - Filter by agent name
 * @returns {Array} Array of skill execution objects
 */
function getRecentSkills(limit = 20, agentFilter = null) {
  ensureDirectory();
  
  try {
    if (!fs.existsSync(SKILL_LOG_PATH)) {
      return [];
    }

    const content = fs.readFileSync(SKILL_LOG_PATH, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    
    let skills = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);

    // Apply agent filter if specified
    if (agentFilter) {
      skills = skills.filter(s => s.agent === agentFilter);
    }

    return skills.slice(0, limit);
  } catch (err) {
    console.error('[ActivityLogger] Failed to read skills:', err.message);
    return [];
  }
}

/**
 * Get running skills (started but not ended)
 * @returns {Array} Array of running skill executions
 */
function getRunningSkills() {
  const skills = getRecentSkills(MAX_SKILLS);
  return skills.filter(s => !s.endTime && s.success === undefined);
}

// Cleanup old activities periodically (every hour)
setInterval(cleanupActivities, 60 * 60 * 1000);

module.exports = {
  logActivity,
  getRecentActivities,
  getActivitiesSince,
  logSubagentActivity,
  logCronActivity,
  logGatewayActivity,
  logChannelActivity,
  logSystemActivity,
  logSkillActivity,
  getRecentSkills,
  getRunningSkills,
  activityEmitter,
  skillEmitter,
  ACTIVITY_TYPES,
  STATUS_TYPES
};