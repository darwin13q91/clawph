# Shared Base Skills

Reusable skills across all restaurant agents.

## Skills Overview

| Skill | Purpose | Complexity |
|-------|---------|------------|
| `menu-qa` | Answer menu questions | Medium |
| `reservations` | Book tables | High |
| `hours-location` | When/where info | Low |
| `faq-handler` | Common questions | Medium |
| `review-collector` | Ask for reviews | Low |
| `allergy-filter` | Dietary restrictions | Medium |

## Installation

Each agent loads these as base layer:

```yaml
# agent-config.yaml
skills:
  base:
    - ../../../shared-skills/menu-qa
    - ../../../shared-skills/reservations
    - ../../../shared-skills/hours-location
  custom:
    - ./skills/wine-pairing
```

## Skill: menu-qa

Answers questions about menu items, ingredients, prices, availability.

### Capabilities
- "What's in the lasagna?" → Ingredients list
- "How much is the ribeye?" → Price + sides
- "Is the pasta gluten-free?" → Allergen info
- "What's the chef's special?" → Daily specials
- "Do you have vegan options?" → Filter menu

### Required Data
```json
{
  "menu": {
    "categories": ["appetizers", "mains", "desserts"],
    "items": [
      {
        "name": "Margherita Pizza",
        "price": 16.00,
        "description": "San Marzano tomatoes, fresh mozzarella, basil",
        "allergens": ["gluten", "dairy"],
        "dietary": ["vegetarian"],
        "available": true
      }
    ]
  }
}
```

## Skill: reservations

Handle table bookings via conversation.

### Capabilities
- Check availability
- Book table (name, party size, time, phone)
- Modify booking
- Cancel reservation
- Send confirmation

### Flow
```
User: "I want a table for 4 on Friday at 7pm"
Agent: "I have availability at 7:00pm and 8:30pm. Which works better?"
User: "7pm"
Agent: "Great! Name for the reservation?"
User: "Smith"
Agent: "Perfect! Table for 4 under Smith on Friday at 7:00pm. 
        Phone number for confirmation?"
```

### Integration
- Google Calendar API
- Resy API (optional)
- Simple SQLite database

## Skill: hours-location

Basic business info.

### Capabilities
- Current hours
- Holiday hours
- Location/directions
- Parking info
- Delivery radius

### Example Q&A
Q: "Are you open right now?"
A: "Yes! We're open until 10pm tonight."

Q: "What time do you close on Sundays?"
A: "We close at 9pm on Sundays."

Q: "Where are you located?"
A: "123 Main Street, Downtown. There's parking 
    in the lot behind the building."

## Skill: review-collector

Politely ask satisfied customers for reviews.

### Trigger
- After reservation completion
- After "thank you" message
- After positive feedback

### Message
"Glad you enjoyed your visit! If you have a moment, 
we'd love a review on Google: [link]"

### Tracking
- Don't ask same customer twice
- Max once per month
- Track conversion rate

## Skill: allergy-filter

Help guests with dietary restrictions.

### Capabilities
- "What can I eat if I'm allergic to nuts?"
- "Do you have dairy-free desserts?"
- "Is this dish celiac-safe?"
- Cross-contamination warnings

### Safety
ALWAYS include: "Please inform your server of any 
allergies when ordering."
