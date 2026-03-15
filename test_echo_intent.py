#!/usr/bin/env python3
"""
Test script to verify Echo intent classification
"""

import re

def classify_email(subject, body, sender):
    """
    Classify email into Tier 1, 2, or 3
    INTENT-BASED DYNAMIC RESPONSE SYSTEM (Updated March 10, 2026)
    Returns: (tier, reason, template_name)
    """
    subject_lower = subject.lower()
    body_lower = body.lower()
    combined = f"{subject_lower} {body_lower}"
    
    # ============================================================
    # INTENT DETECTION LAYER 1: Form Dropdown (from subject/body)
    # ============================================================
    
    # Check subject line for intent: "Contact Form Submission: [intent]"
    intent_from_subject = None
    if 'contact form submission' in subject_lower:
        # Extract intent after colon
        match = re.search(r'contact form submission[:\s]+(\w+)', subject_lower)
        if match:
            intent_from_subject = match.group(1)
    
    # Check body for intent: "Interest: [intent]" or "Topic: [intent]"
    intent_from_body = None
    interest_match = re.search(r'(?:interest|topic)[:\s]+(\w+)', body_lower)
    if interest_match:
        intent_from_body = interest_match.group(1)
    
    # Use detected intent (subject takes priority over body)
    detected_intent = intent_from_subject or intent_from_body
    
    # Map intent to template
    intent_template_map = {
        'pricing': ('TIER_2', 'Intent: pricing inquiry', 'T2_pricing'),
        'demo': ('TIER_1', 'Intent: demo request', 'T2_audit_offer'),
        'ai_automation': ('TIER_1', 'Intent: AI automation interest', 'T1_ai_focus'),
        'amazon_growth': ('TIER_1', 'Intent: Amazon growth interest', 'T1_growth_focus'),
        'support': ('TIER_2', 'Intent: technical support', 'T3_technical'),
        'partnership': ('TIER_3', 'Intent: partnership - escalate to Piper', 'T3_escalate_partnership'),
        'cancellation': ('TIER_3', 'Intent: cancellation/refund - URGENT', 'T3_escalate_cancellation'),
        'general': ('TIER_1', 'Intent: general question', 'T1_general'),
    }
    
    if detected_intent and detected_intent in intent_template_map:
        return intent_template_map[detected_intent]
    
    # ============================================================
    # INTENT DETECTION LAYER 2: Keyword Fallback
    # ============================================================
    
    # If no dropdown detected OR "other" selected, use keyword detection
    if detected_intent == 'other' or not detected_intent:
        
        # Pricing keywords (High confidence)
        pricing_keywords = ['price', 'cost', 'how much', 'pricing', 'fee', 'charge', 'discount', 'cheaper', 'expensive', 'budget', 'payment', 'quote']
        if any(kw in combined for kw in pricing_keywords):
            return ('TIER_2', 'Keyword: pricing detected', 'T2_pricing')
        
        # Demo/audit keywords (High confidence)
        demo_keywords = ['demo', 'trial', 'show me', 'see it work', 'test', 'audit', 'analyze my store', 'review my account', 'look at my']
        if any(kw in combined for kw in demo_keywords):
            return ('TIER_1', 'Keyword: demo/audit detected', 'T2_audit_offer')
        
        # AI automation keywords (High confidence)
        ai_keywords = ['automate', 'bot', 'ai agent', 'telegram', 'build me', 'custom agent']
        if any(kw in combined for kw in ai_keywords):
            return ('TIER_1', 'Keyword: AI automation detected', 'T1_ai_focus')
        
        # Amazon growth keywords (High confidence)
        growth_keywords = ['ppc', 'listings', 'rank', 'growth', 'scale', 'manage my', 'optimize', 'seo']
        if any(kw in combined for kw in growth_keywords):
            return ('TIER_1', 'Keyword: Amazon growth detected', 'T1_growth_focus')
        
        # Technical support keywords (High confidence)
        tech_keywords = ['not working', 'broken', 'error', 'issue', 'problem', 'bug', 'failed', 'technical', 'support', 'help', 'stuck']
        if any(kw in combined for kw in tech_keywords):
            return ('TIER_2', 'Keyword: technical issue detected', 'T3_technical')
        
        # Partnership keywords (High confidence)
        partnership_keywords = ['partner', 'collaborate', 'proposal', 'joint venture', 'work together']
        if any(kw in combined for kw in partnership_keywords):
            return ('TIER_3', 'Keyword: partnership detected - escalate', 'T3_escalate_partnership')
        
        # Scheduling keywords
        scheduling_keywords = ['book a call', 'schedule', 'calendar', 'meeting', 'when are you free']
        if any(kw in combined for kw in scheduling_keywords):
            return ('TIER_1', 'Keyword: scheduling detected', 'T3_calendly')
    
    # ============================================================
    # Default: Generic contact form
    # ============================================================
    if 'contact form submission' in subject_lower:
        return ('TIER_1', 'Contact form - no specific intent detected', 'T2_qualification')
    
    return ('TIER_2', 'General inquiry', 'T2_qualification')


