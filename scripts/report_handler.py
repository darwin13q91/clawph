#!/usr/bin/env python3
"""
Subagent Report Handler - Prevents Telegram "message too long" errors
Saves full report to file, sends summary to Telegram
"""

import sys
import os
import hashlib
from datetime import datetime
from pathlib import Path

def save_report_and_summarize(agent_name, report_text, max_telegram_chars=4000):
    """
    Saves full report to file, returns summary for Telegram
    """
    # Create reports directory
    reports_dir = Path(f"/home/darwin/.openclaw/agents/{agent_name}/reports")
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = reports_dir / f"{agent_name}_report_{timestamp}.md"
    
    # Save full report
    report_file.write_text(report_text, encoding='utf-8')
    
    # Create summary
    lines = report_text.split('\n')
    total_lines = len(lines)
    total_chars = len(report_text)
    
    # Extract key sections (lines starting with # or containing emoji/status indicators)
    summary_lines = []
    for line in lines[:50]:  # First 50 lines for summary
        if any(line.startswith(x) for x in ['#', '##', '###', '✅', '❌', '⚠️', '🔴', '🟢', '🟡']):
            summary_lines.append(line)
    
    summary = f"""📊 {agent_name.upper()} REPORT SUMMARY

📝 Full report saved to:
{report_file}

📈 Statistics:
• Total lines: {total_lines}
• Total chars: {total_chars:,}
• Report time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

🔍 Key Findings:
"""
    
    # Add summary lines
    if summary_lines:
        summary += '\n'.join(summary_lines[:20])  # Top 20 key lines
    else:
        summary += report_text[:500] + "..." if len(report_text) > 500 else report_text
    
    # Ensure we stay under Telegram limit
    if len(summary) > max_telegram_chars:
        summary = summary[:max_telegram_chars - 100] + "\n\n[...truncated...]"
    
    summary += f"\n\n📁 View full report: `{report_file}`"
    
    return summary, str(report_file)


if __name__ == "__main__":
    # Read report from stdin
    report_text = sys.stdin.read()
    agent_name = sys.argv[1] if len(sys.argv) > 1 else "agent"
    
    summary, file_path = save_report_and_summarize(agent_name, report_text)
    print(summary)
    print(f"\n🗂️  Report saved: {file_path}", file=sys.stderr)
