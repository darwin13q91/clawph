#!/usr/bin/env python3
"""
Evolved Strategy Integration
Integrates self-improved strategies into the trading system
"""

import json
import os
from datetime import datetime

class EvolvedStrategyTrader:
    """
    Uses evolved strategies alongside original ones
    """
    
    def __init__(self):
        self.data_dir = os.path.expanduser('~/.openclaw/data')
        self.strategies_file = f'{self.data_dir}/evolved_strategies.json'
        self.load_strategies()
        
    def load_strategies(self):
        """Load evolved strategies"""
        if os.path.exists(self.strategies_file):
            with open(self.strategies_file, 'r') as f:
                self.strategies = json.load(f)
        else:
            self.strategies = []
            
    def get_active_strategies(self) -> List[Dict]:
        """Get strategies ready for live trading"""
        active = []
        
        for strategy in self.strategies:
            # Check if strategy passed testing
            if strategy.get('status') == 'testing':
                results = strategy.get('test_results', {})
                trades = results.get('trades', 0)
                win_rate = results.get('win_rate', 0)
                
                # Promote to live if tested well
                if trades >= 10 and win_rate >= 55:
                    strategy['status'] = 'live'
                    active.append(strategy)
                    print(f"🚀 Strategy promoted to LIVE: {strategy['id']}")
                elif trades >= 10 and win_rate < 50:
                    # Retire poor performers
                    strategy['status'] = 'retired'
                    print(f"🗑️ Strategy retired (poor performance): {strategy['id']}")
                else:
                    # Still testing
                    active.append(strategy)
                    
            elif strategy.get('status') == 'live':
                active.append(strategy)
                
        return active
    
    def update_test_results(self, trade_result: Dict):
        """Update test results for strategies"""
        strategy_id = trade_result.get('strategy_id')
        
        for strategy in self.strategies:
            if strategy['id'] == strategy_id:
                results = strategy['test_results']
                results['trades'] += 1
                
                pnl = trade_result.get('pnl', 0)
                if pnl > 0:
                    results['wins'] += 1
                elif pnl < 0:
                    results['losses'] += 1
                    
                results['win_rate'] = (results['wins'] / results['trades']) * 100
                results['pnl'] += pnl
                
                # Save updated results
                with open(self.strategies_file, 'w') as f:
                    json.dump(self.strategies, f, indent=2)
                break
    
    def select_best_strategy(self, market: Dict) -> Optional[str]:
        """Select best strategy for current market"""
        active = self.get_active_strategies()
        
        if not active:
            return None
            
        # Score each strategy
        scored = []
        for strategy in active:
            score = 0
            results = strategy.get('test_results', {})
            
            # Win rate score (0-50)
            win_rate = results.get('win_rate', 50)
            score += win_rate / 2
            
            # Experience score (more trades = more reliable)
            trades = results.get('trades', 0)
            score += min(trades / 2, 25)
            
            # Category match
            target_cat = strategy['rules'].get('target_category', 'all')
            if target_cat != 'all':
                market_q = market.get('question', '').lower()
                if target_cat in market_q or self._category_in_market(target_cat, market_q):
                    score += 25
                    
            scored.append((strategy, score))
        
        # Return highest scoring
        if scored:
            best = max(scored, key=lambda x: x[1])
            return best[0]['id']
        
        return None
    
    def _category_in_market(self, category: str, market_question: str) -> bool:
        """Check if category applies to market"""
        category_keywords = {
            'sports': ['nba', 'nfl', 'soccer', 'football', 'basketball', 'championship', 'finals'],
            'crypto': ['bitcoin', 'crypto', 'ethereum', 'blockchain'],
            'politics': ['election', 'trump', 'biden', 'vote', 'president', 'congress']
        }
        
        keywords = category_keywords.get(category, [category])
        return any(kw in market_question for kw in keywords)


if __name__ == "__main__":
    trader = EvolvedStrategyTrader()
    active = trader.get_active_strategies()
    
    print(f"🧬 Active Evolved Strategies: {len(active)}")
    for strategy in active:
        print(f"  - {strategy['id']}: {strategy['status']}")
        results = strategy.get('test_results', {})
        print(f"    Win Rate: {results.get('win_rate', 0):.1f}% ({results.get('trades', 0)} trades)")
