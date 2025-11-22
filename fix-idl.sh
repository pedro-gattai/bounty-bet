#!/bin/bash

# fix-idl.sh - Script para corrigir problemas comuns no IDL
# Especialmente incompatibilidades de case-sensitive entre Anchor versions

set -e

echo "============================================"
echo "🔧 Fix IDL Script - Corrigindo IDL para Anchor 0.31+"
echo "============================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

IDL_PATH="client/src/idl/dice_game.json"

if [ ! -f "$IDL_PATH" ]; then
    echo -e "${RED}❌ Arquivo IDL não encontrado: $IDL_PATH${NC}"
    exit 1
fi

# Backup do IDL
BACKUP_NAME="${IDL_PATH}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$IDL_PATH" "$BACKUP_NAME"
echo -e "${GREEN}✅ Backup criado: $BACKUP_NAME${NC}"
echo ""

# Função para verificar e corrigir case-sensitive issues
fix_account_naming() {
    echo -e "${BLUE}🔍 Verificando nomenclatura de contas...${NC}"

    # Buscar todas as contas definidas em PascalCase
    if grep -q '"name": "GameAccount"' "$IDL_PATH"; then
        echo "  Encontrado: GameAccount (PascalCase)"

        # Verificar se instruções usam camelCase
        if grep -q '"name": "gameAccount"' "$IDL_PATH"; then
            echo "  Instruções usam: gameAccount (camelCase)"
            echo -e "${YELLOW}  ⚠️  Incompatibilidade detectada!${NC}"

            # Corrigir para camelCase (padrão mais comum)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' 's/"name": "GameAccount"/"name": "gameAccount"/' "$IDL_PATH"
            else
                # Linux
                sed -i 's/"name": "GameAccount"/"name": "gameAccount"/' "$IDL_PATH"
            fi

            echo -e "${GREEN}  ✅ Corrigido: GameAccount → gameAccount${NC}"
        fi
    fi
}

# Função para verificar campos obrigatórios do Anchor 0.31+
check_required_fields() {
    echo -e "${BLUE}🔍 Verificando campos obrigatórios...${NC}"

    # Verificar campo 'address'
    if grep -q '"address":' "$IDL_PATH"; then
        echo -e "${GREEN}  ✅ Campo 'address' presente${NC}"
    else
        echo -e "${RED}  ❌ Campo 'address' ausente${NC}"
    fi

    # Verificar campo 'metadata'
    if grep -q '"metadata":' "$IDL_PATH"; then
        echo -e "${GREEN}  ✅ Campo 'metadata' presente${NC}"
    else
        echo -e "${RED}  ❌ Campo 'metadata' ausente${NC}"
    fi

    # Verificar campo 'version'
    if grep -q '"version":' "$IDL_PATH"; then
        echo -e "${GREEN}  ✅ Campo 'version' presente${NC}"
    else
        echo -e "${RED}  ❌ Campo 'version' ausente${NC}"
    fi
}

# Função para validar estrutura JSON
validate_json() {
    echo -e "${BLUE}🔍 Validando estrutura JSON...${NC}"

    if python3 -m json.tool "$IDL_PATH" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ JSON válido${NC}"
    else
        echo -e "${RED}  ❌ JSON inválido!${NC}"
        echo "  Por favor, verifique manualmente o arquivo"
        exit 1
    fi
}

# Executar correções
echo -e "${GREEN}1. Corrigindo nomenclatura de contas...${NC}"
fix_account_naming
echo ""

echo -e "${GREEN}2. Verificando campos obrigatórios...${NC}"
check_required_fields
echo ""

echo -e "${GREEN}3. Validando JSON...${NC}"
validate_json
echo ""

# Mostrar diferenças se houver
if ! diff -q "$IDL_PATH" "$BACKUP_NAME" > /dev/null 2>&1; then
    echo -e "${YELLOW}📝 Mudanças aplicadas:${NC}"
    diff --unified=2 "$BACKUP_NAME" "$IDL_PATH" | head -20 || true
else
    echo -e "${BLUE}ℹ️  Nenhuma mudança necessária${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}✅ Verificação do IDL concluída!${NC}"
echo "============================================"
echo ""
echo "Próximos passos:"
echo "1. Reinicie o servidor de desenvolvimento"
echo "2. Teste a conexão da carteira"
echo "3. Verifique o console para erros"
echo ""
echo -e "${YELLOW}Backup salvo em: $BACKUP_NAME${NC}"