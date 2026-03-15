# Frontend Debugging Skill
# Location: agents/skills/atlas/frontend-debug/SKILL.md

*Systematic approach to diagnosing and fixing broken web interfaces.*

## When This Skill Activates
- Frontend not rendering correctly
- JavaScript not executing as expected
- CSS/layout issues
- Data exists but doesn't display

## Debug Process

### Step 1: Verify Data Flow
```javascript
// Check if API returns data
fetch('/api/endpoint').then(r => r.json()).then(d => console.log('API:', d))

// Check if data reaches component
console.log('Component data:', this.data)
```

### Step 2: Check DOM State
```javascript
// Verify elements exist
console.log('Element:', document.getElementById('id'))

// Check computed styles
console.log('Styles:', getComputedStyle(element))

// Check visibility
console.log('Display:', element.style.display)
console.log('Visibility:', element.style.visibility)
```

### Step 3: Test Rendering
```javascript
// Try manual injection
element.innerHTML = '<div>TEST</div>'

// If that works, the issue is in the render function
// If not, the issue is CSS or structure
```

### Step 4: Isolate CSS Issues
```css
/* Test visibility */
.test-visible {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
```

### Step 5: Simplify and Rebuild
If patches aren't working:
1. Strip down to minimal working version
2. Add features back one by one
3. Test at each step

## Common Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Data in console, not on page | Display: none | Override with !important |
| Elements exist but invisible | CSS hiding them | Check parent overflow, height |
| JavaScript runs but no output | innerHTML failing | Use createElement instead |
| Intermittent rendering | Race condition | Add setTimeout or use DOMContentLoaded |

## Nuclear Option
When incremental fixes fail:
- Archive broken file
- Rebuild from scratch with minimal working version
- Copy working patterns from other parts of codebase
