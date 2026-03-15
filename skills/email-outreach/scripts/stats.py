#!/usr/bin/env python3
"""
Campaign Stats Viewer
Usage: python3 stats.py --campaign campaign_2026_03_05_1200
"""

import argparse
import json
from pathlib import Path
from collections import Counter

def main():
    parser = argparse.ArgumentParser(description='View campaign stats')
    parser.add_argument('--campaign', required=True, help='Campaign ID')
    args = parser.parse_args()
    
    result_file = Path(__file__).parent.parent / 'results' / f'{args.campaign}.jsonl'
    
    if not result_file.exists():
        print(f"❌ Campaign not found: {args.campaign}")
        return
    
    results = []
    with open(result_file) as f:
        for line in f:
            results.append(json.loads(line))
    
    status_counts = Counter(r['status'] for r in results)
    
    print(f"📊 Campaign: {args.campaign}")
    print(f"📧 Total: {len(results)} emails")
    print()
    print("Status Breakdown:")
    for status, count in status_counts.items():
        emoji = {'sent': '✅', 'failed': '❌', 'error': '💥'}.get(status, '➡️')
        print(f"  {emoji} {status}: {count}")
    
    if status_counts.get('failed', 0) > 0:
        print()
        print("Failed emails:")
        for r in results:
            if r['status'] == 'failed':
                print(f"  - {r['email']}: {r.get('error', 'Unknown')}")

if __name__ == '__main__':
    main()
