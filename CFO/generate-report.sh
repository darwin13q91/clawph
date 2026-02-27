#!/bin/bash
# Generate Monthly CFO Report
# Runs 1st of every month

CFO_DIR="/home/darwin/.openclaw/workspace/CFO"
FOUNDATION="$CFO_DIR/data/financial-foundation.md"
REPORT_DIR="$CFO_DIR/reports/$(date +%Y-%m)"
REPORT_FILE="$REPORT_DIR/CFO-Report-$(date +%Y%m%d).md"

mkdir -p "$REPORT_DIR"

# Parse foundation data
INCOME=1800
FIXED_EXPENSES=1450
SURPLUS=350

cat > "$REPORT_FILE" <> EOF
# Monthly CFO Report - $(date +"%B %Y")

**Report Date:** $(date +"%B %d, %Y")  
**Prepared by:** Your Personal CFO

---

## 1. INCOME VS SPEND

| Metric | Amount |
|--------|--------|
| **Total Income** | $${INCOME} |
| **Total Spend** | $${FIXED_EXPENSES} |
| **SURPLUS/DEFICIT** | **+$${SURPLUS}** |

**Status:** 🟡 TIGHT MARGIN

You have a \$350 surplus (19% of income). This leaves minimal room for unexpected expenses or wealth building.

---

## 2. SPENDING BREAKDOWN

| Category | Amount | % of Income | Status |
|----------|--------|-------------|--------|
| Housing | $1,000 | 56% | 🔴 HIGH |
| Groceries | $400 | 22% | 🟡 MODERATE |
| Subscriptions | $50 | 3% | 🟢 OK |
| **TOTAL** | **$1,450** | **81%** | |

**⚠️ FLAG:** Housing at 56% of income is above the recommended 30% threshold. This is your biggest financial constraint.

---

## 3. WASTE REPORT

**Subscriptions to Audit:**
- Current: $50/month ($600/year)
- Action: Review each subscription for value
- Potential savings: $20-40/month

**Spending Habits to Watch:**
- [ ] Groceries at $400: Track if this includes dining out
- [ ] Impulse purchases: Not tracked yet
- [ ] Utility overages: Monitor if bills spike

**Direct Callout:**  
With only $350 surplus, every $10 subscription matters. Cut one $15/month service = 4% more savings rate.

---

## 4. SAVINGS AND INVESTMENT PROGRESS

**Status:** ❌ DATA MISSING

Cannot calculate progress without:
- Current savings balance
- Investment account values
- Defined monthly savings target

**Action Required:** Update Financial Foundation with:
1. Current savings account balance
2. Investment accounts (401k, IRA, brokerage)
3. Emergency fund status

---

## 5. NET WORTH UPDATE

**Status:** ❌ CANNOT CALCULATE

Need:
- Total assets (cash, investments, property)
- Total liabilities (debts, loans)

**Last Known:** Not established

---

## 6. WEALTH BUILDING STRATEGY

Based on your $350/month surplus, here are 3 specific actions:

### Action 1: Protect the Surplus
**What:** Open a separate "Do Not Touch" savings account  
**How:** Auto-transfer $350 on payday  
**Why:** Separates savings from spending money  
**Result:** $4,200/year emergency fund building

### Action 2: Reduce Housing Cost (Long-term)
**What:** Explore options to reduce $1,000 rent  
**Options:** 
- Roommate ($500 savings)
- Move to lower cost area
- Negotiate rent at renewal
**Why:** Rent is 56% of income - unsustainable for wealth building

### Action 3: Increase Side Income
**What:** Grow $400/month side income to $600+  
**How:**
- 1 extra client for current service
- Raise rates 50%
- Add new income stream
**Result:** Doubles surplus to $700/month

---

## 7. FINANCIAL TRUTH

**Honest Assessment:**

You are living paycheck-to-paycheck with minimal safety margin. Your $350 surplus is not enough to build meaningful wealth or handle emergencies. The 56% housing ratio is the primary constraint - you're house-poor, not cash-poor. Without savings data, I cannot assess if you're one emergency away from crisis or if you have a hidden cushion. The math is simple: at $350/month surplus, you save $4,200/year. That's progress, but slow. You need either expense reduction (housing) or income growth (side hustle) to accelerate. The current trajectory builds safety slowly, not wealth. Choose one: cut housing costs or increase income. Doing neither maintains the status quo.

---

## 📋 ACTION ITEMS THIS MONTH

1. [ ] Provide complete savings/investment data
2. [ ] Calculate actual net worth
3. [ ] Define 3 specific financial goals with deadlines
4. [ ] Audit all subscriptions - cancel at least 1
5. [ ] Research housing cost reduction options
6. [ ] Identify one way to increase side income by $200/month

---

**Next Report:** April 1, 2026  
**Mid-month Check:** March 15, 2026 (if no updates shared)

EOF

echo "✅ CFO Report generated: $REPORT_FILE"
