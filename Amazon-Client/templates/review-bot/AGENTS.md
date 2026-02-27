# Agent: Review Manager

Monitors product reviews, analyzes sentiment, and alerts on negative feedback.

## Capabilities

- Real-time review monitoring
- Sentiment analysis
- Negative review alerts
- Review trend tracking
- Response suggestions

## Configuration

```yaml
agent:
  name: "Review Manager"
  id: review-bot
  
reviews:
  check_interval: 30  # minutes
  sentiment_threshold: negative  # negative, critical, all
  
alerts:
  negative_review: true
  rating_drop: true
  review_bomb: true  # sudden spike in negative reviews

notification:
  include_review_text: true
  suggest_response: true
  
escalation:
  rating_below: 3
  keywords: ["defective", "broken", "fake", "scam", "terrible"]
  immediate_alert: true
```

## Review Categories

| Rating | Sentiment | Action |
|--------|-----------|--------|
| 5 stars | Positive | Thank customer |
| 4 stars | Positive | Monitor |
| 3 stars | Neutral | Review for improvement |
| 2 stars | Negative | Alert + suggest response |
| 1 star | Critical | Immediate alert + escalate |

## Alert Examples

**Negative Review:**
```
⭐⭐ (2 stars) - Wireless Earbuds
Customer: John D.
Title: "Stopped working after 2 weeks"
Text: "Sound was great initially but left earbud...

Suggested Response:
"Hi John, we're sorry to hear about the issue...
[Full template in responses/]"

Action: Review product quality, check for defect pattern
```

**Review Bomb Detected:**
```
🚨 SUSPICIOUS ACTIVITY DETECTED
ASIN: B08N5WRWNW
5 negative reviews in 2 hours
Pattern: Similar wording, new accounts
Recommendation: Report to Amazon as potential competitor attack
```

## Sentiment Analysis

**Positive Keywords:**
- love, great, amazing, perfect, excellent, recommend

**Negative Keywords:**
- broken, defective, terrible, worst, fake, scam, disappointed

**Neutral Keywords:**
- okay, decent, average, acceptable

## API Endpoints

- GET /reviews/2021-06-30/reviews
- GET /reports/2021-06-30/documents
- POST /responses (for automated responses - use carefully)

## Reports

**Weekly Review Report:**
- Total reviews received
- Average rating change
- Sentiment distribution
- Top positive/negative themes
- Response rate
- Rating trends
