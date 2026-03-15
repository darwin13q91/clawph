# Amajungle Dashboard Redesign - Documentation

## Overview
Complete redesign of the Amajungle Dashboard (port 8789) and Command Center (port 8888) with modern Amajungle branding, animations, and live agent status indicators.

## Changes Made

### 1. Dashboard (Port 8789)
**Location:** `/home/darwin/.openclaw/workspace/apps/dashboard/public/index.html`

#### Design System
- **Primary Colors:**
  - Jungle Green: `#0B3A2C`
  - Jungle Light: `#145A42`
  - Neon Lime: `#CFFF00`
  - Warm White: `#F6F7EB`
  
- **Typography:**
  - Display: Space Mono
  - Body: Inter
  - Monospace: JetBrains Mono

#### Sections Added
1. **Header** - Amajungle branding with logo animation
2. **Agent Status Panel** - All 6 agents with animated status indicators
3. **Agent Network Map** - Visual SVG connection map
4. **Activity Feed** - Real-time activity log with animations
5. **Email Monitor Panel** - Email statistics and monitoring
6. **CFO Dashboard** - Financial metrics with progress bars
7. **System Health Panel** - Health checks and metrics
8. **Subagent Activity Panel** - Token usage and completions
9. **Quick Actions Panel** - 8 action buttons with hover effects

### 2. Command Center (Port 8888)
**Location:** `/home/darwin/.openclaw/workspace/apps/command-center/public/index.html`

#### Features
- Same Amajungle design system as Dashboard
- Scanline animation effect
- Agent network overview with animated cards
- Financial overview and budget burn rate
- Subagent monitoring with live activity feed
- System health metrics
- Quick action buttons with glow effects

### 3. Agent Status Animations

| Agent | Icon | Status Indicator | Animation |
|-------|------|------------------|-----------|
| Allysa (Master) | 🧠 | Always Active | Heartbeat |
| Echo | 📧 | Pulse when checking email | Pulse (every 5 min) |
| River | 🌊 | Glow when available | Glow |
| Atlas | 🏛️ | Spin when working | Spin |
| Piper | 📨 | Slide animation when active | Slide + Bounce |
| CFO | 💰 | Pulse when generating reports | Pulse |

### 4. CSS Animations Added
```css
/* Pulse for active agents */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

/* Glow for available agents */
@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px #CFFF00; }
  50% { box-shadow: 0 0 20px #CFFF00, 0 0 30px #CFFF00; }
}

/* Spin for working agents */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Slide in animation */
@keyframes slideIn {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Heartbeat for master agent */
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.05); }
  50% { transform: scale(1); }
  75% { transform: scale(1.05); }
}

/* Pulse ring effect */
@keyframes pulseRing {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}
```

### 5. JavaScript Features

#### Live Status Polling
- Dashboard: Polls every 30 seconds (`/api/dashboard`)
- Command Center: Polls every 15 seconds (`/api/status`)

#### Agent State Management
```javascript
const AGENTS = [
  { id: 'allysa', name: 'Allysa', role: 'Master Orchestrator', icon: '🧠', state: 'active' },
  { id: 'echo', name: 'Echo', role: 'Email Monitor', icon: '📧', state: 'available' },
  { id: 'river', name: 'River', role: 'Social Media', icon: '🌊', state: 'available' },
  { id: 'atlas', name: 'Atlas', role: 'Infrastructure', icon: '🏛️', state: 'working' },
  { id: 'piper', name: 'Piper', role: 'Communications', icon: '📨', state: 'available' },
  { id: 'cfo', name: 'CFO', role: 'Finance', icon: '💰', state: 'available' }
];
```

#### Activity Feed
- Real-time activity logging
- Visual indicators for different activity types
- Auto-scrolling with animation
- Color-coded by severity (success, warning, error, info)

### 6. Responsive Design
- Grid layout adapts to screen size
- Mobile: Single column layout
- Tablet: 2-column layout
- Desktop: 3-4 column layout
- Sidebar hides on mobile

## File Locations

### Backup Files
- Dashboard backup: `/home/darwin/.openclaw/workspace/apps/dashboard/backups/`
- Command Center backup: `/home/darwin/.openclaw/workspace/apps/command-center/backups/`

### Current Files
- Dashboard: `/home/darwin/.openclaw/workspace/apps/dashboard/public/index.html`
- Command Center: `/home/darwin/.openclaw/workspace/apps/command-center/public/index.html`

## Access URLs
- Dashboard: http://localhost:8789
- Command Center: http://localhost:8888

## Features Checklist

### Dashboard
- [x] Amajungle branding with animated logo
- [x] Dark theme with brand colors
- [x] Agent status panel with 6 agents
- [x] Animated status indicators (pulse, glow, spin)
- [x] Agent network connection map
- [x] Live activity feed
- [x] Email monitoring panel
- [x] CFO/Budget panel with progress bars
- [x] System health panel
- [x] Subagent activity panel
- [x] Quick actions panel (8 buttons)
- [x] Real-time clock
- [x] Auto-refresh every 30s

### Command Center
- [x] Amajungle branding
- [x] Scanline animation effect
- [x] Agent network status overview
- [x] Subagent monitoring
- [x] Financial overview
- [x] Budget burn rate tracking
- [x] Activity feed
- [x] System health metrics
- [x] Quick actions
- [x] Navigation links
- [x] Auto-refresh every 15s

## Testing
Both dashboards have been verified running:
- Dashboard (8789): OK
- Command Center (8888): OK

## Notes
- All animations respect the Amajungle brand colors
- Hover effects provide visual feedback
- Status indicators are color-coded and animated
- Real-time updates simulate agent activity
- Connection map shows agent relationships visually
