# BULLETPROOF EMAIL PROCESSING LOGIC
# Triple-checked safety mechanisms

def should_process_email(email_data):
    """
    Triple-check safety gate before processing any email.
    Returns (should_process: bool, reason: str)
    """
    subject = email_data.get('subject', '')
    sender = email_data.get('sender_email', '').lower()
    body = email_data.get('body', '')
    
    # CHECK 1: Is this a reply to our own email? (Prevents infinite loops)
    subject_lower = subject.lower()
    reply_indicators = ['re:', 'aw:', 'sv:', 'fwd:', 'fw:']
    
    # Remove common gateway prefixes for clean check
    clean_subject = subject_lower
    for prefix in ['[external]', '[out of office]', '[auto-reply]', '[automated response]']:
        clean_subject = clean_subject.replace(prefix, '').strip()
    
    # Check if starts with any reply indicator
    is_reply = any(clean_subject.startswith(ind) for ind in reply_indicators)
    
    # Check if it's from our own domain AND contains reply threading
    is_own_domain_reply = ('amajungle.com' in sender and 
                           ('new lead:' in subject_lower or 
                            'contact form' in subject_lower))
    
    if is_reply or is_own_domain_reply:
        return False, f"SKIP_REPLY: Email is a reply (subject: {subject[:40]}...)"
    
    # CHECK 2: Is this a contact form / lead submission?
    is_contact_form = ('New Lead:' in subject or 
                       'Contact Form Submission' in subject)
    
    if not is_contact_form and 'amajungle.com' in sender:
        return False, f"SKIP_OWN_DOMAIN: Non-form email from amajungle.com"
    
    # CHECK 3: Has this email been processed recently?
    email_id = email_data.get('id')
    account = email_data.get('account')
    folder = email_data.get('folder')
    
    if email_id and is_email_processed(email_id, account, folder):
        return False, f"SKIP_DUPLICATE: Email already processed"
    
    return True, "PASS_ALL_CHECKS"


def safe_extract_sender_info(email_data):
    """
    Safely extract sender info with validation.
    Returns (sender_email, sender_name) or (None, None) on failure.
    """
    subject = email_data.get('subject', '')
    body = email_data.get('body', '')
    
    # Default from headers
    sender_email = email_data.get('sender_email', '')
    sender_name = email_data.get('sender_name', 'there')
    
    # For contact forms, extract from body
    if 'Contact Form Submission' in subject or 'New Lead:' in subject:
        # Extract Email: field
        email_match = re.search(r'Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', body)
        if email_match:
            extracted_email = email_match.group(1).strip()
            # Validate email format
            if '@' in extracted_email and '.' in extracted_email:
                sender_email = extracted_email
        
        # Extract Name: field
        name_match = re.search(r'(?:Name|From):\s*([^\r\n]+)', body)
        if name_match:
            extracted_name = name_match.group(1).strip()
            # Sanitize - only allow alphanumeric and basic punctuation
            if re.match(r'^[\w\s\-\'\.]+$', extracted_name):
                sender_name = extracted_name
    
    # Final safety: if no valid email, return None
    if not sender_email or '@' not in sender_email:
        return None, None
    
    return sender_email, sender_name


def classify_with_safety(subject, body, sender_email):
    """
    Classify email with multiple fallback mechanisms.
    Returns (tier, reason, template_name)
    """
    subject_lower = subject.lower()
    body_lower = body.lower()
    
    # LAYER 1: Exact subject format matching
    intent = None
    
    # Check for "New Lead: {intent} - ..." format
    lead_match = re.search(r'new lead:\s*(\w+)', subject_lower)
    if lead_match:
        intent = lead_match.group(1)
    
    # Check for old format "Contact Form Submission: {intent}"
    if not intent:
        form_match = re.search(r'contact form submission[:\s]*(\w+)', subject_lower)
        if form_match:
            intent = form_match.group(1)
    
    # Check body for Interest: field
    if not intent:
        interest_match = re.search(r'interest:\s*(\w+)', body_lower)
        if interest_match:
            intent = interest_match.group(1)
    
    # LAYER 2: Intent to template mapping
    intent_map = {
        'pricing': ('TIER_2', 'Intent: pricing inquiry', 'T2_pricing'),
        'demo': ('TIER_1', 'Intent: demo request', 'T2_audit_offer'),
        'ai_automation': ('TIER_1', 'Intent: AI automation interest', 'T1_ai_focus'),
        'amazon_growth': ('TIER_1', 'Intent: Amazon growth interest', 'T1_growth_focus'),
        'website_dev': ('TIER_3', 'Intent: website development', 'T3_escalate_website'),
        'audit': ('TIER_1', 'Intent: free Amazon audit', 'T2_audit_offer'),
        'support': ('TIER_2', 'Intent: technical support', 'T3_technical'),
        'partnership': ('TIER_3', 'Intent: partnership', 'T3_escalate_partnership'),
        'cancellation': ('TIER_3', 'Intent: cancellation', 'T3_escalate_cancellation'),
        'other': ('TIER_2', 'Intent: other/unsure', None),  # Will use keyword fallback
        'general': ('TIER_1', 'Intent: general question', 'T1_general'),
    }
    
    if intent and intent in intent_map:
        return intent_map[intent]
    
    # LAYER 3: Keyword fallback for "other" or no intent
    if intent == 'other' or not intent:
        # Check for technical issues (HIGH PRIORITY)
        tech_keywords = ['not working', 'broken', 'error', 'issue', 'bug', 'failed', 'stuck']
        if any(kw in body_lower for kw in tech_keywords):
            return ('TIER_2', 'Keyword: technical issue', 'T3_technical')
        
        # Check for pricing
        pricing_keywords = ['price', 'cost', 'how much', 'pricing', 'fee', 'budget']
        if any(kw in body_lower for kw in pricing_keywords):
            return ('TIER_2', 'Keyword: pricing', 'T2_pricing')
        
        # Check for demo/audit
        demo_keywords = ['demo', 'audit', 'show me', 'test', 'trial']
        if any(kw in body_lower for kw in demo_keywords):
            return ('TIER_1', 'Keyword: demo/audit', 'T2_audit_offer')
        
        # Check for AI
        ai_keywords = ['automate', 'bot', 'ai agent', 'telegram']
        if any(kw in body_lower for kw in ai_keywords):
            return ('TIER_1', 'Keyword: AI automation', 'T1_ai_focus')
    
    # DEFAULT: Generic response
    return ('TIER_2', 'General inquiry', 'T2_qualification')


