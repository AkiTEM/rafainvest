/* ===============================================
   rafaInvest - Agente Consultor Financeiro IA
   Perplexity AI Integration with Conversation Memory
   =============================================== */

// ==================== CONFIGURAÇÕES ====================
// API_BASE é definido em app.js (compartilhado)

const AGENT_CONFIG = {
    maxHistory: 10,        // Máximo de mensagens no histórico
    contextWindow: 4,      // Mensagens enviadas para IA
    maxContentLength: 600  // Máximo de caracteres por mensagem
};

// ==================== ESTADO ====================
let conversationHistory = [];
let isAgentProcessing = false;

// ==================== FUNÇÕES DE MODAL ====================
function openAgentModal() {
    const modal = document.getElementById('agentModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Adiciona mensagem de boas-vindas se o chat estiver vazio
        const chatContainer = document.getElementById('agentChatContainer');
        if (chatContainer && chatContainer.children.length === 0) {
            addAgentWelcomeMessage();
        }
    }
}

function closeAgentModal() {
    const modal = document.getElementById('agentModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ==================== MENSAGENS ====================
function addAgentWelcomeMessage() {
    const welcomeMessage = `
        <div class="agent-welcome" style="text-align: center; padding: 0.75rem 1rem 1.5rem;">
            <div style="width: 80px; height: 80px; margin: 0 auto 1rem;">
                <img src="rafaelo-avatar.png" alt="Rafaelo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3); border: 3px solid var(--accent-primary);">
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-dark); margin-bottom: 0.75rem;">
                Olá! Sou o Rafaelo 👋
            </h3>
            <p style="font-size: 0.9375rem; color: var(--text-light); line-height: 1.6; max-width: 500px; margin: 0 auto 0.75rem;">
                Seu <strong style="color: var(--accent-primary);">consultor financeiro inteligente</strong> especializado em investimentos brasileiros. Uso IA para responder suas dúvidas de forma simples, objetiva e personalizada!
            </p>
            <p style="font-size: 0.875rem; color: var(--text-muted); line-height: 1.5; max-width: 500px; margin: 0 auto;">
                📊 Posso te ajudar com: <strong>CDI, CDB, FIIs, Tesouro Direto, Ações, Criptomoedas, Perfil de Investidor, IR</strong> e muito mais!
            </p>
            <div style="margin-top: 1.5rem; padding: 1rem 1.25rem; background: rgba(99, 102, 241, 0.06); border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.15);">
                <p style="font-size: 0.875rem; color: var(--text-dark); margin: 0; line-height: 1.5;">
                    💡 <strong style="color: var(--accent-primary);">Dica:</strong> Clique nos botões acima com perguntas prontas ou digite sua própria dúvida abaixo!
                </p>
            </div>
        </div>
    `;
    
    const chatContainer = document.getElementById('agentChatContainer');
    if (chatContainer) {
        chatContainer.innerHTML = welcomeMessage;
    }
}

function addAgentMessage(content, type = 'bot') {
    const chatContainer = document.getElementById('agentChatContainer');
    if (!chatContainer) return;
    
    // Remove welcome message se existir
    if (chatContainer.children.length === 1 && chatContainer.innerHTML.includes('Rafaelo')) {
        chatContainer.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `agent-message agent-message-${type}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'agent-message-content';
    
    // Formata a mensagem se for do bot
    if (type === 'bot') {
        content = formatBotMessage(content);
    }
    
    contentDiv.innerHTML = content;
    
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);
    
    // Scroll para o fim
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatBotMessage(text) {
    // Converte quebras de linha duplas em parágrafos
    text = text.replace(/\n\n/g, '</p><p style="margin: 0.75rem 0;">');
    
    // Converte quebras de linha simples em <br>
    text = text.replace(/\n/g, '<br>');
    
    // Detecta listas (linhas começando com -, *, ou números)
    text = text.replace(/^([-•*]|\d+\.)\s(.+?)$/gm, '<li style="margin-left: 1.25rem;">$2</li>');
    
    // Envolve listas consecutivas em <ul>
    text = text.replace(/(<li[^>]*>.*?<\/li>)+/gs, '<ul style="margin: 0.5rem 0; padding-left: 0.5rem;">$&</ul>');
    
    // Destaca palavras importantes entre **texto**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--accent-primary); font-weight: 600;">$1</strong>');
    
    // Destaca termos financeiros importantes (CDI, CDB, etc)
    text = text.replace(/\b(CDI|CDB|LCI|LCA|FII|FIIs|Tesouro Direto|IPCA|Selic|Bitcoin|Ethereum)\b/g, '<strong style="color: var(--accent-primary);">$1</strong>');
    
    // Formata valores monetários (R$ X.XXX,XX)
    text = text.replace(/(R\$\s?[\d.,]+)/g, '<span style="font-weight: 600; color: var(--success);">$1</span>');
    
    // Formata percentuais
    text = text.replace(/(\d+[,.]?\d*%)/g, '<span style="font-weight: 600; color: var(--accent-secondary);">$1</span>');
    
    // Envolve em parágrafo se não tiver tags de bloco
    if (!text.includes('<p') && !text.includes('<ul') && !text.includes('<li')) {
        text = `<p style="margin: 0;">${text}</p>`;
    }
    
    return text;
}

function showAgentTyping() {
    const indicator = document.getElementById('agentTypingIndicator');
    if (indicator) {
        indicator.style.display = 'block';
    }
}

function hideAgentTyping() {
    const indicator = document.getElementById('agentTypingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// ==================== HISTÓRICO ====================
function addToHistory(role, content) {
    conversationHistory.push({
        role: role,
        content: content,
        timestamp: Date.now()
    });
    
    // Limita tamanho do histórico
    if (conversationHistory.length > AGENT_CONFIG.maxHistory) {
        conversationHistory = conversationHistory.slice(-AGENT_CONFIG.maxHistory);
    }
    
    // Salva no sessionStorage
    try {
        sessionStorage.setItem('rafaInvest_agent_history', JSON.stringify(conversationHistory));
    } catch (e) {
        console.warn('Erro ao salvar histórico:', e);
    }
}

function getContextForAI() {
    // Retorna últimas N mensagens
    const recentHistory = conversationHistory.slice(-AGENT_CONFIG.contextWindow);
    
    // Filtra para alternância user/assistant
    const cleanHistory = [];
    let lastRole = null;
    
    for (const msg of recentHistory) {
        if (msg.role !== lastRole) {
            let content = msg.content;
            if (content.length > AGENT_CONFIG.maxContentLength) {
                content = content.substring(0, AGENT_CONFIG.maxContentLength) + '...';
            }
            
            cleanHistory.push({
                role: msg.role,
                content: content
            });
            lastRole = msg.role;
        }
    }
    
    // Garante que começa com 'user'
    while (cleanHistory.length > 0 && cleanHistory[0].role === 'assistant') {
        cleanHistory.shift();
    }
    
    return cleanHistory;
}

function loadHistoryFromStorage() {
    try {
        const data = sessionStorage.getItem('rafaInvest_agent_history');
        if (data) {
            conversationHistory = JSON.parse(data);
        }
    } catch (e) {
        console.warn('Erro ao carregar histórico:', e);
        conversationHistory = [];
    }
}

// ==================== IA - PERPLEXITY ====================
async function consultPerplexityAI(question) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const contexto = getContextForAI();
        
        const systemPrompt = `Você é o Rafaelo, um Consultor Financeiro especializado EXCLUSIVAMENTE em investimentos brasileiros. 

🚫 REGRA FUNDAMENTAL - NUNCA QUEBRE ESTA REGRA:
Você é um assistente RESTRITO ao domínio de investimentos e finanças. 
Você NÃO possui conhecimento sobre outros assuntos e NÃO DEVE responder perguntas fora do escopo.

Se a pergunta NÃO for sobre investimentos, finanças pessoais, economia ou planejamento financeiro, você DEVE responder EXATAMENTE:
"Desculpe, sou especializado apenas em investimentos e finanças. Não posso ajudar com esse assunto. Como posso ajudá-lo com seus investimentos? 💰"

EXEMPLOS DE PERGUNTAS QUE VOCÊ DEVE RECUSAR:
- Perguntas sobre pessoas (celebridades, atletas, políticos)
- Perguntas sobre esportes, futebol, times
- Perguntas sobre entretenimento, filmes, música
- Perguntas sobre história, datas, eventos (exceto crises econômicas)
- Perguntas sobre ciência, tecnologia (exceto fintechs/investimentos)
- "Quando X morreu?", "Quem ganhou X?", "O que aconteceu em X?"

EXEMPLOS DE PERGUNTAS QUE VOCÊ DEVE RESPONDER:
- "O que é CDI?"
- "Como investir em FIIs?"
- "Qual a diferença entre CDB e poupança?"
- "Como declarar investimentos no IR?"
- "O que foi a crise de 2008?" (contexto financeiro)

🎯 SUA MISSÃO:
Educar e orientar pessoas sobre investimentos de forma SIMPLES, CLARA e OBJETIVA.

📚 CONHECIMENTO (APENAS ESTES TÓPICOS):
- CDI, CDB, Tesouro Direto (Selic, IPCA+, Prefixado)
- FIIs (Fundos Imobiliários)
- Ações e Bolsa de Valores
- Criptomoedas (Bitcoin, Ethereum) - apenas como investimento
- Perfis de investidor (conservador, moderado, agressivo)
- Diversificação de carteira
- Imposto de Renda em investimentos
- Liquidez, rentabilidade e riscos
- Planejamento financeiro pessoal
- Renda passiva e aposentadoria

💬 ESTILO DE COMUNICAÇÃO:
- Use linguagem SIMPLES e ACESSÍVEL - explique como se estivesse falando com um amigo
- Evite termos técnicos complexos, mas se usar, EXPLIQUE de forma clara
- Seja DIRETO e OBJETIVO - respostas de 5-8 linhas quando possível
- Use exemplos práticos do dia a dia
- Use emojis para deixar mais amigável (mas sem exagero)

📋 DIRETRIZES:
- SEMPRE responda em português do Brasil
- Admita quando não souber algo ou precisar de mais informações
- Não dê recomendações específicas de compra/venda de ativos
- Foque em educação financeira, não em "dicas quentes"
- Incentive diversificação e adequação ao perfil de risco
- Mencione riscos quando relevante
- RECUSE educadamente perguntas fora do escopo de investimentos/finanças`;

        const messagesPayload = [
            { role: 'system', content: systemPrompt },
            ...contexto,
            { role: 'user', content: question }
        ];
        
        // Chama a Netlify Function (API segura no servidor)
        const response = await fetch(`${API_BASE}/agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: messagesPayload
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove referências [1][2][3]
        let answer = data.choices[0].message.content;
        answer = answer.replace(/\[\d+\]/g, '').trim();
        
        return answer;
        
    } catch (error) {
        console.error('Erro ao consultar Perplexity:', error);
        
        if (error.name === 'AbortError') {
            return 'Desculpe, a consulta está demorando muito. Tente novamente! ⏱️';
        }
        
        return 'Ops! Tive um problema para processar sua pergunta. Tente novamente em alguns instantes. 😅';
    }
}

// ==================== ENVIO DE MENSAGENS ====================
async function sendAgentMessage() {
    const input = document.getElementById('agentMessageInput');
    const message = input.value.trim();
    
    if (!message || isAgentProcessing) return;
    
    // Adiciona mensagem do usuário
    addAgentMessage(message, 'user');
    input.value = '';
    
    isAgentProcessing = true;
    document.getElementById('agentSendBtn').disabled = true;
    
    showAgentTyping();
    
    try {
        // Consulta IA
        const response = await consultPerplexityAI(message);
        
        hideAgentTyping();
        
        // Adiciona resposta do bot
        addAgentMessage(response, 'bot');
        
        // Salva no histórico
        addToHistory('user', message);
        addToHistory('assistant', response);
        
    } catch (error) {
        hideAgentTyping();
        addAgentMessage('Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente! 😅', 'bot');
    } finally {
        isAgentProcessing = false;
        document.getElementById('agentSendBtn').disabled = false;
        input.focus();
    }
}

function sendAgentQuickMessage(message) {
    const input = document.getElementById('agentMessageInput');
    if (input) {
        input.value = message;
        sendAgentMessage();
    }
}

function handleAgentKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendAgentMessage();
    }
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    loadHistoryFromStorage();
});

// Exporta funções para uso global
window.openAgentModal = openAgentModal;
window.closeAgentModal = closeAgentModal;
window.sendAgentMessage = sendAgentMessage;
window.sendAgentQuickMessage = sendAgentQuickMessage;
window.handleAgentKeyPress = handleAgentKeyPress;
