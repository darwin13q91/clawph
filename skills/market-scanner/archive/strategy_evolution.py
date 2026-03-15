#!/usr/bin/env python3
"""
Self-Improving Trading Bot
Analyzes own performance, generates strategy variations, tests them
"""

import json
import os
import random
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

class StrategyEvolution:
    """
    Evolves trading strategies based on performance data
    """
    
    def __init__(self, data_dir: str = None):
        self.data_dir = data_dir or os.path.expanduser('~/.openclaw/data')
        self.trades_file = f'{self.data_dir}/paper_trades.json'
        self.strategies_file = f'{self.data_dir}/evolved_strategies.json'
        self.performance_file = f'{self.data_dir}/strategy_performance.json'
        
        self.load_data()
        
    def load_data(self):
        """Load trades and performance data"""
        if os.path.exists(self.trades_file):
            with open(self.trades_file, 'r') as f:
                self.trades = json.load(f)
        else:
            self.trades = []
            
        if os.path.exists(self.performance_file):
            with open(self.performance_file, 'r') as f:
                self.performance = json.load(f)
        else:
            self.performance = {}
            
    def analyze_performance(self) -> Dict:
        """Analyze trading performance by strategy"""
        if not self.trades:
            return {"error": "No trades to analyze"}
        
        # Group by strategy
        strategy_stats = {}
        
        for trade in self.trades:
            strategy = trade.get('strategy', 'unknown')
            
            if strategy not in strategy_stats:
                strategy_stats[strategy] = {
                    'trades': 0,
                    'wins': 0,
                    'losses': 0,
                    'total_pnl': 0,
                    'avg_position': 0,
                    'win_rate': 0
                }
            
            stats = strategy_stats[strategy]
            stats['trades'] += 1
            
            pnl = trade.get('pnl', 0) or 0
            stats['total_pnl'] += pnl
            
            if pnl > 0:
                stats['wins'] += 1
            elif pnl < 0:
                stats['losses'] += 1
                
            stats['avg_position'] += trade.get('position_size', 0)
        
        # Calculate win rates and averages
        for strategy, stats in strategy_stats.items():
            if stats['trades'] > 0:
                stats['win_rate'] = (stats['wins'] / stats['trades']) * 100
                stats['avg_position'] = stats['avg_position'] / stats['trades']
                stats['avg_pnl'] = stats['total_pnl'] / stats['trades']
        
        return strategy_stats
    
    def identify_patterns(self) -> List[Dict]:
        """Identify patterns in winning vs losing trades"""
        closed_trades = [t for t in self.trades if t.get('status') == 'CLOSED' and t.get('pnl') is not None]
        
        if len(closed_trades) < 5:
            return [{"pattern": "Not enough closed trades for pattern analysis", "confidence": 0}]
        
        patterns = []
        
        # Pattern 1: Win rate by market category
        categories = {}
        for trade in closed_trades:
            market = trade.get('market_question', '')
            # Categorize
            if 'NBA' in market or 'NFL' in market or 'sports' in market.lower():
                cat = 'sports'
            elif 'crypto' in market.lower() or 'bitcoin' in market.lower():
                cat = 'crypto'
            elif 'election' in market.lower() or 'trump' in market.lower():
                cat = 'politics'
            else:
                cat = 'other'
            
            if cat not in categories:
                categories[cat] = {'wins': 0, 'total': 0, 'pnl': 0}
            
            categories[cat]['total'] += 1
            categories[cat]['pnl'] += trade.get('pnl', 0)
            if trade.get('pnl', 0) > 0:
                categories[cat]['wins'] += 1
        
        # Find best category
        for cat, stats in categories.items():
            if stats['total'] >= 3:
                win_rate = (stats['wins'] / stats['total']) * 100
                patterns.append({
                    'pattern': f"{cat.upper()} markets have {win_rate:.1f}% win rate",
                    'category': cat,
                    'win_rate': win_rate,
                    'total_trades': stats['total'],
                    'net_pnl': stats['pnl'],
                    'confidence': min(stats['total'] / 10, 1.0)  # Higher confidence with more trades
                })
        
        # Pattern 2: Direction preference
        yes_trades = [t for t in closed_trades if t.get('direction') == 'YES']
        no_trades = [t for t in closed_trades if t.get('direction') == 'NO']
        
        if yes_trades and no_trades:
            yes_wins = len([t for t in yes_trades if t.get('pnl', 0) > 0])
            no_wins = len([t for t in no_trades if t.get('pnl', 0) > 0])
            
            yes_rate = (yes_wins / len(yes_trades)) * 100
            no_rate = (no_wins / len(no_trades)) * 100
            
            if abs(yes_rate - no_rate) > 10:  # Significant difference
                better = "YES" if yes_rate > no_rate else "NO"
                patterns.append({
                    'pattern': f"{better} positions perform better ({max(yes_rate, no_rate):.1f}% vs {min(yes_rate, no_rate):.1f}%)",
                    'direction': better,
                    'confidence': 0.7,
                    'recommendation': f"Favor {better} positions in new trades"
                })
        
        # Pattern 3: Position size vs performance
        position_sizes = [t.get('position_size', 0) for t in closed_trades]
        if position_sizes:
            avg_size = statistics.mean(position_sizes)
            small_trades = [t for t in closed_trades if t.get('position_size', 0) < avg_size]
            large_trades = [t for t in closed_trades if t.get('position_size', 0) >= avg_size]
            
            if small_trades and large_trades:
                small_win_rate = len([t for t in small_trades if t.get('pnl', 0) > 0]) / len(small_trades) * 100
                large_win_rate = len([t for t in large_trades if t.get('pnl', 0) > 0]) / len(large_trades) * 100
                
                if abs(small_win_rate - large_win_rate) > 10:
                    better = "smaller" if small_win_rate > large_win_rate else "larger"
                    patterns.append({
                        'pattern': f"{better.title()} position sizes perform better",
                        'confidence': 0.6,
                        'recommendation': f"Adjust position sizing to favor {better} positions"
                    })
        
        return sorted(patterns, key=lambda x: x.get('confidence', 0), reverse=True)
    
    def generate_strategy_variation(self) -> Dict:
        """Generate a new strategy variation based on learned patterns"""
        patterns = self.identify_patterns()
        current_performance = self.analyze_performance()
        
        # Find best performing category
        best_category = None
        best_win_rate = 50
        
        for pattern in patterns:
            if 'category' in pattern and pattern.get('win_rate', 0) > best_win_rate:
                best_category = pattern['category']
                best_win_rate = pattern['win_rate']
        
        # Find best direction
        best_direction = None
        for pattern in patterns:
            if 'direction' in pattern:
                best_direction = pattern['direction']
        
        # Generate new strategy
        new_strategy = {
            'id': f'evolved_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
            'created_at': datetime.now().isoformat(),
            'based_on_patterns': [p['pattern'] for p in patterns[:3]],
            'rules': {
                'target_category': best_category or 'all',
                'preferred_direction': best_direction or 'both',
                'min_confidence': 0.6,
                'max_position_size': 50,
                'adaptations': []
            },
            'status': 'testing',  # Start in paper trading mode
            'test_results': {
                'trades': 0,
                'wins': 0,
                'losses': 0,
                'win_rate': 0,
                'pnl': 0
            }
        }
        
        # Add specific adaptations based on patterns
        if best_category:
            new_strategy['rules']['adaptations'].append({
                'type': 'category_filter',
                'value': best_category,
                'reason': f'Historical win rate of {best_win_rate:.1f}%'
            })
        
        if best_direction:
            new_strategy['rules']['adaptations'].append({
                'type': 'direction_bias',
                'value': best_direction,
                'reason': 'Direction shows better performance'
            })
        
        return new_strategy
    
    def save_evolved_strategy(self, strategy: Dict):
        """Save evolved strategy to file"""
        strategies = []
        if os.path.exists(self.strategies_file):
            with open(self.strategies_file, 'r') as f:
                strategies = json.load(f)
        
        strategies.append(strategy)
        
        with open(self.strategies_file, 'w') as f:
            json.dump(strategies, f, indent=2)
        
        print(f"✅ Evolved strategy saved: {strategy['id']}")
    
    def run_evolution_cycle(self):
        """Run one full evolution cycle"""
        print("🧬 Starting Strategy Evolution Cycle...")
        print("=" * 60)
        
        # 1. Analyze current performance
        print("\n📊 Analyzing Performance...")
        performance = self.analyze_performance()
        
        for strategy, stats in performance.items():
            print(f"  {strategy}:")
            print(f"    Trades: {stats['trades']}, Win Rate: {stats['win_rate']:.1f}%")
            print(f"    Total P&L: ${stats['total_pnl']:.2f}")
        
        # 2. Identify patterns
        print("\n🔍 Identifying Patterns...")
        patterns = self.identify_patterns()
        
        for i, pattern in enumerate(patterns[:5], 1):
            print(f"  {i}. {pattern['pattern']}")
            print(f"     Confidence: {pattern.get('confidence', 0)*100:.0f}%")
            if 'recommendation' in pattern:
                print(f"     → {pattern['recommendation']}")
        
        # 3. Generate new strategy
        print("\n🧪 Generating Strategy Variation...")
        new_strategy = self.generate_strategy_variation()
        
        print(f"  New Strategy ID: {new_strategy['id']}")
        print(f"  Target Category: {new_strategy['rules']['target_category']}")
        print(f"  Preferred Direction: {new_strategy['rules']['preferred_direction']}")
        print(f"  Adaptations: {len(new_strategy['rules']['adaptations'])}")
        
        # 4. Save for testing
        self.save_evolved_strategy(new_strategy)
        
        print("\n" + "=" * 60)
        print("✅ Evolution Cycle Complete!")
        print(f"New strategy will be tested in paper trading mode.")
        print(f"After 10 trades, it will be evaluated for promotion to live.")
        
        return new_strategy


if __name__ == "__main__":
    evolver = StrategyEvolution()
    evolver.run_evolution_cycle()
