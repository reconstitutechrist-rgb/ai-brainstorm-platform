#!/bin/bash

# Simple NLP Enhancement Test using curl
# Tests the enhanced natural language understanding

API_BASE="http://localhost:3001/api"
USER_ID="3ab4df68-94af-4e34-9269-fb7aada73589"

echo "================================================================================================"
echo "ENHANCED NATURAL LANGUAGE UNDERSTANDING - MANUAL TEST"
echo "================================================================================================"
echo ""

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}Creating test session...${NC}"
SESSION_RESPONSE=$(curl -s -X POST "${API_BASE}/sessions" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"${USER_ID}\",\"projectName\":\"NLP Enhancement Test\"}")

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Session created: ${SESSION_ID}${NC}"
echo ""

# Test function
test_message() {
  local CATEGORY=$1
  local MESSAGE=$2
  local EXPECTED_INTENT=$3

  echo -e "${YELLOW}Testing:${NC} ${CATEGORY}"
  echo -e "  Message: \"${MESSAGE}\""
  echo -e "  Expected Intent: ${EXPECTED_INTENT}"

  RESPONSE=$(curl -s -X POST "${API_BASE}/chat" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"${USER_ID}\",\"sessionId\":\"${SESSION_ID}\",\"message\":\"${MESSAGE}\"}")

  echo -e "  ${CYAN}Response received${NC}"
  echo ""
}

echo -e "${BOLD}${CYAN}TESTING PARKING SIGNALS${NC}"
echo "------------------------------------------------------------------------------------------------"
test_message "PARKING - Park Keyword" "Let's park that for later" "parking"
test_message "PARKING - Revisit" "I'll think about it later" "parking"
test_message "PARKING - Delay" "Hold off on that for now" "parking"
test_message "PARKING - Deprioritize" "Table that idea" "parking"

echo ""
echo -e "${BOLD}${CYAN}TESTING DECIDED SIGNALS${NC}"
echo "------------------------------------------------------------------------------------------------"
test_message "DECIDED - Commitment" "Let's do it" "deciding"
test_message "DECIDED - Affirmation" "That works for me" "deciding"
test_message "DECIDED - Approval" "I'm sold on that approach" "deciding"
test_message "DECIDED - Finalization" "Lock it in" "deciding"

echo ""
echo -e "${BOLD}${CYAN}TESTING EXPLORING SIGNALS${NC}"
echo "------------------------------------------------------------------------------------------------"
test_message "EXPLORING - Curiosity" "I'm curious about using GraphQL" "exploring"
test_message "EXPLORING - Question" "What about adding a mobile app?" "exploring"

echo ""
echo -e "${BOLD}${CYAN}TESTING HEDGING LANGUAGE${NC}"
echo "------------------------------------------------------------------------------------------------"
test_message "HEDGING - Low Certainty" "I think maybe we should use React" "exploring"
test_message "HEDGING - High Certainty" "Definitely want to use TypeScript" "deciding"

echo ""
echo "================================================================================================"
echo -e "${GREEN}${BOLD}Test completed!${NC}"
echo "================================================================================================"
echo ""
echo -e "${CYAN}To verify results:${NC}"
echo "  1. Check the console output above for API responses"
echo "  2. Open the Main Chat Page in your browser"
echo "  3. Look at the Canvas to see if items are categorized correctly"
echo "  4. Check the Session Tracking panel for the test session"
echo ""
