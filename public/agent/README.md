# Agente Rafaelo - Estrutura de Arquivos

## 📁 Organização Modular

```
public/
├── agent/
│   └── README.md           # Este arquivo
├── agente.js              # Lógica principal do agente (INCLUI SYSTEM PROMPT)
├── rafaelo-avatar.png     # Avatar do Rafaelo
├── index.html             # Modal e botão de acesso
└── style.css              # Estilos do agente
```

## 🎯 Componentes

### 1. **agente.js** (Lógica Principal)
- **Configuração**: API Perplexity, limites de histórico
- **System Prompt**: Prompt do sistema está na função `consultPerplexityAI()` (linha ~221)
- **Estado**: Gerenciamento de conversação e processamento
- **Funções**:
  - `openAgentModal()` / `closeAgentModal()` - Controle do modal
  - `addAgentMessage()` - Renderização de mensagens
  - `consultPerplexityAI()` - Integração com API + System Prompt
  - `sendAgentMessage()` - Handler principal de envio
  - `addToHistory()` / `getContextForAI()` - Gerenciamento de histórico

### 2. **index.html** (Interface)
- **Botão de Acesso**: Welcome card com avatar do Rafaelo
- **Modal Structure**:
  - Header com avatar e identificação
  - Quick actions (5 perguntas rápidas)
  - Chat container (mensagens)
  - Typing indicator
  - Input area com botão de envio

### 3. **style.css** (Estilos)
- Mensagens (user e bot)
- Quick action buttons
- Typing indicator com animações
- Responsividade mobile

### 4. **agent/prompt.md** (Documentação)
- Identidade e personalidade do Rafaelo
- Prompt completo do sistema
- Diretrizes de comunicação
- Exemplos de boas respostas
- Limitações e melhorias futuras

## 🔑 Características Principais

### Identidade
- **Nome**: Rafaelo
- **Função**: Consultor Financeiro IA
- **Especialização**: Investimentos brasileiros

### Capacidades
- ✅ Explica CDI, CDB, Tesouro Direto, FIIs, Ações, Cripto
- ✅ Responde em linguagem simples e objetiva
- ✅ Mantém histórico de conversa (10 mensagens)
- ✅ Usa contexto das últimas 4 mensagens
- ✅ Respostas em 5-8 linhas

### Limitações Técnicas
- Timeout: 30 segundos
- Modelo: Perplexity Sonar
- Contexto: 4 mensagens
- Histórico máximo: 10 mensagens (sessionStorage)

## 🎨 Personalização do Avatar

O avatar do Rafaelo está em: `public/rafaelo-avatar.png`

**Uso**:
- Botão de acesso: 20x20px circular
- Header do modal: 48x48px circular
- Welcome message: 80x80px circular

**Estilo**:
- Border circular
- Box-shadow com accent-primary
- Object-fit: cover

## 🚀 Quick Actions

1. 🎯 **Como começar?** - Orientação para iniciantes
2. 🛡️ **Segurança** - Proteção e evitar golpes
3. 💰 **O que é CDI?** - Explicação sobre CDI
4. 🏢 **FIIs vs Ações** - Comparação entre ativos
5. 📊 **Diversificação** - Estratégias de carteira

## 📝 Fluxo de Conversa

```
1. Usuário clica em "Fale com o Rafaelo"
2. Modal abre com mensagem de boas-vindas
3. Usuário seleciona quick action ou digita pergunta
4. Mensagem é adicionada ao chat (tipo: user)
5. Typing indicator aparece
6. Consulta à API Perplexity com contexto
7. Resposta é adicionada ao chat (tipo: bot)
8. Histórico é salvo no sessionStorage
9. Scroll automático para última mensagem
```

## 🔧 Manutenção

### Atualizar Prompt
Edite `agent/prompt.md` e aplique mudanças em `agente.js` na função `consultPerplexityAI()`.

### Adicionar Quick Actions
Edite `index.html` na seção `.agent-quick-actions`:
```html
<button class="agent-quick-btn" onclick="sendAgentQuickMessage('Sua pergunta')">
    🎯 Título
</button>
```

### Ajustar Limites
Edite `AGENT_CONFIG` em `agente.js`:
```javascript
maxHistory: 10,        // Total de mensagens armazenadas
contextWindow: 4,      // Mensagens enviadas para IA
maxContentLength: 600  // Caracteres máximos por mensagem
```

## 📊 Métricas de Uso

O agente usa `sessionStorage` para:
- ✅ Persistir histórico por aba do navegador
- ✅ Limpar ao fechar a aba
- ✅ Isolar conversas entre abas diferentes

**Chave de armazenamento**: `rafaInvest_agent_history`

## 🎯 Melhorias Futuras

- [ ] Adicionar indicador de status online/offline
- [ ] Implementar retry automático em caso de timeout
- [ ] Adicionar botão para limpar histórico
- [ ] Exportar conversa em PDF
- [ ] Modo tutorial guiado
- [ ] Calculadora de investimentos integrada
- [ ] Sugestões de perguntas relacionadas
- [ ] Feedback de satisfação do usuário
