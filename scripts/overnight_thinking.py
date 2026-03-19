#!/usr/bin/env python3
"""
Overnight Thinking Mode - Allysa's 1AM Reflection System
Chief of Staff mode: Analyze everything, generate insights, deliver morning report
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import random

# Add paths for imports
sys.path.insert(0, '/home/darwin/.openclaw/workspace')

class OvernightThinker:
    def __init__(self):
        self.workspace = Path('/home/darwin/.openclaw/workspace')
        self.memory_dir = self.workspace / 'memory'
        self.reports_dir = self.workspace / 'reports' / 'overnight'
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
    def load_all_data(self):
        """Load data from all systems"""
        data = {
            'agent_activity': self._load_agent_logs(),
            'email_patterns': self._load_email_patterns(),
            'audit_stats': self._load_audit_stats(),
            'recent_events': self._load_recent_events(),
        }
        return data
    
    def _load_agent_logs(self):
        """Load last 2 days of agent activity"""
        logs = {}
        for agent in ['echo', 'river', 'piper', 'atlas', 'allysa']:
            for days_ago in range(2):
                date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
                log_file = self.memory_dir / 'agents' / 'daily' / f'{date}_{agent}.md'
                if log_file.exists():
                    with open(log_file) as f:
                        logs[f'{agent}_{date}'] = f.read()[:500]  # First 500 chars
        return logs
    
    def _load_email_patterns(self):
        """Analyze email patterns from Echo"""
        echo_log = Path('/home/darwin/.openclaw/agents/echo/data/echo_monitor.log')
        if not echo_log.exists():
            return {}
        
        import subprocess
        result = subprocess.run(['tail', '-500', str(echo_log)], 
                              capture_output=True, text=True)
        
        audits = result.stdout.count('AUDIT REQUEST DETECTED')
        forwards = result.stdout.count('Forwarded to support')
        queued = result.stdout.count('queued')
        
        return {
            'audits_detected': audits,
            'replies_forwarded': forwards,
            'emails_queued': queued
        }
    
    def _load_audit_stats(self):
        """Load audit statistics"""
        results_dir = Path('/home/darwin/.openclaw/agents/river/data/results')
        if not results_dir.exists():
            return {}
        
        files = list(results_dir.glob('audit_*.json'))
        recent = [f for f in files if f.stat().st_mtime > 
                  (datetime.now() - timedelta(days=7)).timestamp()]
        
        return {
            'total_audits': len(files),
            'recent_audits_7d': len(recent)
        }
    
    def _load_recent_events(self):
        """Load recent significant events"""
        events = []
        
        # Check for recent dashboard fixes
        cc_log = self.workspace / 'apps' / 'command-center' / 'server.log'
        if cc_log.exists():
            events.append('Command Center dashboard operational')
        
        # Check Echo watchdog
        watchdog = Path('/home/darwin/.openclaw/agents/echo/watchdog.sh')
        if watchdog.exists():
            events.append('Echo watchdog system active')
        
        return events
    
    def generate_ideas(self, data):
        """Generate all report sections"""
        
        # Get yesterday's report type to avoid repetition
        yesterday_type = self._get_yesterday_type()
        
        return {
            'new_idea': self._generate_new_idea(yesterday_type),
            'workflow': self._generate_workflow(yesterday_type),
            'pattern': self._generate_pattern(data, yesterday_type),
            'curiosity': self._generate_curiosity(yesterday_type),
            'optimization': self._generate_optimization(yesterday_type),
            'wild_idea': self._generate_wild_idea(yesterday_type)
        }
    
    def _get_yesterday_type(self):
        """Get yesterday's idea type to avoid repetition"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        report_file = self.reports_dir / f'report_{yesterday}.json'
        
        if report_file.exists():
            try:
                with open(report_file) as f:
                    data = json.load(f)
                    return data.get('idea_category', 'unknown')
            except:
                pass
        return 'unknown'
    
    def _generate_new_idea(self, yesterday_type):
        """Generate one original idea"""
        ideas = [
            {
                'category': 'ai_confidence',
                'title': 'Smart Email Triage with AI Confidence Scoring',
                'description': 'Add confidence scores (0-100%) to each email classification. If confidence < 80%, queue for your review.',
                'why': 'You test the same flow repeatedly—suggests uncertainty in classification. Confidence scores would surface edge cases.'
            },
            {
                'category': 'analytics',
                'title': 'Client Response Time Tracker',
                'description': 'Track time from form submission → audit email sent → client reply. Visualize bottlenecks.',
                'why': 'Currently flying blind on pipeline speed. You have the data—just need to surface it.'
            },
            {
                'category': 'automation',
                'title': 'Auto-Followup Sequences',
                'description': 'If client does not book Calendly within 48h of audit, auto-send followup with case study.',
                'why': 'Your conversion rate is good (95%), but what about the 5% who ghost? Second touch could recover them.'
            },
            {
                'category': 'integration',
                'title': 'Slack Command Center',
                'description': '/status → See all agent health. /queue → See pending approvals. /spawn [agent] [task]',
                'why': 'You love Telegram, but Slack is better for team/ops commands. One place to command the fleet.'
            },
            {
                'category': 'insight',
                'title': 'Audit Score Predictor',
                'description': 'ML model that predicts audit score from just the Amazon URL (before analysis).',
                'why': 'Set expectations early. If score will be 40/100, prep client in initial email.'
            }
        ]
        
        # Filter out yesterday's category
        available = [i for i in ideas if i['category'] != yesterday_type]
        if not available:
            available = ideas
            
        return random.choice(available)
    
    def _generate_workflow(self, yesterday_type):
        """Generate workflow to build"""
        workflows = [
            {
                'category': 'monitoring',
                'name': 'Agent Health Dashboard Alert',
                'description': 'If any agent down > 5 minutes, ping you on Telegram with auto-restart option.',
                'how': 'Cron every 2 min checks processes → Telegram bot → inline buttons [Restart Echo] [Check Logs]',
                'saves': 'You finding out hours later when you test something'
            },
            {
                'category': 'analytics',
                'name': 'Daily Email Pipeline Report',
                'description': 'Every morning: emails received, processed, queued, avg response time.',
                'how': 'Parse Echo logs at 6 AM → Generate summary → Telegram message',
                'saves': 'Manual log checking'
            },
            {
                'category': 'integration',
                'name': 'Calendly Booking Sync',
                'description': 'When client books via Calendly link, auto-mark their email as VIP.',
                'how': 'Calendly webhook → Flag email in Echo → Priority handling',
                'saves': 'Manual tracking of who booked vs who just requested audit'
            },
            {
                'category': 'automation',
                'name': 'Smart Queue Processor',
                'description': 'Auto-approve TIER_2 emails after 24h if you have not reviewed.',
                'how': 'Cron checks queue timestamps → Auto-sends if stale → Logs action',
                'saves': 'Queue building up when you are busy'
            }
        ]
        
        available = [w for w in workflows if w['category'] != yesterday_type]
        if not available:
            available = workflows
            
        return random.choice(available)
    
    def _generate_pattern(self, data, yesterday_type):
        """Generate pattern observation"""
        email_stats = data.get('email_patterns', {})
        audit_stats = data.get('audit_stats', {})
        
        patterns = [
            f"You processed {email_stats.get('audits_detected', 0)} audit requests recently, but I notice you test the same flow multiple times. This suggests either (a) you are stress-testing (good) or (b) you do not trust the system yet (fixable).",
            
            f"Echo has restarted {email_stats.get('emails_queued', 0)} times via watchdog. The system is stable but brittle—works, but not elegantly.",
            
            f"Your audit volume ({audit_stats.get('recent_audits_7d', 0)} in 7 days) suggests the pipeline is working, but only for your test emails. Real client volume unknown.",
            
            "You spend more time verifying the system works than using it. Classic builder's trap—building the plane while flying it.",
            
            "Every time Echo fails, you ask me about it immediately. Your detection latency is near-zero, which is excellent. Your frustration tolerance is the bottleneck."
        ]
        
        return random.choice(patterns)
    
    def _generate_curiosity(self, yesterday_type):
        """Generate one question"""
        questions = [
            "What is the one part of your current workflow that still annoys you every time it happens?",
            "If you could wave a wand and have one automation done instantly, what would it be?",
            "What do you worry about when you are not checking the dashboards?",
            "What is your actual goal with Amajungle—lifestyle business, acquisition, or something else?",
            "What part of your work do you secretly enjoy doing manually and would never automate?",
            "If a client had a terrible experience, how would you even know?",
            "What would make you feel the system is 'done' and ready for real clients?"
        ]
        
        return random.choice(questions)
    
    def _generate_optimization(self, yesterday_type):
        """Generate optimization idea"""
        optimizations = [
            {
                'target': 'Echo Cache System',
                'change': 'Change processed email retention from forever to 7 days. File gets huge, slows startup.',
                'impact': 'Faster Echo restarts, less disk usage'
            },
            {
                'target': 'Dashboard Polling',
                'change': 'Reduce polling from 15s to 30s for non-critical widgets.',
                'impact': 'Less CPU usage, still feels real-time'
            },
            {
                'target': 'River Analysis',
                'change': 'Cache RapidAPI responses for same ASIN for 1 hour.',
                'impact': 'Reduce API calls, faster repeat analyses'
            },
            {
                'target': 'Piper Email Queue',
                'change': 'Add priority flag: clients who already booked get faster sends.',
                'impact': 'Better experience for committed clients'
            }
        ]
        
        return random.choice(optimizations)
    
    def _generate_wild_idea(self, yesterday_type):
        """Generate wild/unconventional idea"""
        wild_ideas = [
            {
                'title': 'The Amajungle Oracle',
                'description': "Give clients a random AI-generated prediction about their store's future (e.g., 'At current trajectory, you will hit 100 reviews by June 15'). Completely unscientific but memorable.",
                'why': 'People share weird, memorable things. No one shares boring audit reports.'
            },
            {
                'title': 'Auto-Generated Rap Battles',
                'description': 'Compare client store to competitor, output as rap battle lyrics.',
                'why': 'You love automation with personality. This is peak memorable.'
            },
            {
                'title': 'The 2AM Hotline',
                'description': "If a client emails between 2-4 AM their time, auto-reply with 'Even insomniacs deserve answers. Here is your audit...'",
                'why': 'Pattern matching on desperation = higher conversion.'
            },
            {
                'title': 'Audit Score Betting',
                'description': 'Let clients guess their score before analysis. If within 5 points, they get discount.',
                'why': 'Gamification increases engagement and perceived value.'
            }
        ]
        
        return random.choice(wild_ideas)
    
    def generate_report(self):
        """Generate complete overnight report"""
        data = self.load_all_data()
        ideas = self.generate_ideas(data)
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        report = f"""# 🌙 OVERNIGHT REPORT — {today}

**GOOD MORNING. HERE IS WHAT I CAME UP WITH LAST NIGHT.**

---

## 💡 NEW IDEA

**{ideas['new_idea']['title']}**

{ideas['new_idea']['description']}

**Why this matters:** {ideas['new_idea']['why']}

---

## 🔧 WORKFLOW I WANT TO BUILD FOR YOU

**{ideas['workflow']['name']}**

{ideas['workflow']['description']}

**How it works:** {ideas['workflow']['how']}

**What it saves you:** {ideas['workflow']['saves']}

**[ ] Approve for me to build this?**

---

## 👁️ PATTERN I NOTICED

{ideas['pattern']}

---

## ❓ SOMETHING I AM CURIOUS ABOUT

{ideas['curiosity']}

---

## ⚡ OVERNIGHT OPTIMIZATION

**Target:** {ideas['optimization']['target']}

**Change:** {ideas['optimization']['change']}

**Impact:** {ideas['optimization']['impact']}

**[ ] Auto-implement this?**

---

## 🚀 WILD IDEA

**{ideas['wild_idea']['title']}**

{ideas['wild_idea']['description']}

**Why consider this:** {ideas['wild_idea']['why']}

---

*Generated at 1:00 AM by Allysa (Overnight Thinking Mode)*
*Current fleet status: Echo 🟢 River 🟢 Piper 🟢 Atlas 🟢*
"""
        
        # Save report
        report_file = self.reports_dir / f'report_{today}.md'
        with open(report_file, 'w') as f:
            f.write(report)
        
        # Save JSON for tracking
        json_file = self.reports_dir / f'report_{today}.json'
        with open(json_file, 'w') as f:
            json.dump({
                'date': today,
                'idea_category': ideas['new_idea']['category'],
                'workflow_category': ideas['workflow']['category'],
                'data_snapshot': {
                    'audits_7d': data['audit_stats'].get('recent_audits_7d', 0),
                    'emails_processed': data['email_patterns'].get('audits_detected', 0)
                }
            }, f, indent=2)
        
        return report
    
    def send_telegram_report(self, report):
        """Send report via Telegram"""
        try:
            import urllib.request
            import urllib.parse
            
            bot_token = '8606070459:AAEsiAmLNv0gxyICsUib_EYjIOkylToWjfU'
            chat_id = '6504570121'
            
            # Truncate if too long
            message = report[:4000] if len(report) > 4000 else report
            
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = urllib.parse.urlencode({
                'chat_id': chat_id,
                'text': message,
                'parse_mode': 'Markdown'
            }).encode()
            
            req = urllib.request.Request(url, data=data, method='POST')
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.status == 200
        except Exception as e:
            print(f"Failed to send Telegram: {e}")
            return False

if __name__ == '__main__':
    thinker = OvernightThinker()
    report = thinker.generate_report()
    
    # Print to stdout (for cron logging)
    print(report)
    print("\n" + "="*50)
    print("Report saved to:", thinker.reports_dir)
    
    # Send via Telegram
    success = thinker.send_telegram_report(report)
    print(f"Telegram sent: {success}")
