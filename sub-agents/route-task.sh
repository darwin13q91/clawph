#!/bin/bash
# Task Delegation Router
# Routes tasks to appropriate sub-agent

TASK="$1"
shift
PARAMS="$@"

echo "🎯 Task Router: Analyzing request..."
echo ""

# Keyword-based routing
if echo "$TASK" | grep -qiE "build|deploy|execute|fix|create|install|run|schedule|write.*code|implement"; then
    echo "⚡ Routing to: Shiko (Execution Agent)"
    echo "   Task: $TASK"
    echo "   Reason: Keywords indicate execution/code/system work"
    echo ""
    echo "📋 Shiko's Response:"
    echo "   ✅ Task received. Executing..."
    echo "   📝 Action: $TASK"
    echo "   ⏱️  Estimated: Depends on complexity"
    
elif echo "$TASK" | grep -qiE "analyze|research|compare|investigate|study|check.*data|find.*pattern|generate.*report|track|monitor.*trend"; then
    echo "🔍 Routing to: Aishi (Research & Analysis Agent)"
    echo "   Task: $TASK"
    echo "   Reason: Keywords indicate analysis/research"
    echo ""
    echo "📋 Aishi's Response:"
    echo "   ✅ Analysis requested. Investigating..."
    echo "   🔬 Focus: $TASK"
    echo "   📊 Output: Insights and patterns"
    
elif echo "$TASK" | grep -qiE "design|plan|strategy|brainstorm|optimize|workflow|architecture|vision|concept|innovate|improve.*process"; then
    echo "💡 Routing to: Namie (Creative & Strategy Agent)"
    echo "   Task: $TASK"
    echo "   Reason: Keywords indicate design/strategy"
    echo ""
    echo "📋 Namie's Response:"
    echo "   ✅ Design challenge accepted. Creating..."
    echo "   🎨 Focus: $TASK"
    echo "   💡 Output: Strategy and design"
    
else
    echo "🤔 Task unclear. Routing to: Team collaboration"
    echo "   Task: $TASK"
    echo ""
    echo "📋 Team Response:"
    echo "   Shiko: Can handle technical implementation"
    echo "   Aishi: Can analyze requirements"
    echo "   Namie: Can design the approach"
    echo "   💭 Suggestion: Clarify if this needs execution, analysis, or design"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "🔄 Return path: Sub-agent → Allysa → Darwin"
echo "═══════════════════════════════════════════════════"
