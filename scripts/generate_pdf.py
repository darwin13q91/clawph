#!/usr/bin/env python3
"""
Simple PDF Report Generator - Python Fallback
Generates branded PDF reports without requiring Node.js/Puppeteer
Uses ReportLab if available, otherwise creates HTML files
"""

import os
import sys
import json
import base64
from datetime import datetime
from pathlib import Path

# Data paths
OUTPUT_DIR = Path('/home/darwin/.openclaw/agents/river/output')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def generate_report_id():
    """Generate unique report ID"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_str = os.urandom(3).hex().upper()
    return f"AJR-{date_str}-{random_str}"

def format_date():
    """Format date for display"""
    return datetime.now().strftime('%B %d, %Y')

def get_score_description(score):
    """Get description based on score"""
    if score >= 80:
        return "Your store is in excellent condition with strong optimization."
    elif score >= 60:
        return "Your store has solid foundations but several optimization opportunities exist."
    elif score >= 40:
        return "Your store requires immediate attention."
    else:
        return "Urgent action needed. Your store has fundamental issues."

def generate_html_report(audit_data, report_id):
    """Generate HTML version of report"""
    
    score = audit_data.get('score', 0)
    store_url = audit_data.get('storeUrl', 'amazon.com/store')
    
    # Process critical issues
    critical_issues = audit_data.get('criticalIssues', [])
    issues_html = ""
    for issue in critical_issues[:3]:
        issues_html += f"""
        <div class="issue">
            <h3>{issue.get('title', 'Issue')}</h3>
            <p>{issue.get('description', '')}</p>
            <p><strong>Impact:</strong> {issue.get('impact', 'Unknown')}</p>
            <p><strong>Fix:</strong> {issue.get('recommendation', 'Address immediately')}</p>
        </div>
        """
    
    # Process quick wins
    quick_wins = audit_data.get('quickWins', [])
    wins_html = ""
    for win in quick_wins[:3]:
        wins_html += f"""
        <div class="win">
            <h3>{win.get('title', 'Quick Win')}</h3>
            <p>{win.get('description', '')}</p>
            <p><strong>Impact:</strong> {win.get('impact', 'Moderate')}</p>
            <p><strong>Time:</strong> {win.get('timeToFix', '1-2 hours')}</p>
        </div>
        """
    
    # Process action plan
    action_plan = audit_data.get('actionPlan', [])
    actions_html = ""
    for i, action in enumerate(action_plan[:5], 1):
        priority = action.get('priority', 'Medium')
        priority_class = priority.lower()
        actions_html += f"""
        <div class="action">
            <span class="priority {priority_class}">{priority}</span>
            <span class="number">{i}.</span>
            <span class="title">{action.get('title', 'Action item')}</span>
        </div>
        """
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Amazon Store Analysis - {store_url}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        body {{
            font-family: 'Inter', sans-serif;
            background: #ffffff;
            color: #1a1a1a;
            line-height: 1.6;
            max-width: 210mm;
            margin: 0 auto;
            padding: 40px;
        }}
        
        .header {{
            background: linear-gradient(135deg, #0B3A2C 0%, #1a5a45 100%);
            color: #F6F7EB;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
        }}
        
        .header h1 {{
            font-size: 28px;
            margin-bottom: 10px;
        }}
        
        .store-info {{
            opacity: 0.9;
            font-size: 14px;
        }}
        
        .score-section {{
            text-align: center;
            padding: 30px;
            background: #f8f9fa;
            border-radius: 12px;
            margin-bottom: 30px;
        }}
        
        .score {{
            font-size: 72px;
            font-weight: 700;
            color: #0B3A2C;
        }}
        
        .score-label {{
            font-size: 16px;
            color: #666;
            margin-top: 5px;
        }}
        
        .section {{
            margin-bottom: 30px;
        }}
        
        .section h2 {{
            color: #0B3A2C;
            font-size: 20px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #CFFF00;
        }}
        
        .issue, .win {{
            background: #fff8f0;
            border-left: 4px solid #ff6b6b;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
        }}
        
        .win {{
            background: #f0fff4;
            border-left-color: #51cf66;
        }}
        
        .issue h3, .win h3 {{
            font-size: 16px;
            margin-bottom: 8px;
            color: #0B3A2C;
        }}
        
        .action {{
            display: flex;
            align-items: center;
            padding: 12px;
            background: #f8f9fa;
            margin-bottom: 10px;
            border-radius: 6px;
        }}
        
        .action .number {{
            font-weight: 600;
            color: #0B3A2C;
            margin-right: 10px;
            min-width: 25px;
        }}
        
        .action .title {{
            flex: 1;
        }}
        
        .priority {{
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            margin-right: 10px;
        }}
        
        .priority.high {{
            background: #ff6b6b;
            color: white;
        }}
        
        .priority.medium {{
            background: #ffd43b;
            color: #333;
        }}
        
        .priority.low {{
            background: #51cf66;
            color: white;
        }}
        
        .footer {{
            text-align: center;
            padding: 30px;
            border-top: 1px solid #e0e0e0;
            margin-top: 40px;
            color: #666;
        }}
        
        .cta {{
            background: #CFFF00;
            color: #0B3A2C;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            font-weight: 600;
            margin-top: 10px;
        }}
        
        .revenue {{
            background: #0B3A2C;
            color: #CFFF00;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }}
        
        .revenue-amount {{
            font-size: 36px;
            font-weight: 700;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Amazon Store Analysis</h1>
        <div class="store-info">
            <p><strong>Store:</strong> {store_url}</p>
            <p><strong>Report ID:</strong> {report_id}</p>
            <p><strong>Date:</strong> {format_date()}</p>
        </div>
    </div>
    
    <div class="score-section">
        <div class="score">{score}/100</div>
        <div class="score-label">Store Health Score</div>
        <p style="margin-top: 15px; color: #666;">{get_score_description(score)}</p>
    </div>
    
    <div class="section">
        <h2>🚨 Critical Issues</h2>
        {issues_html if issues_html else '<p>No critical issues identified.</p>'}
    </div>
    
    <div class="section">
        <h2>⚡ Quick Wins</h2>
        {wins_html if wins_html else '<p>No quick wins identified.</p>'}
    </div>
    
    <div class="section">
        <h2>💰 Revenue Projection</h2>
        <div class="revenue">
            <div class="revenue-amount">${audit_data.get('revenueProjection', 12500):,}</div>
            <p>Estimated monthly revenue increase potential</p>
        </div>
    </div>
    
    <div class="section">
        <h2>📋 Action Plan</h2>
        {actions_html if actions_html else '<p>No actions identified.</p>'}
    </div>
    
    <div class="footer">
        <h3>Ready to implement these fixes?</h3>
        <p>Schedule a free strategy call to discuss your results</p>
        <a href="{audit_data.get('calendlyUrl', 'https://calendly.com/ops-clawph/30min')}" class="cta">Book Your Call</a>
        <p style="margin-top: 20px; font-size: 12px;">
            hello@clawph.com | +63 995 450 5206 | clawph.com
        </p>
    </div>
</body>
</html>"""
    
    return html