# Test cases
print("=== ECHO INTENT CLASSIFICATION TEST ===\n")

test_cases = [
    # Test 1: Intent from subject (dropdown)
    {
        "name": "Form with dropdown: pricing",
        "subject": "New Contact Form Submission: pricing",
        "body": "Name: Darwin\nEmail: test@test.com\nMessage: I want to know the cost",
        "expected": "T2_pricing"
    },
    {
        "name": "Form with dropdown: demo",
        "subject": "New Contact Form Submission: demo",
        "body": "Name: Darwin\nEmail: test@test.com",
        "expected": "T2_audit_offer"
    },
    {
        "name": "Form with dropdown: ai_automation",
        "subject": "New Contact Form Submission: ai_automation",
        "body": "Name: Darwin\nEmail: test@test.com",
        "expected": "T1_ai_focus"
    },
    # Test 2: Intent from body (Interest:)
    {
        "name": "Body with Interest: pricing",
        "subject": "New Contact Form Submission",
        "body": "Interest: pricing\nName: Darwin\nHow much does it cost?",
        "expected": "T2_pricing"
    },
    # Test 3: Keyword fallback
    {
        "name": "Keyword: 'how much'",
        "subject": "New Contact Form Submission",
        "body": "Name: Darwin\nHow much does this cost?",
        "expected": "T2_pricing"
    },
    {
        "name": "Keyword: 'demo'",
        "subject": "New Contact Form Submission",
        "body": "Name: Darwin\nCan I get a demo of the AI?",
        "expected": "T2_audit_offer"
    },
    {
        "name": "Keyword: 'PPC'",
        "subject": "New Contact Form Submission",
        "body": "Name: Darwin\nI need help with PPC management",
        "expected": "T1_growth_focus"
    },
    {
        "name": "Keyword: 'bot not working'",
        "subject": "New Contact Form Submission",
        "body": "Name: Darwin\nMy bot is not working",
        "expected": "T3_technical"
    },
    # Test 4: No intent detected
    {
        "name": "No intent (generic)",
        "subject": "New Contact Form Submission from Darwin",
        "body": "Name: Darwin\nJust saying hello",
        "expected": "T2_qualification"
    },
]

all_passed = True
for test in test_cases:
    result = classify_email(test["subject"], test["body"], "test@test.com")
    actual_template = result[2]
    passed = actual_template == test["expected"]
    status = "✅" if passed else "❌"
    if not passed:
        all_passed = False
    print(f"{status} {test['name']}")
    print(f"   Expected: {test['expected']}")
    print(f"   Actual:   {actual_template} ({result[1]})")
    print()

if all_passed:
    print("🎉 All tests passed!")
else:
    print("⚠️  Some tests failed. Check classification logic.")
