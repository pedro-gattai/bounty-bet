#!/bin/bash

# fix-versions.sh - Script para compatibilizar versões do Anchor entre programa e cliente
# Criado para resolver o erro "Assertion failed" no BN2._initArray

set -e  # Para o script se houver erro

echo "============================================"
echo "🔧 Fix Versions Script - Compatibilizando Anchor"
echo "============================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Versões alvo (compatíveis e testadas)
TARGET_ANCHOR_VERSION="0.31.1"
TARGET_ANCHOR_LANG_VERSION="0.31.0"

echo -e "${YELLOW}📌 Versões alvo:${NC}"
echo "   Cliente (npm): @coral-xyz/anchor@$TARGET_ANCHOR_VERSION"
echo "   Programa (cargo): anchor-lang@$TARGET_ANCHOR_LANG_VERSION"
echo ""

# 1. Atualizar package.json do cliente
echo -e "${GREEN}1. Atualizando cliente React...${NC}"
cd client

# Backup do package.json
cp package.json package.json.backup

# Atualizar versão do Anchor no package.json
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"@coral-xyz\/anchor\": \"^[0-9.]*\"/\"@coral-xyz\/anchor\": \"^$TARGET_ANCHOR_VERSION\"/" package.json
else
    # Linux
    sed -i "s/\"@coral-xyz\/anchor\": \"^[0-9.]*\"/\"@coral-xyz\/anchor\": \"^$TARGET_ANCHOR_VERSION\"/" package.json
fi

echo "   ✅ package.json atualizado"

# 2. Limpar cache e reinstalar dependências
echo -e "${GREEN}2. Limpando cache e reinstalando dependências...${NC}"
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

echo "   ✅ Dependências do cliente atualizadas"

# 3. Voltar para raiz e atualizar programa Solana
cd ..
echo ""
echo -e "${GREEN}3. Atualizando programa Solana...${NC}"

# Atualizar Cargo.toml do programa principal
CARGO_FILE="programs/dice_game/Cargo.toml"
if [ -f "$CARGO_FILE" ]; then
    # Backup
    cp "$CARGO_FILE" "$CARGO_FILE.backup"

    # Atualizar anchor-lang
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/anchor-lang = \"[0-9.]*\"/anchor-lang = \"$TARGET_ANCHOR_LANG_VERSION\"/" "$CARGO_FILE"
        sed -i '' "s/anchor-spl = \"[0-9.]*\"/anchor-spl = \"$TARGET_ANCHOR_LANG_VERSION\"/" "$CARGO_FILE"
    else
        # Linux
        sed -i "s/anchor-lang = \"[0-9.]*\"/anchor-lang = \"$TARGET_ANCHOR_LANG_VERSION\"/" "$CARGO_FILE"
        sed -i "s/anchor-spl = \"[0-9.]*\"/anchor-spl = \"$TARGET_ANCHOR_LANG_VERSION\"/" "$CARGO_FILE"
    fi

    echo "   ✅ Cargo.toml do programa atualizado"
else
    echo -e "${RED}   ❌ Cargo.toml não encontrado em $CARGO_FILE${NC}"
fi

# 4. Atualizar Cargo.toml raiz se existir
ROOT_CARGO="Cargo.toml"
if [ -f "$ROOT_CARGO" ]; then
    cp "$ROOT_CARGO" "$ROOT_CARGO.backup"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/anchor-lang = \"[0-9.]*\"/anchor-lang = \"$TARGET_ANCHOR_LANG_VERSION\"/" "$ROOT_CARGO"
        sed -i '' "s/anchor-spl = \"[0-9.]*\"/anchor-spl = \"$TARGET_ANCHOR_LANG_VERSION\"/" "$ROOT_CARGO"
    else
        sed -i "s/anchor-lang = \"[0-9.]*\"/anchor-lang = \"$TARGET_ANCHOR_LANG_VERSION\"/" "$ROOT_CARGO"
        sed -i "s/anchor-spl = \"[0-9.]*\"/anchor-spl = \"$TARGET_ANCHOR_LANG_VERSION\"/" "$ROOT_CARGO"
    fi

    echo "   ✅ Cargo.toml raiz atualizado"
fi

# 5. Atualizar dependências Rust
echo ""
echo -e "${GREEN}4. Atualizando dependências Rust...${NC}"
cargo update
echo "   ✅ Dependências Rust atualizadas"

# 6. Rebuild do programa (se anchor estiver instalado)
echo ""
echo -e "${GREEN}5. Tentando rebuild do programa...${NC}"
if command -v anchor &> /dev/null; then
    anchor build
    echo "   ✅ Programa compilado com sucesso"

    # Copiar IDL atualizado
    if [ -f "target/idl/dice_game.json" ]; then
        cp target/idl/dice_game.json client/src/idl/dice_game.json
        echo "   ✅ IDL copiado para o cliente"
    fi
else
    echo -e "${YELLOW}   ⚠️  Anchor CLI não encontrado. Pule esta etapa ou instale com: cargo install --git https://github.com/coral-xyz/anchor avm --locked${NC}"
fi

# 7. Verificar versões instaladas
echo ""
echo -e "${GREEN}6. Verificando versões instaladas...${NC}"
echo ""
echo "Cliente (package.json):"
grep "@coral-xyz/anchor" client/package.json | head -1

echo ""
echo "Programa (Cargo.toml):"
if [ -f "$CARGO_FILE" ]; then
    grep "anchor-lang" "$CARGO_FILE" | head -1
fi

# 8. Instruções finais
echo ""
echo "============================================"
echo -e "${GREEN}✅ Script concluído!${NC}"
echo "============================================"
echo ""
echo "Próximos passos:"
echo "1. cd client && npm run dev"
echo "2. Abra http://localhost:3000"
echo "3. Conecte sua carteira"
echo "4. Verifique o console para erros"
echo ""
echo -e "${YELLOW}Nota: Se ainda houver erros, verifique:${NC}"
echo "- Se o endereço do programa no IDL está correto"
echo "- Se o cluster (devnet/mainnet) está configurado corretamente"
echo "- Se a carteira está na rede correta"
echo ""
echo "Backups criados:"
echo "- client/package.json.backup"
if [ -f "$CARGO_FILE.backup" ]; then
    echo "- $CARGO_FILE.backup"
fi
if [ -f "$ROOT_CARGO.backup" ]; then
    echo "- $ROOT_CARGO.backup"
fi