#!/usr/bin/env python3
"""
Contact Segmenter
Usage: python3 segment.py --csv contacts.csv --revenue-min 50000 --output high_value.csv
"""

import argparse
import csv
from pathlib import Path

def parse_revenue(value):
    """Parse revenue string to number"""
    if not value:
        return 0
    value = str(value).replace('$', '').replace(',', '').strip()
    try:
        return int(value)
    except:
        return 0

def main():
    parser = argparse.ArgumentParser(description='Segment contacts')
    parser.add_argument('--csv', required=True, help='Input CSV')
    parser.add_argument('--output', default='segmented.csv', help='Output CSV')
    parser.add_argument('--revenue-min', type=int, help='Min monthly revenue')
    parser.add_argument('--skus-min', type=int, help='Min SKU count')
    parser.add_argument('--category', help='Filter by category')
    
    args = parser.parse_args()
    
    input_path = Path(args.csv)
    if not input_path.exists():
        print(f"❌ File not found: {input_path}")
        return
    
    contacts = []
    with open(input_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            contacts.append(row)
    
    print(f"📊 Loaded {len(contacts)} contacts")
    
    # Apply filters
    filtered = contacts
    
    if args.revenue_min:
        filtered = [c for c in filtered if parse_revenue(c.get('revenue', 0)) >= args.revenue_min]
        print(f"💰 Revenue >=${args.revenue_min}: {len(filtered)} contacts")
    
    if args.skus_min:
        filtered = [c for c in filtered if int(c.get('sku_count', 0) or 0) >= args.skus_min]
        print(f"📦 SKUs >={args.skus_min}: {len(filtered)} contacts")
    
    if args.category:
        filtered = [c for c in filtered if args.category.lower() in str(c.get('category', '')).lower()]
        print(f"🏷️ Category '{args.category}': {len(filtered)} contacts")
    
    # Write output
    if filtered:
        output_path = Path(args.output)
        with open(output_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=filtered[0].keys())
            writer.writeheader()
            writer.writerows(filtered)
        print(f"✅ Saved {len(filtered)} contacts to {output_path}")
    else:
        print("⚠️ No contacts match the criteria")

if __name__ == '__main__':
    main()