def generate_audit_pdf(audit_data, options=None):
    """
    Generate PDF report from audit data
    Returns: { buffer, reportId }
    """
    options = options or {}
    report_id = generate_report_id()
    
    # Generate HTML
    html_content = generate_html_report(audit_data, report_id)
    
    # Try to convert to PDF using weasyprint or similar if available
    try:
        from weasyprint import HTML, CSS
        
        html = HTML(string=html_content)
        pdf_buffer = html.write_pdf()
        
        # Save to file if requested
        if options.get('saveToFile'):
            output_path = options.get('outputPath') or OUTPUT_DIR / f"audit-report-{report_id}.pdf"
            with open(output_path, 'wb') as f:
                f.write(pdf_buffer)
        
        return {'buffer': pdf_buffer, 'reportId': report_id}
        
    except ImportError:
        # Fallback: return HTML as "PDF" for email attachment
        # Email clients will render the HTML
        html_bytes = html_content.encode('utf-8')
        
        # Save HTML version
        html_path = OUTPUT_DIR / f"audit-report-{report_id}.html"
        with open(html_path, 'w') as f:
            f.write(html_content)
        
        # Return HTML as buffer (Piper will handle appropriately)
        return {
            'buffer': html_bytes,
            'reportId': report_id,
            'isHtml': True,
            'htmlPath': str(html_path)
        }

if __name__ == '__main__':
    # Test
    test_data = {
        'storeUrl': 'amazon.com/store/test',
        'score': 72,
        'criticalIssues': [
            {'title': 'Missing Backend Keywords', 'description': 'Products lack backend terms', 'impact': '15-25% traffic loss', 'recommendation': 'Add keywords'},
            {'title': 'Low Review Velocity', 'description': 'Review rate below average', 'impact': '20-30% conversion drop', 'recommendation': 'Email sequence'}
        ],
        'quickWins': [
            {'title': 'Update Images', 'description': 'Replace with lifestyle shots', 'impact': '10-15% CTR increase', 'timeToFix': '2-3 hours'},
            {'title': 'Optimize Bullets', 'description': 'Restructure with benefits', 'impact': '8-12% conversion lift', 'timeToFix': '1 hour'}
        ],
        'revenueProjection': 12500,
        'actionPlan': [
            {'title': 'Fix critical SEO issues', 'priority': 'High'},
            {'title': 'Update main images', 'priority': 'Medium'},
            {'title': 'Optimize bullet points', 'priority': 'Medium'}
        ]
    }
    
    result = generate_audit_pdf(test_data, {'saveToFile': True})
    print(f"Report generated: {result['reportId']}")
    if result.get('isHtml'):
        print(f"HTML version (install weasyprint for PDF): {result.get('htmlPath')}")
    else:
        print(f"PDF size: {len(result['buffer'])} bytes")