def draft_safe_reply(sender_email, sender_name, subject, body, template_name):
    """
    Draft reply with input sanitization and safety checks.
    """
    # Sanitize inputs
    first_name = 'there'
    if sender_name and len(sender_name) < 100:
        # Extract first name, only allow safe characters
        clean_name = re.sub(r'[^\w\s\-\']', '', sender_name.split()[0])
        if clean_name:
            first_name = clean_name
    
    # Extract message content safely
    message_content = None
    if body and len(body) < 10000:  # Limit body size
        msg_match = re.search(r'[Mm]essage:\s*(.+?)(?:\n\n|---|\Z)', body, re.DOTALL)
        if msg_match:
            msg_text = msg_match.group(1).strip()
            if 10 < len(msg_text) < 300:  # Reasonable length
                # Sanitize - remove any HTML/script tags
                message_content = re.sub(r'<[^>]+>', '', msg_text)
    
    # Get template
    templates = {
        'T1_general': f"""Hey {first_name},

Thanks for reaching out!

Amajungle builds custom AI agents for Amazon sellers — they handle the repetitive stuff (PPC monitoring, inventory alerts, reports, pricing) so you get 10+ hours back per week.

The quickest way to see if it fits: a free 30-minute audit.

Book here: https://calendly.com/ops-amajungle/30min""",
        
        'T2_pricing': f"""Hey {first_name},

Two options:

AI Automation — $997 one-time
Custom AI agent, 5 automations, Telegram control, 48-hour setup, 30-day guarantee.

Amazon Growth — $999/mo  
Full management: listings, PPC, weekly reports, strategy calls. First month 50% off.

Which sounds closer to what you need?""",
        
        'T1_ai_focus': f"""Hey {first_name},

Perfect! Amajungle builds AI agents that run 24/7 on your own hardware — no monthly fees, you own the system.

What the AI handles:
• PPC monitoring and bid adjustments
• Inventory alerts and reorder triggers  
• Review monitoring and response drafting
• Pricing adjustments and competitor tracking
• Weekly performance reports

Setup: 48 hours
Investment: $997 one-time (includes 30-day guarantee)

Want to see how this works for your store? Book an audit:
https://calendly.com/ops-amajungle/30min""",
        
        'T1_growth_focus': f"""Hey {first_name},

Amajungle's Amazon Growth service handles the heavy lifting:

• Listing optimization (titles, bullets, A+ content)
• PPC campaign management and bid optimization
• Keyword research and rank tracking
• Weekly performance reports and strategy calls
• Monthly strategy reviews

Investment: $999/mo (first month 50% off — $499)

Want to see if we're a fit? Book a discovery call:
https://calendly.com/ops-amajungle/30min""",
        
        'T2_audit_offer': f"""Hey {first_name},

The best way to see if this fits: a free 30-minute audit where I look at your store and show you exactly what we'd automate.

During the call, I'll:
• Review your current listings and PPC
• Identify your biggest time-wasters
• Show you what an AI agent would handle

Book here: https://calendly.com/ops-amajungle/30min

Or reply with 2-3 times that work for you.""",
        
        'T2_qualification': f"""Hey {first_name},

To point you in the right direction, can you tell me:

1. Are you selling on Amazon already, or just getting started?
2. What's your biggest headache right now — PPC, inventory, reviews, or something else?
3. Are you looking for DIY tools or done-for-you service?

Once I know that, I can recommend the right solution.""",
        
        'T3_technical': f"""Hey {first_name},

Sorry about that — let's fix it quick.

Try these first:
1. Send /start to the bot in Telegram
2. Check your internet connection
3. Restart the agent on your machine

If it's still not working, let me know and I'll dig into the logs.""",
        
        'T3_escalate_website': f"""Hey {first_name},

Thanks for your interest in website development!

I'm connecting you with Atlas, our lead developer, who will reach out within 24 hours.

To prepare, he'll want to know:
• Do you have an existing website?
• What's the primary goal? (leads, sales, portfolio)
• Any design references you like?

Feel free to reply here with those details.""",
        
        'T3_escalate_partnership': f"""Hey {first_name},

Thanks for reaching out about partnership opportunities!

This requires a conversation with Allysa Kate, our partnerships lead. She'll reach out within 24 hours.

If you have specific details to share (what you're proposing, timeline, etc.), feel free to reply here.""",
        
        'T3_escalate_cancellation': f"""Hey {first_name},

Got your message. I'm sorry to hear things aren't working as expected.

I'm looping in Allysa Kate directly — she'll reach out within a few hours to understand what's going on and see if there's something we can fix before you make a final call.""",
    }
    
    reply = templates.get(template_name, templates['T1_general'])
    
    # Add message reference if present
    if message_content:
        reply += f"""

P.S. You mentioned: \"{message_content[:200]}\" — I'll make sure that's addressed."""
    
    return reply
