#!/usr/bin/env python3
"""
Evolution Monitor Dashboard
Shows self-improving bot status and performance
"""

import json
import os
from datetime import datetime

class EvolutionMonitor:
    def __init__(self):
        self.data_dir = os.path.expanduser('~/.openclaw/data')
        self.strategies_file = f'{self.data_dir}/evolved_strategies.json'
        self.trades_file = f'{self.data_dir}/paper_trades.json'
        self.evolution_log = f'{self.data_dir}/evolution.log'
        
    def load_data(self):
        """Load all data"""
        # Load evolved strategies
        if os.path.exists(self.strategies_file):
            with open(self.strategies_file, 'r') as f:
                self.strategies = json.load(f)
        else:
            self.strategies = []
            
        # Load trades
        if os.path.exists(self.trades_file):
            with open(self.trades_file, 'r') as f:
                self.trades = json.load(f)
        else:
            self.trades = []
    
    def show_dashboard(self):
        """Display evolution dashboard"""
        self.load_data()
        
        print("\n" + "="*70)
        print("🧬 SELF-IMPROVING TRADING BOT - MONITOR")
        print("="*70)
        
        # Overall Stats
        print("\n📊 OVERALL STATISTICS")
        print("-"*70)
        print(f"Total Trades: {len(self.trades)}")
        
        closed_trades = [t for t in self.trades if t.get('status') == 'CLOSED']
        open_trades = [t for t in self.trades if t.get('status') == 'OPEN']
        
        print(f"  ✅ Closed: {len(closed_trades)}")
        print(f"  ⏳ Open: {len(open_trades)}")
        
        if closed_trades:
            wins = len([t for t in closed_trades if t.get('pnl', 0) > 0])
            losses = len([t for t in closed_trades if t.get('pnl', 0) < 0])
            win_rate = (wins / len(closed_trades)) * 100
            
            print(f"  🏆 Wins: {wins}")
            print(f"  ❌ Losses: {losses}")
            print(f"  📈 Win Rate: {win_rate:.1f}%")
            
            total_pnl = sum(t.get('pnl', 0) for t in closed_trades)
            print(f"  💰 Total P&L: ${total_pnl:.2f}")
        else:
            print("  ⚠️  No closed trades yet - waiting for data...")
        
        # Evolved Strategies
        print("\n🧪 EVOLVED STRATEGIES")
        print("-"*70)
        
        if not self.strategies:
            print("  No evolved strategies yet.")
            print("  First evolution: Next Sunday 9 PM")
        else:
            for strategy in self.strategies:
                status_icon = {
                    'testing': '🧪',
                    'live': '🚀',
                    'retired': '🗑️'
                }.get(strategy.get('status'), '❓')
                
                print(f"\n  {status_icon} {strategy['id']}")
                print(f"     Status: {strategy.get('status', 'unknown').upper()}")
                print(f"     Created: {strategy.get('created_at', 'unknown')[:10]}")
                
                results = strategy.get('test_results', {})
                trades = results.get('trades', 0)
                win_rate = results.get('win_rate', 0)
                pnl = results.get('pnl', 0)
                
                print(f"     Test Trades: {trades}")
                if trades > 0:
                    print(f"     Test Win Rate: {win_rate:.1f}%")
                    print(f"     Test P&L: ${pnl:.2f}")
                    
                    # Progress to promotion
                    if strategy.get('status') == 'testing':
                        if trades < 10:
                            print(f"     Progress: {trades}/10 trades to evaluation")
                        elif win_rate >= 55:
                            print(f"     🎯 Ready for LIVE promotion!")
                        else:
                            print(f"     ⚠️  Below threshold (need 55% win rate)")
                
                # Show adaptations
                adaptations = strategy.get('rules', {}).get('adaptations', [])
                if adaptations:
                    print(f"     Adaptations:")
                    for adapt in adaptations:
                        print(f"       • {adapt.get('type')}: {adapt.get('value')}")
                        if 'reason' in adapt:
                            print(f"         ({adapt['reason']})")
        
        # Pattern Insights
        print("\n🔍 PATTERN INSIGHTS")
        print("-"*70)
        
        if closed_trades:
            # Category analysis
            categories = {}
            for trade in closed_trades:
                market = trade.get('market_question', '')
                if 'NBA' in market or 'NFL' in market:
                    cat = 'Sports'
                elif 'crypto' in market.lower():
                    cat = 'Crypto'
                elif 'election' in market.lower():
                    cat = 'Politics'
                else:
                    cat = 'Other'
                
                if cat not in categories:
                    categories[cat] = {'wins': 0, 'total': 0, 'pnl': 0}
                
                categories[cat]['total'] += 1
                categories[cat]['pnl'] += trade.get('pnl', 0)
                if trade.get('pnl', 0) > 0:
                    categories[cat]['wins'] += 1
            
            if categories:
                print("  Performance by Category:")
                for cat, stats in sorted(categories.items(), 
                                       key=lambda x: x[1]['wins']/max(x[1]['total'],1), 
                                       reverse=True):
                    win_rate = (stats['wins'] / stats['total']) * 100
                    print(f"    {cat:12} | Win Rate: {win_rate:5.1f}% | "
                          f"Trades: {stats['total']:2} | P&L: ${stats['pnl']:+.2f}")
            
            # Direction analysis
            yes_trades = [t for t in closed_trades if t.get('direction') == 'YES']
            no_trades = [t for t in closed_trades if t.get('direction') == 'NO']
            
            if yes_trades and no_trades:
                yes_wins = len([t for t in yes_trades if t.get('pnl', 0) > 0])
                no_wins = len([t for t in no_trades if t.get('pnl', 0) > 0])
                
                yes_rate = (yes_wins / len(yes_trades)) * 100
                no_rate = (no_wins / len(no_trades)) * 100
                
                print(f"\n  Performance by Direction:")
                print(f"    YES positions: {yes_rate:.1f}% win rate ({len(yes_trades)} trades)")
                print(f"    NO positions:  {no_rate:.1f}% win rate ({len(no_trades)} trades)")
                
                if abs(yes_rate - no_rate) > 10:
                    better = "YES" if yes_rate > no_rate else "NO"
                    print(f"    💡 Insight: {better} positions perform significantly better")
        else:
            print("  No closed trades yet to analyze patterns.")
            print("  Patterns will emerge as trades close.")
        
        # Next Evolution
        print("\n📅 NEXT EVOLUTION")
        print("-"*70)
        
        # Calculate days until Sunday
        today = datetime.now()
        days_until_sunday = (6 - today.weekday()) % 7
        if days_until_sunday == 0:
            next_evolution = "Today at 9:00 PM"
        else:
            next_evolution = f"In {days_until_sunday} days (Sunday 9:00 PM)"
        
        print(f"  Next Evolution: {next_evolution}")
        print(f"  Schedule: Every Sunday at 9:00 PM")
        
        # Actions
        print("\n🎯 RECOMMENDED ACTIONS")
        print("-"*70)
        
        if not closed_trades:
            print("  1. ⏳ Wait for trades to close (need P&L data)")
        
        if len([s for s in self.strategies if s.get('status') == 'testing']) > 0:
            print("  2. 📊 Monitor evolved strategies in testing phase")
        
        if len([s for s in self.strategies if s.get('status') == 'live']) > 0:
            print("  3. 🚀 Evolved strategies are LIVE and trading!")
            
        if len(closed_trades) >= 10 and not self.strategies:
            print("  4. 🧬 Run manual evolution: cd ~/.openclaw/workspace/skills/market-scanner && python3 strategy_evolution.py")
        
        print("\n" + "="*70)
        print("💡 Tip: Run this monitor anytime with:")
        print("   python3 ~/.openclaw/workspace/skills/market-scanner/monitor_evolution.py")
        print("="*70 + "\n")
    
    def watch_live(self):
        """Live monitoring mode"""
        import time
        
        print("\n🔴 LIVE MONITORING MODE (Press Ctrl+C to exit)")
        print("="*70)
        
        try:
            while True:
                self.show_dashboard()
                print("\n⏱️  Refreshing in 30 seconds...")
                time.sleep(30)
                os.system('clear' if os.name != 'nt' else 'cls')
        except KeyboardInterrupt:
            print("\n\n👋 Monitor stopped.")


if __name__ == "__main__":
    import sys
    
    monitor = EvolutionMonitor()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--watch':
        monitor.watch_live()
    else:
        monitor.show_dashboard()
