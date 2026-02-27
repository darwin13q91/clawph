#!/usr/bin/env python3
"""
Breakout Trading Strategy
Catches big moves when price breaks through support/resistance levels
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import statistics

class BreakoutStrategy:
    """
    Breakout Strategy: Catch explosive moves
    
    Logic:
    - Identify support and resistance levels
    - Buy when price breaks ABOVE resistance (breakout up)
    - Buy NO when price breaks BELOW support (breakout down)
    - Use volume confirmation
    """
    
    def __init__(self, config_path: str = None):
        self.name = "breakout"
        self.config = {
            "lookback_periods": 10,  # Periods to establish support/resistance
            "breakout_threshold": 0.03,  # 3% beyond level to confirm breakout
            "volume_confirmation": True,  # Require volume spike
            "volume_multiplier": 1.5,  # Volume must be 1.5x average
            "max_position_size": 50,
            "stop_loss_pct": 0.08,  # Tighter stop for breakouts (8%)
            "take_profit_pct": 0.25,  # Higher target for breakouts (25%)
            "max_hold_days": 7,  # Exit if no breakout within 7 days
        }
        self.price_history = {}
        self.volume_history = {}
        self.support_levels = {}
        self.resistance_levels = {}
        
    def analyze(self, market: Dict) -> Optional[Dict]:
        """
        Analyze market for breakout opportunities
        """
        market_id = market.get('id', market.get('slug', 'unknown'))
        current_price = self._get_current_price(market)
        current_volume = market.get('volume', 0)
        
        if not current_price:
            return None
        
        # Update histories
        self._update_history(market_id, current_price, current_volume)
        
        # Need enough data
        if len(self.price_history.get(market_id, [])) < self.config['lookback_periods']:
            return None
        
        # Calculate support/resistance
        self._calculate_levels(market_id)
        
        # Check for breakout
        signal = self._detect_breakout(market_id, market, current_price, current_volume)
        
        return signal
    
    def _update_history(self, market_id: str, price: float, volume: float):
        """Track price and volume history"""
        if market_id not in self.price_history:
            self.price_history[market_id] = []
            self.volume_history[market_id] = []
        
        self.price_history[market_id].append({
            'price': price,
            'timestamp': datetime.now().isoformat()
        })
        
        self.volume_history[market_id].append(volume)
        
        # Trim history
        max_len = self.config['lookback_periods'] + 10
        self.price_history[market_id] = self.price_history[market_id][-max_len:]
        self.volume_history[market_id] = self.volume_history[market_id][-max_len:]
    
    def _calculate_levels(self, market_id: str):
        """Calculate support and resistance levels"""
        prices = [p['price'] for p in self.price_history[market_id]]
        
        if len(prices) < 5:
            return
        
        # Simple method: recent min/max with some buffer
        recent_prices = prices[-self.config['lookback_periods']:]
        
        # Support = lowest price + small buffer
        support = min(recent_prices) * 1.01  # 1% above absolute low
        
        # Resistance = highest price - small buffer  
        resistance = max(recent_prices) * 0.99  # 1% below absolute high
        
        self.support_levels[market_id] = support
        self.resistance_levels[market_id] = resistance
    
    def _detect_breakout(self, market_id: str, market: Dict, current_price: float, 
                         current_volume: float) -> Optional[Dict]:
        """Detect if price has broken out"""
        
        support = self.support_levels.get(market_id)
        resistance = self.resistance_levels.get(market_id)
        
        if not support or not resistance:
            return None
        
        # Check for volume confirmation
        volume_confirmed = True
        if self.config['volume_confirmation']:
            volumes = self.volume_history.get(market_id, [])
            if len(volumes) >= 3:
                avg_volume = statistics.mean(volumes[-5:]) if len(volumes) >= 5 else statistics.mean(volumes)
                if avg_volume > 0:
                    volume_ratio = current_volume / avg_volume
                    volume_confirmed = volume_ratio >= self.config['volume_multiplier']
        
        signal = None
        
        # Breakout ABOVE resistance
        breakout_up = current_price > resistance * (1 + self.config['breakout_threshold'])
        
        if breakout_up and volume_confirmed:
            confidence = min(0.5 + (current_price - resistance) / resistance, 0.9)
            signal = {
                'market_id': market_id,
                'market_name': market.get('question', 'Unknown'),
                'signal': 'BUY_YES',
                'confidence': round(confidence, 2),
                'position_size': self._calculate_position_size(confidence),
                'reason': f"Breakout above ${resistance:.2f} resistance (current: ${current_price:.2f})",
                'entry_price': current_price,
                'stop_loss': resistance * 0.98,  # Just below old resistance
                'take_profit': current_price * 1.25,
                'strategy': self.name,
                'timestamp': datetime.now().isoformat(),
                'metadata': {
                    'support': support,
                    'resistance': resistance,
                    'volume_confirmed': volume_confirmed
                }
            }
        
        # Breakout BELOW support (falling)
        breakout_down = current_price < support * (1 - self.config['breakout_threshold'])
        
        if breakout_down and volume_confirmed:
            confidence = min(0.5 + (support - current_price) / support, 0.9)
            signal = {
                'market_id': market_id,
                'market_name': market.get('question', 'Unknown'),
                'signal': 'BUY_NO',
                'confidence': round(confidence, 2),
                'position_size': self._calculate_position_size(confidence),
                'reason': f"Breakdown below ${support:.2f} support (current: ${current_price:.2f})",
                'entry_price': 1 - current_price,
                'stop_loss': (1 - current_price) * 0.92,
                'take_profit': (1 - current_price) * 1.25,
                'strategy': self.name,
                'timestamp': datetime.now().isoformat(),
                'metadata': {
                    'support': support,
                    'resistance': resistance,
                    'volume_confirmed': volume_confirmed
                }
            }
        
        return signal
    
    def _get_current_price(self, market: Dict) -> Optional[float]:
        """Extract current YES price"""
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
        """Position sizing based on confidence"""
        max_size = self.config['max_position_size']
        return round(max_size * confidence, 2)
    
    def should_exit(self, position: Dict, current_price: float, 
                    days_held: int = 0) -> Tuple[bool, str]:
        """Check if breakout position should be closed"""
        entry_price = position.get('entry_price', 0)
        position_type = position.get('type', 'YES')
        
        # Calculate P&L
        if position_type == 'YES':
            pnl_pct = (current_price - entry_price) / entry_price if entry_price > 0 else 0
        else:
            pnl_pct = (entry_price - current_price) / entry_price if entry_price > 0 else 0
        
        # Stop loss
        if pnl_pct <= -self.config['stop_loss_pct']:
            return True, f"Stop loss: {pnl_pct:.1%}"
        
        # Take profit
        if pnl_pct >= self.config['take_profit_pct']:
            return True, f"Take profit: {pnl_pct:.1%}"
        
        # Time-based exit (if breakout didn't happen)
        if days_held >= self.config['max_hold_days']:
            return True, f"Time exit: {days_held} days held"
        
        # False breakout - price returned to range
        market_id = position.get('market_id')
        if market_id in self.support_levels and market_id in self.resistance_levels:
            support = self.support_levels[market_id]
            resistance = self.resistance_levels[market_id]
            
            if position_type == 'YES' and current_price < resistance:
                return True, "False breakout - back in range"
            elif position_type == 'NO' and current_price > support:
                return True, "False breakdown - back in range"
        
        return False, ""


if __name__ == "__main__":
    strategy = BreakoutStrategy()
    
    # Test data simulating price building up then breaking out
    test_prices = [0.50, 0.52, 0.51, 0.53, 0.52, 0.54, 0.55, 0.56, 0.58, 0.62, 0.65]
    
    for i, price in enumerate(test_prices):
        test_market = {
            'id': 'test-breakout',
            'question': 'Will X happen?',
            'yes_price': price,
            'volume': 100000 + (i * 10000)  # Increasing volume
        }
        
        signal = strategy.analyze(test_market)
        if signal:
            print(f"🚀 BREAKOUT at ${price}")
            print(f"  Signal: {signal['signal']}")
            print(f"  Confidence: {signal['confidence']}")
            print(f"  Reason: {signal['reason']}")
