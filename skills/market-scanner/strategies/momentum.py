#!/usr/bin/env python3
"""
Momentum Trading Strategy
Rides price trends - buys when price is rising, sells when momentum fades
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import statistics

class MomentumStrategy:
    """
    Momentum Strategy: Ride the trend
    
    Logic:
    - Buy when price has been rising consistently (momentum building)
    - Sell when momentum slows or reverses
    - Uses price velocity and trend confirmation
    """
    
    def __init__(self, config_path: str = None):
        self.name = "momentum"
        self.config = {
            "lookback_periods": 5,  # Number of price points to check
            "momentum_threshold": 0.02,  # 2% price change for momentum signal
            "confirmation_periods": 2,  # Number of periods to confirm trend
            "max_position_size": 50,  # Max $50 per trade (half of $100 bankroll)
            "stop_loss_pct": 0.10,  # 10% stop loss
            "take_profit_pct": 0.20,  # 20% take profit
        }
        self.price_history = {}  # Market -> list of prices
        
    def analyze(self, market: Dict) -> Optional[Dict]:
        """
        Analyze a market for momentum signals
        
        Returns: Signal dict or None
        """
        market_id = market.get('id', market.get('slug', 'unknown'))
        current_price = self._get_current_price(market)
        
        if not current_price:
            return None
            
        # Update price history
        if market_id not in self.price_history:
            self.price_history[market_id] = []
        
        self.price_history[market_id].append({
            'price': current_price,
            'timestamp': datetime.now().isoformat()
        })
        
        # Keep only recent history
        max_history = self.config['lookback_periods'] + 5
        self.price_history[market_id] = self.price_history[market_id][-max_history:]
        
        # Need enough data
        if len(self.price_history[market_id]) < self.config['lookback_periods']:
            return None
        
        # Calculate momentum
        prices = [p['price'] for p in self.price_history[market_id][-self.config['lookback_periods']:]]
        momentum = self._calculate_momentum(prices)
        
        # Determine signal
        signal = None
        
        if momentum > self.config['momentum_threshold']:
            # Strong upward momentum - BUY YES
            confidence = min(momentum * 10, 0.9)  # Cap at 90%
            signal = {
                'market_id': market_id,
                'market_name': market.get('question', 'Unknown'),
                'signal': 'BUY_YES',
                'confidence': round(confidence, 2),
                'position_size': self._calculate_position_size(confidence),
                'reason': f"Upward momentum: +{momentum:.1%} over {self.config['lookback_periods']} periods",
                'entry_price': current_price,
                'stop_loss': current_price * (1 - self.config['stop_loss_pct']),
                'take_profit': current_price * (1 + self.config['take_profit_pct']),
                'strategy': self.name,
                'timestamp': datetime.now().isoformat()
            }
            
        elif momentum < -self.config['momentum_threshold']:
            # Strong downward momentum - BUY NO (or short YES)
            confidence = min(abs(momentum) * 10, 0.9)
            signal = {
                'market_id': market_id,
                'market_name': market.get('question', 'Unknown'),
                'signal': 'BUY_NO',
                'confidence': round(confidence, 2),
                'position_size': self._calculate_position_size(confidence),
                'reason': f"Downward momentum: {momentum:.1%} over {self.config['lookback_periods']} periods",
                'entry_price': 1 - current_price,  # Price of NO position
                'stop_loss': (1 - current_price) * (1 - self.config['stop_loss_pct']),
                'take_profit': (1 - current_price) * (1 + self.config['take_profit_pct']),
                'strategy': self.name,
                'timestamp': datetime.now().isoformat()
            }
        
        return signal
    
    def _calculate_momentum(self, prices: List[float]) -> float:
        """
        Calculate price momentum as percentage change
        Uses linear regression slope for smoother signal
        """
        if len(prices) < 2:
            return 0
        
        # Simple percentage change: (last - first) / first
        pct_change = (prices[-1] - prices[0]) / prices[0] if prices[0] > 0 else 0
        
        # Normalize by number of periods (average per-period change)
        momentum = pct_change / (len(prices) - 1)
        
        return momentum
    
    def _get_current_price(self, market: Dict) -> Optional[float]:
        """Extract current YES price from market data"""
        # Try different field names
        if 'yes_price' in market:
            return market['yes_price']
        if 'outcomePrices' in market:
            prices = market['outcomePrices']
            if isinstance(prices, list) and len(prices) > 0:
                return float(prices[0])
        if 'bestAsk' in market:
            return market['bestAsk']
        
        return None
    
    def _calculate_position_size(self, confidence: float) -> float:
        """Calculate position size based on confidence"""
        max_size = self.config['max_position_size']
        # Scale position: higher confidence = larger position
        return round(max_size * confidence, 2)
    
    def should_exit(self, position: Dict, current_price: float) -> Tuple[bool, str]:
        """
        Check if position should be closed
        
        Returns: (should_exit, reason)
        """
        entry_price = position.get('entry_price', 0)
        position_type = position.get('type', 'YES')
        
        if position_type == 'YES':
            pnl_pct = (current_price - entry_price) / entry_price if entry_price > 0 else 0
        else:  # NO position
            # For NO, price goes up when YES goes down
            pnl_pct = (entry_price - current_price) / entry_price if entry_price > 0 else 0
        
        # Check stop loss
        if pnl_pct <= -self.config['stop_loss_pct']:
            return True, f"Stop loss hit: {pnl_pct:.1%}"
        
        # Check take profit
        if pnl_pct >= self.config['take_profit_pct']:
            return True, f"Take profit hit: {pnl_pct:.1%}"
        
        # Check momentum reversal
        market_id = position.get('market_id')
        if market_id in self.price_history:
            recent_prices = [p['price'] for p in self.price_history[market_id][-3:]]
            if len(recent_prices) >= 3:
                recent_momentum = self._calculate_momentum(recent_prices)
                
                # Exit if momentum reversed against position
                if position_type == 'YES' and recent_momentum < -0.01:
                    return True, f"Momentum reversed: {recent_momentum:.1%}"
                elif position_type == 'NO' and recent_momentum > 0.01:
                    return True, f"Momentum reversed: {recent_momentum:.1%}"
        
        return False, ""


# Test function
if __name__ == "__main__":
    strategy = MomentumStrategy()
    
    # Test with sample market data
    test_market = {
        'id': 'test-market',
        'question': 'Will BTC hit $100k?',
        'yes_price': 0.65
    }
    
    # Simulate price history
    for price in [0.60, 0.62, 0.63, 0.65, 0.68]:
        test_market['yes_price'] = price
        signal = strategy.analyze(test_market)
        if signal:
            print(f"SIGNAL: {signal['signal']} at ${price}")
            print(f"  Confidence: {signal['confidence']}")
            print(f"  Reason: {signal['reason']}")
