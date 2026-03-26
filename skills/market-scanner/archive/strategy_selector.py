#!/usr/bin/env python3
"""
Multi-Strategy Selector
Combines Mean Reversion, Momentum, and Breakout strategies
Picks the best signal or diversifies across strategies
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from strategies.mean_reversion import MeanReversionStrategy
from strategies.momentum import MomentumStrategy
from strategies.breakout import BreakoutStrategy
from typing import Dict, List, Optional
import json
from datetime import datetime

class StrategySelector:
    """
    Combines multiple strategies and selects the best trades
    """
    
    def __init__(self):
        self.strategies = {
            'mean_reversion': MeanReversionStrategy(),
            'momentum': MomentumStrategy(),
            'breakout': BreakoutStrategy()
        }
        self.strategy_performance = self._load_performance()
        
    def _load_performance(self) -> Dict:
        """Load historical strategy performance"""
        perf_file = os.path.expanduser('~/.openclaw/data/strategy_performance.json')
        if os.path.exists(perf_file):
            with open(perf_file, 'r') as f:
                return json.load(f)
        return {name: {'trades': 0, 'wins': 0, 'win_rate': 0.5} 
                for name in self.strategies.keys()}
    
    def analyze_all(self, market: Dict) -> List[Dict]:
        """
        Run all strategies on a market
        Returns list of signals from all strategies
        """
        all_signals = []
        
        for name, strategy in self.strategies.items():
            try:
                signal = strategy.analyze(market)
                if signal:
                    signal['strategy_name'] = name
                    signal['strategy_weight'] = self._get_strategy_weight(name)
                    all_signals.append(signal)
            except Exception as e:
                print(f"Strategy {name} error: {e}")
                continue
        
        return all_signals
    
    def select_best(self, market: Dict) -> Optional[Dict]:
        """
        Select the best signal from all strategies
        Uses confidence + strategy performance weighting
        """
        signals = self.analyze_all(market)
        
        if not signals:
            return None
        
        # Score each signal
        for signal in signals:
            base_score = signal['confidence']
            weight = signal.get('strategy_weight', 0.5)
            signal['_total_score'] = base_score * weight
        
        # Sort by total score
        signals.sort(key=lambda x: x['_total_score'], reverse=True)
        
        # Return best signal
        best = signals[0]
        del best['_total_score']  # Clean up
        
        return best
    
    def select_diversified(self, market: Dict, max_strategies: int = 2) -> List[Dict]:
        """
        Select signals from different strategies for diversification
        """
        signals = self.analyze_all(market)
        
        if not signals:
            return []
        
        # Group by strategy
        by_strategy = {}
        for sig in signals:
            name = sig['strategy_name']
            if name not in by_strategy:
                by_strategy[name] = []
            by_strategy[name].append(sig)
        
        # Pick best from each strategy
        selected = []
        for strategy_name, strategy_signals in by_strategy.items():
            if len(selected) >= max_strategies:
                break
            
            # Sort by confidence
            strategy_signals.sort(key=lambda x: x['confidence'], reverse=True)
            selected.append(strategy_signals[0])
        
        return selected
    
    def _get_strategy_weight(self, strategy_name: str) -> float:
        """Get weight based on historical performance"""
        perf = self.strategy_performance.get(strategy_name, {})
        win_rate = perf.get('win_rate', 0.5)
        
        # Weight higher if good performance
        if win_rate > 0.6:
            return 1.2
        elif win_rate > 0.5:
            return 1.0
        else:
            return 0.8
    
    def update_performance(self, strategy_name: str, won: bool):
        """Update strategy performance after trade closes"""
        if strategy_name in self.strategy_performance:
            perf = self.strategy_performance[strategy_name]
            perf['trades'] += 1
            if won:
                perf['wins'] += 1
            perf['win_rate'] = perf['wins'] / perf['trades']
            
            # Save updated performance
            perf_file = os.path.expanduser('~/.openclaw/data/strategy_performance.json')
            os.makedirs(os.path.dirname(perf_file), exist_ok=True)
            with open(perf_file, 'w') as f:
                json.dump(self.strategy_performance, f, indent=2)
    
    def get_strategy_stats(self) -> Dict:
        """Get performance stats for all strategies"""
        return self.strategy_performance


# Test
if __name__ == "__main__":
    selector = StrategySelector()
    
    # Test market
    test_market = {
        'id': 'test-multi',
        'question': 'Will Bitcoin hit $100k in 2026?',
        'yes_price': 0.65,
        'volume': 150000,
        'bestAsk': 0.65,
        'bestBid': 0.63
    }
    
    print("Running all strategies...")
    signals = selector.analyze_all(test_market)
    
    print(f"\nFound {len(signals)} signals:")
    for sig in signals:
        print(f"  {sig['strategy_name']}: {sig['signal']} (confidence: {sig['confidence']})")
    
    best = selector.select_best(test_market)
    if best:
        print(f"\n🏆 Best signal: {best['strategy_name']} - {best['signal']}")
        print(f"   Confidence: {best['confidence']}")
        print(f"   Reason: {best['reason']}")
    
    print(f"\n📊 Strategy weights:")
    for name in selector.strategies.keys():
        weight = selector._get_strategy_weight(name)
        print(f"  {name}: {weight:.1f}x")
