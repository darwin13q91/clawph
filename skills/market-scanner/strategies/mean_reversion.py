#!/usr/bin/env python3
"""
Mean Reversion Trading Strategy
Buys when price is below fair value, sells when above
"""

from typing import Dict, Optional, List
from datetime import datetime
import statistics

class MeanReversionStrategy:
    """
    Mean Reversion Strategy: Buy low, sell high relative to historical average
    
    Logic:
    - Calculate fair price (volume-weighted average or moving average)
    - Buy YES when current price is significantly below fair
    - Buy NO when current price is significantly above fair
    """
    
    def __init__(self):
        self.name = "mean_reversion"
        self.config = {
            "threshold_pct": 0.10,  # 10% deviation triggers signal
            "min_liquidity": 50000,  # Minimum $50k liquidity
            "max_position_size": 50,
            "lookback_hours": 24,  # Use 24h average as "fair"
        }
    
    def analyze(self, market: Dict) -> Optional[Dict]:
        """
        Analyze market for mean reversion opportunity
        """
        current_price = self._get_price(market)
        liquidity = market.get('liquidity', 0)
        volume = market.get('volume', 0)
        
        if not current_price:
            return None
        
        # Skip low liquidity markets
        if liquidity < self.config['min_liquidity']:
            return None
        
        # Calculate fair price using volume-weighted logic
        fair_price = self._calculate_fair_price(market)
        
        if not fair_price or fair_price <= 0:
            return None
        
        # Calculate deviation
        deviation = (current_price - fair_price) / fair_price
        
        signal = None
        
        # Price below fair - opportunity to buy YES
        if deviation < -self.config['threshold_pct']:
            confidence = min(abs(deviation) * 5, 0.85)  # Cap confidence
            signal = {
                'market_id': market.get('id', market.get('slug', 'unknown')),
                'market_name': market.get('question', 'Unknown'),
                'signal': 'BUY_YES',
                'confidence': round(confidence, 2),
                'position_size': self._calculate_position_size(confidence),
                'reason': f"Price {abs(deviation):.1%} below fair value (${fair_price:.2f})",
                'entry_price': current_price,
                'target_price': fair_price,
                'stop_loss': current_price * 0.90,
                'strategy': self.name,
                'timestamp': datetime.now().isoformat(),
                'metadata': {
                    'fair_price': fair_price,
                    'deviation': deviation,
                    'liquidity': liquidity
                }
            }
        
        # Price above fair - opportunity to buy NO (bet against)
        elif deviation > self.config['threshold_pct']:
            confidence = min(deviation * 5, 0.85)
            signal = {
                'market_id': market.get('id', market.get('slug', 'unknown')),
                'market_name': market.get('question', 'Unknown'),
                'signal': 'BUY_NO',
                'confidence': round(confidence, 2),
                'position_size': self._calculate_position_size(confidence),
                'reason': f"Price {deviation:.1%} above fair value (${fair_price:.2f})",
                'entry_price': 1 - current_price,
                'target_price': 1 - fair_price,
                'stop_loss': (1 - current_price) * 0.90,
                'strategy': self.name,
                'timestamp': datetime.now().isoformat(),
                'metadata': {
                    'fair_price': fair_price,
                    'deviation': deviation,
                    'liquidity': liquidity
                }
            }
        
        return signal
    
    def _get_price(self, market: Dict) -> Optional[float]:
        """Get current YES price"""
        if 'yes_price' in market:
            return market['yes_price']
        if 'outcomePrices' in market:
            prices = market['outcomePrices']
            if isinstance(prices, list) and len(prices) > 0:
                return float(prices[0])
        if 'bestAsk' in market:
            return market['bestAsk']
        return None
    
    def _calculate_fair_price(self, market: Dict) -> Optional[float]:
        """
        Calculate fair price
        Simple version: use midpoint of bid/ask or recent average
        """
        # Use spread midpoint if available
        best_ask = market.get('bestAsk')
        best_bid = market.get('bestBid')
        
        if best_ask and best_bid:
            return (best_ask + best_bid) / 2
        
        # Fallback to current price (no mean reversion signal)
        return self._get_price(market)
    
    def _calculate_position_size(self, confidence: float) -> float:
        """Calculate position size based on confidence"""
        max_size = self.config['max_position_size']
        return round(max_size * confidence, 2)
    
    def should_exit(self, position: Dict, current_price: float) -> tuple:
        """Check if position should be closed"""
        entry = position.get('entry_price', 0)
        target = position.get('target_price', entry)
        
        if entry <= 0:
            return False, ""
        
        position_type = position.get('type', 'YES')
        
        if position_type == 'YES':
            pnl_pct = (current_price - entry) / entry
            # Exit if reached target or hit stop loss
            if current_price >= target:
                return True, f"Target reached: {pnl_pct:.1%} profit"
            if pnl_pct <= -0.10:
                return True, f"Stop loss: {pnl_pct:.1%} loss"
        else:  # NO position
            pnl_pct = (entry - current_price) / entry
            no_price = 1 - current_price
            no_target = 1 - target
            if no_price >= no_target:
                return True, f"Target reached: {pnl_pct:.1%} profit"
            if pnl_pct <= -0.10:
                return True, f"Stop loss: {pnl_pct:.1%} loss"
        
        return False, ""


if __name__ == "__main__":
    strategy = MeanReversionStrategy()
    
    # Test
    market = {
        'id': 'test',
        'question': 'Test market',
        'yes_price': 0.45,
        'bestAsk': 0.45,
        'bestBid': 0.43,
        'liquidity': 100000
    }
    
    signal = strategy.analyze(market)
    if signal:
        print(f"Signal: {signal['signal']}")
        print(f"Confidence: {signal['confidence']}")
        print(f"Reason: {signal['reason']}")
    else:
        print("No signal")
