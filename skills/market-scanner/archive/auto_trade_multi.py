#!/usr/bin/env python3
"""
Multi-Strategy Automated Paper Trading
Uses StrategySelector to pick best trades from 3 strategies
"""

import sys
import os
sys.path.append('/home/darwin/.openclaw/workspace/skills/market-scanner')

from strategy_selector import StrategySelector
import json
from datetime import datetime
import subprocess

DATA_DIR = '/home/darwin/.openclaw/data'
LOG_FILE = f'{DATA_DIR}/auto_trading.log'

def log(message):
    timestamp = datetime.now().strftime('%H:%M:%S')
    full_msg = f"[{timestamp}] {message}"
    print(full_msg)
    with open(LOG_FILE, 'a') as f:
        f.write(full_msg + '\n')

def main():
    log("🚀 Multi-Strategy Trading Engine Starting")
    
    # Load scan data
    scan_file = f'{DATA_DIR}/scan.json'
    if not os.path.exists(scan_file):
        log("❌ No scan data available")
        return
    
    with open(scan_file, 'r') as f:
        data = json.load(f)
    
    opportunities = data.get('opportunities', [])
    log(f"📊 Loaded {len(opportunities)} opportunities")
    
    # Initialize strategy selector
    selector = StrategySelector()
    
    # Track signals from each strategy
    all_signals = []
    strategy_counts = {'mean_reversion': 0, 'momentum': 0, 'breakout': 0}
    
    # Analyze each opportunity
    for opp in opportunities[:20]:  # Top 20 by volume
        signals = selector.analyze_all(opp)
        
        for signal in signals:
            signal['market_data'] = opp
            all_signals.append(signal)
            strategy_name = signal.get('strategy_name', 'unknown')
            strategy_counts[strategy_name] = strategy_counts.get(strategy_name, 0) + 1
    
    log(f"🔍 Signals found: {len(all_signals)}")
    for name, count in strategy_counts.items():
        log(f"   {name}: {count}")
    
    if not all_signals:
        log("⚠️ No trading signals generated")
        return
    
    # Sort by confidence and score
    for signal in all_signals:
        base_score = signal['confidence']
        weight = signal.get('strategy_weight', 1.0)
        signal['_total_score'] = base_score * weight
    
    all_signals.sort(key=lambda x: x['_total_score'], reverse=True)
    
    # Execute top trades (diversify across strategies)
    executed_strategies = set()
    max_trades = 2  # Max 2 trades per scan
    trades_executed = 0
    
    for signal in all_signals:
        if trades_executed >= max_trades:
            break
        
        strategy_name = signal.get('strategy_name')
        
        # Try to diversify - prefer different strategies
        if strategy_name in executed_strategies and len(executed_strategies) >= 2:
            continue
        
        market_data = signal.get('market_data', {})
        market_id = signal.get('market_id', f"market_{datetime.now().timestamp()}")
        question = signal.get('market_name', 'Unknown Market')[:100]
        direction = signal['signal'].replace('BUY_', '')
        price = signal.get('entry_price', 0.50)
        position_size = signal.get('position_size', 10)
        confidence = signal.get('confidence', 0)
        reason = signal.get('reason', 'Multi-strategy selection')
        
        # Skip low confidence
        if confidence < 0.5:
            continue
        
        # Calculate shares
        shares = int(position_size / price) if price > 0 else 1
        if shares < 1:
            shares = 1
        
        # Execute paper trade
        try:
            result = subprocess.run([
                'python3', '/home/darwin/.openclaw/workspace/scripts/paper_trader.py',
                'log',
                market_id,
                question,
                direction,
                str(price),
                str(shares),
                f"Strategy: {strategy_name} | Confidence: {confidence:.0%} | {reason}"
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                log(f"✅ TRADE EXECUTED: {strategy_name}")
                log(f"   Direction: {direction} | Shares: {shares} @ ${price:.2f}")
                log(f"   Confidence: {confidence:.0%} | Position: ${position_size}")
                log(f"   Market: {question[:50]}...")
                
                executed_strategies.add(strategy_name)
                trades_executed += 1
            else:
                log(f"❌ Trade failed: {result.stderr}")
                
        except Exception as e:
            log(f"❌ Error executing trade: {e}")
    
    # Log summary
    log(f"📈 Trading session complete")
    log(f"   Total signals: {len(all_signals)}")
    log(f"   Trades executed: {trades_executed}")
    log(f"   Strategies used: {', '.join(executed_strategies) if executed_strategies else 'None'}")
    
    # Save strategy performance tracking
    perf_file = f'{DATA_DIR}/strategy_signals.json'
    signal_log = {
        'timestamp': datetime.now().isoformat(),
        'total_opportunities': len(opportunities),
        'total_signals': len(all_signals),
        'strategy_breakdown': strategy_counts,
        'trades_executed': trades_executed
    }
    
    try:
        with open(perf_file, 'a') as f:
            f.write(json.dumps(signal_log) + '\n')
    except:
        pass

if __name__ == "__main__":
    main()
