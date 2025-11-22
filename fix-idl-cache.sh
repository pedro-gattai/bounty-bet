#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  DICE GAME IDL & CACHE FIX SCRIPT${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Correct program ID
CORRECT_PROGRAM_ID="42kX7N73TVX16fufFaEaN2nfev4zDTa5TbvdAqXYKPd3"

echo -e "${YELLOW}Step 1: Generating fresh IDL...${NC}"
mkdir -p target/idl
anchor idl build -o target/idl/dice_game.json

echo -e "${YELLOW}Step 2: Copying IDL to client...${NC}"
cp target/idl/dice_game.json client/src/idl/dice_game.json

# Verify the copy
NEW_PROGRAM_ID=$(grep -o '"address": "[^"]*"' client/src/idl/dice_game.json | head -1 | cut -d'"' -f4)
if [ "$NEW_PROGRAM_ID" = "$CORRECT_PROGRAM_ID" ]; then
    echo -e "${GREEN}✓ Client IDL updated with correct program ID${NC}"
else
    echo -e "${RED}ERROR: IDL has wrong program ID${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 3: Clearing caches...${NC}"
rm -rf client/node_modules/.vite client/dist
echo -e "${GREEN}✓ Caches cleared${NC}"

echo -e "${YELLOW}Step 4: Killing existing dev servers...${NC}"
pkill -f "vite" || true
echo -e "${GREEN}✓ Dev servers killed${NC}"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  FIX COMPLETE!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Start dev server: ${YELLOW}cd client && npx vite${NC}"
echo -e "2. Open browser: ${YELLOW}http://localhost:5173${NC}"
echo -e "3. Clear browser cache: ${YELLOW}Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)${NC}"
echo ""
echo -e "${GREEN}Program ID: $CORRECT_PROGRAM_ID${NC}"