/* ==================================
   rafaInvest - JavaScript Principal
   SPA com Router e Dados Educacionais
   ================================== */

// ===== CONFIGURAÇÃO =====
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/.netlify/functions'
    : '/.netlify/functions';

// ===== ESTADO GLOBAL =====
const state = {
    currentPage: 'home',
    data: {
        cryptos: [],
        fiis: [],
        cdbs: [],
        news: [],
        educacao: null
    },
    cache: {
        lastUpdate: null
    },
    userProfile: null
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    setupNavigation();
    setupMobileMenu();
    setupFilters();
    await loadEducationalContent();
    renderHomePage();
    
    // Carregar dados para dashboard (se necessário)
    if (state.currentPage === 'dashboard') {
        await loadDashboardData();
    }
    
    // Mostrar modal de recomendações na primeira visita
    showWelcomeModal();
}

// ===== NAVEGAÇÃO SPA =====
function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateToPage(page);
        });
    });
}

function navigateToPage(page) {
    // Atualizar estado
    state.currentPage = page;
    
    // Atualizar links ativos
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Ocultar todas as páginas
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar página atual
    const currentSection = document.getElementById(`page-${page}`);
    if (currentSection) {
        currentSection.classList.add('active');
    }
    
    // Atualizar header
    updatePageHeader(page);
    
    // Carregar dados se necessário
    loadPageData(page);
    
    // Fechar sidebar mobile
    if (window.innerWidth <= 768) {
        closeMobileSidebar();
    }
    
    // Scroll para o topo
    window.scrollTo(0, 0);
}

function updatePageHeader(page) {
    const headers = {
        home: {
            title: 'Educação Financeira',
            subtitle: 'Aprenda sobre investimentos de forma simples e clara'
        },
        'getting-started': {
            title: 'Como Começar a Investir',
            subtitle: 'Seu guia completo para dar os primeiros passos no mundo dos investimentos'
        },
        dashboard: {
            title: 'Dashboard de Investimentos',
            subtitle: 'Acompanhe cotações e dados em tempo real'
        },
        news: {
            title: 'Notícias do Mercado',
            subtitle: 'Últimas novidades do mundo financeiro'
        },
        calculators: {
            title: 'Calculadoras Financeiras',
            subtitle: 'Simuladores e ferramentas práticas'
        },
        profile: {
            title: 'Projeções & Perfil',
            subtitle: 'Descubra seu perfil de investidor e simule sua carteira'
        }
    };
    
    const header = headers[page] || headers.home;
    
    // Atualizar hero ao invés do header antigo
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    
    if (heroTitle) heroTitle.textContent = header.title;
    if (heroSubtitle) heroSubtitle.textContent = header.subtitle;
}

async function loadPageData(page) {
    switch(page) {
        case 'home':
        case 'education':
            if (!state.data.educacao) {
                await loadEducationalContent();
            }
            renderSiglasCards();
            renderPerfisCards();
            break;
        case 'getting-started':
            renderGettingStartedPage();
            break;
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'news':
            await loadNews();
            break;
        case 'profile':
            renderProfileQuiz();
            break;
    }
}

// ===== FILTROS =====
function setupFilters() {
    // Event listeners para filtros do dashboard
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-filter]')) {
            const filter = e.target.dataset.filter;
            applyAssetFilter(filter);
            
            // Atualiza visual dos botões
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline');
            });
            e.target.classList.remove('btn-outline');
            e.target.classList.add('btn-primary');
        }
        
        // Filtros de fonte de notícias
        if (e.target.matches('[data-source]')) {
            const source = e.target.dataset.source;
            applyNewsFilter(source);
            
            // Atualiza visual dos botões
            document.querySelectorAll('[data-source]').forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline');
            });
            e.target.classList.remove('btn-outline');
            e.target.classList.add('btn-primary');
        }
    });
    
    // Search input
    const searchInput = document.getElementById('searchAssets');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchAssets(e.target.value);
        });
    }
}

function applyNewsFilter(source) {
    const cards = document.querySelectorAll('#newsGrid .card');
    cards.forEach(card => {
        const cardSource = card.dataset.source;
        if (source === 'all' || cardSource === source) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function applyAssetFilter(filter) {
    const cards = document.querySelectorAll('#assetsGrid .card');
    cards.forEach(card => {
        const type = card.dataset.type;
        if (filter === 'all' || filter === type) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Controlar visibilidade dos gráficos
    const cryptoChartCard = document.querySelector('#cryptoChart')?.closest('.card');
    const fiisTableCard = document.querySelector('#fiisTable')?.closest('.card');
    
    if (cryptoChartCard && fiisTableCard) {
        if (filter === 'all') {
            // Mostrar ambos
            cryptoChartCard.style.display = 'block';
            fiisTableCard.style.display = 'block';
        } else if (filter === 'crypto') {
            // Mostrar só crypto
            cryptoChartCard.style.display = 'block';
            fiisTableCard.style.display = 'none';
        } else if (filter === 'fiis') {
            // Mostrar só FIIs
            cryptoChartCard.style.display = 'none';
            fiisTableCard.style.display = 'block';
        } else {
            // Outros filtros (cdb/renda fixa) - esconder gráficos
            cryptoChartCard.style.display = 'none';
            fiisTableCard.style.display = 'none';
        }
    }
}

function searchAssets(query) {
    const cards = document.querySelectorAll('#assetsGrid .card');
    const lowerQuery = query.toLowerCase();
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(lowerQuery)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===== MENU MOBILE =====
function setupMobileMenu() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isActive = sidebar.classList.toggle('active');
            overlay.classList.toggle('active', isActive);
            document.body.classList.toggle('menu-open', isActive);
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }
}

function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
    document.body.classList.remove('menu-open');
}

// ===== LOADING =====
function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

// ===== MODAL =====
function openModal(title, content, footerButtons = null) {
    document.getElementById('modalTitle').innerHTML = title;
    document.getElementById('modalBody').innerHTML = content;
    
    const footer = document.getElementById('modalFooter');
    if (footerButtons) {
        footer.innerHTML = footerButtons;
    } else {
        footer.innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Fechar</button>';
    }
    
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Fechar modal ao clicar no overlay
document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') {
        closeModal();
    }
});

// ===== UTILITÁRIOS =====
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatPercent(value, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00%';
    return `${num >= 0 ? '+' : ''}${num.toFixed(decimals)}%`;
}

function formatNumber(value, decimals = 0) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

function formatLargeNumber(value) {
    if (!value || value === undefined || value === null) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
        ano: 31536000,
        mês: 2592000,
        semana: 604800,
        dia: 86400,
        hora: 3600,
        minuto: 60
    };
    
    for (const [name, value] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / value);
        if (interval >= 1) {
            return `há ${interval} ${name}${interval > 1 ? 's' : ''}`;
        }
    }
    
    return 'agora mesmo';
}

// ===== FETCH COM CACHE =====
async function fetchWithCache(url, cacheKey, maxAge = 300000) { // 5 min padrão
    const cached = state.cache[cacheKey];
    if (cached && Date.now() - cached.timestamp < maxAge) {
        return cached.data;
    }
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        state.cache[cacheKey] = {
            data,
            timestamp: Date.now()
        };
        
        return data;
    } catch (error) {
        console.error(`Erro ao buscar ${url}:`, error);
        return cached ? cached.data : null;
    }
}

// ===== CONTEÚDO EDUCACIONAL =====
const educationalContent = {
    siglas: [
        {
            id: 'cdi',
            icon: 'icon-chart',
            title: 'CDI',
            subtitle: 'Certificado de Depósito Interbancário',
            summary: 'Taxa de juros que os bancos usam para emprestar dinheiro entre si. É a principal referência para investimentos de renda fixa no Brasil.',
            details: `
                <p><strong>O que é?</strong></p>
                <p>O CDI (Certificado de Depósito Interbancário) é uma taxa de juros usada em empréstimos entre bancos. Ela acompanha de perto a taxa Selic e serve como referência para a maioria dos investimentos de renda fixa.</p>
                
                <p><strong>Como funciona?</strong></p>
                <p>Quando você investe em um CDB, por exemplo, o banco promete pagar um percentual do CDI (como 110% do CDI). Se o CDI está em 12% ao ano, você receberá 13,2% ao ano (110% × 12%).</p>
                
                <p><strong>Para quem serve?</strong></p>
                <ul>
                    <li>Iniciantes que buscam segurança</li>
                    <li>Reserva de emergência</li>
                    <li>Parte conservadora do portfólio</li>
                </ul>

                <div class="alert alert-info mt-3">
                    <svg class="icon"><use href="svgs/icons.svg#icon-info"></use></svg>
                    <div><strong>Dica:</strong> Investimentos que pagam acima de 100% do CDI são considerados bons negócios para renda fixa.</div>
                </div>
            `,
            risk: 'Muito Baixo',
            liquidez: 'Alta',
            retorno: '100% do CDI ≈ Selic'
        },
        {
            id: 'cdb',
            icon: 'icon-money',
            title: 'CDB',
            subtitle: 'Certificado de Depósito Bancário',
            summary: 'Você empresta dinheiro para um banco e recebe juros em troca. Protegido pelo FGC até R$ 250 mil por instituição.',
            details: `
                <p><strong>O que é?</strong></p>
                <p>CDB é como um empréstimo que você faz para o banco. Em troca, o banco paga juros a você. É um dos investimentos mais populares do Brasil.</p>
                
                <p><strong>Tipos de CDB:</strong></p>
                <ul>
                    <li><strong>Prefixado:</strong> Taxa fixa conhecida no momento da aplicação (ex: 12% ao ano)</li>
                    <li><strong>Pós-fixado:</strong> Atrelado ao CDI (ex: 110% do CDI)</li>
                    <li><strong>Híbrido:</strong> IPCA + taxa fixa (ex: IPCA + 6%)</li>
                </ul>

                <p><strong>Proteção FGC</strong></p>
                <p>O Fundo Garantidor de Créditos (FGC) protege seu dinheiro até R$ 250.000 por CPF e por instituição financeira. Isso torna o CDB muito seguro.</p>

                <p><strong>Vantagens:</strong></p>
                <ul>
                    <li>Segurança (FGC)</li>
                    <li>Rentabilidade previsível</li>
                    <li>Diversas opções de prazo</li>
                    <li>Investimento mínimo baixo</li>
                </ul>

                <div class="alert alert-warning mt-3">
                    <svg class="icon"><use href="svgs/icons.svg#icon-alert"></use></svg>
                    <div><strong>Atenção ao IR:</strong> CDBs têm imposto regressivo. Quanto maior o prazo, menor o imposto (de 22,5% até 15%).</div>
                </div>
            `,
            risk: 'Baixo',
            liquidez: 'Variável (D+0 a D+1800)',
            retorno: '100% a 130% do CDI'
        },
        {
            id: 'tesouro',
            icon: 'icon-treasure',
            title: 'Tesouro Direto',
            subtitle: 'Títulos públicos do governo',
            summary: 'Você empresta dinheiro para o governo federal e recebe juros. É o investimento mais seguro do país.',
            details: `
                <p><strong>O que é?</strong></p>
                <p>Tesouro Direto é um programa do governo que permite você comprar títulos públicos pela internet. É como emprestar dinheiro para o Brasil e receber de volta com juros.</p>
                
                <p><strong>Principais títulos:</strong></p>
                
                <h4 style="margin-top: 1.5rem; color: var(--info);">Tesouro Selic (LFT)</h4>
                <p>Rende 100% da Selic. Ideal para reserva de emergência.</p>
                <ul>
                    <li>Liquidez diária</li>
                    <li>Sem risco de perda se vender antes do vencimento</li>
                    <li>Ótimo para curto prazo</li>
                </ul>

                <h4 style="margin-top: 1.5rem; color: var(--success);">Tesouro IPCA+ (NTN-B)</h4>
                <p>Protege da inflação + rende uma taxa fixa. Ideal para longo prazo.</p>
                <ul>
                    <li>Ex: IPCA + 6% ao ano</li>
                    <li>Ótimo para aposentadoria</li>
                    <li>Pode oscilar se vender antes do vencimento</li>
                </ul>

                <h4 style="margin-top: 1.5rem; color: var(--warning);">Tesouro Prefixado (LTN)</h4>
                <p>Taxa fixa conhecida no momento da compra.</p>
                <ul>
                    <li>Ex: 12% ao ano</li>
                    <li>Bom quando Selic está alta e pode cair</li>
                    <li>Pode oscilar se vender antes do vencimento</li>
                </ul>

                <div class="alert alert-success mt-3">
                    <svg class="icon"><use href="svgs/icons.svg#icon-check"></use></svg>
                    <div><strong>Mais seguro do Brasil:</strong> Investimento garantido pelo Tesouro Nacional. Risco praticamente zero.</div>
                </div>
            `,
            risk: 'Muito Baixo',
            liquidez: 'Alta (D+0 ou D+1)',
            retorno: 'Selic, IPCA+ ou Taxa fixa'
        },
        {
            id: 'fiis',
            icon: 'icon-building',
            title: 'FIIs',
            subtitle: 'Fundos de Investimento Imobiliário',
            summary: 'Investimento em imóveis sem precisar comprar um. Receba aluguel mensalmente e tenha isenção de IR nos dividendos.',
            details: `
                <p><strong>O que é?</strong></p>
                <p>FII permite você investir em imóveis (shoppings, escritórios, galpões, hospitais) comprando cotas na bolsa, assim como ações. Você recebe "aluguel" mensalmente.</p>
                
                <p><strong>Vantagens:</strong></p>
                <ul>
                    <li><strong>Renda passiva:</strong> Receba dividendos mensais</li>
                    <li><strong>Isenção de IR:</strong> Dividendos isentos para pessoa física</li>
                    <li><strong>Liquidez:</strong> Venda suas cotas na bolsa quando quiser</li>
                    <li><strong>Acessibilidade:</strong> Invista em imóveis com pouco dinheiro</li>
                    <li><strong>Diversificação:</strong> Acesso a vários imóveis ao mesmo tempo</li>
                </ul>

                <p><strong>Tipos de FIIs:</strong></p>
                <ul>
                    <li><strong>Tijolo:</strong> Donos de imóveis físicos (mais estáveis)</li>
                    <li><strong>Papel:</strong> Investem em títulos de crédito imobiliário (mais voláteis)</li>
                    <li><strong>Híbridos:</strong> Mix de tijolo e papel</li>
                </ul>

                <p><strong>Indicadores importantes:</strong></p>
                <ul>
                    <li><strong>Dividend Yield:</strong> % de dividendos por ano (busque 6-10%)</li>
                    <li><strong>P/VP:</strong> Preço sobre valor patrimonial (abaixo de 1 = desconto)</li>
                    <li><strong>Vacância:</strong> % de imóveis desocupados (quanto menor, melhor)</li>
                </ul>

                <div class="alert alert-warning mt-3">
                    <svg class="icon"><use href="svgs/icons.svg#icon-alert"></use></svg>
                    <div><strong>Riscos:</strong> Preço das cotas oscila. Vacância pode reduzir dividendos. Escolha fundos sólidos e diversifique.</div>
                </div>
            `,
            risk: 'Médio',
            liquidez: 'Alta (bolsa)',
            retorno: '6% a 12% a.a. em dividendos'
        },
        {
            id: 'crypto',
            icon: 'icon-crypto',
            title: 'Criptomoedas',
            subtitle: 'Moedas digitais descentralizadas',
            summary: 'Ativos digitais com alta volatilidade. Potencial de grandes ganhos, mas também grandes perdas. Use apenas uma pequena parte do portfólio.',
            details: `
                <p><strong>O que são?</strong></p>
                <p>Criptomoedas são moedas digitais que funcionam sem um banco central. Bitcoin (BTC) e Ethereum (ETH) são as mais conhecidas.</p>
                
                <p><strong>Características:</strong></p>
                <ul>
                    <li><strong>Descentralização:</strong> Não controladas por governos</li>
                    <li><strong>Blockchain:</strong> Tecnologia de registro distribuído</li>
                    <li><strong>Alta volatilidade:</strong> Preço oscila muito (±10-50% ao dia)</li>
                    <li><strong>Liquidez 24/7:</strong> Mercado funciona dia e noite</li>
                </ul>

                <p><strong>Principais criptomoedas:</strong></p>
                <ul>
                    <li><strong>Bitcoin (BTC):</strong> A primeira e mais valiosa. "Ouro digital".</li>
                    <li><strong>Ethereum (ETH):</strong> Plataforma para contratos inteligentes.</li>
                    <li><strong>Stablecoins:</strong> Atreladas ao dólar (USDT, USDC) - menos voláteis.</li>
                </ul>

                <p><strong>Para quem serve?</strong></p>
                <ul>
                    <li>Perfil agressivo com tolerância a risco</li>
                    <li>Visão de longo prazo (5-10 anos)</li>
                    <li>Apenas 5-10% do portfólio total</li>
                    <li>Quem entende a tecnologia</li>
                </ul>

                <div class="alert alert-danger mt-3">
                    <svg class="icon"><use href="svgs/icons.svg#icon-alert"></use></svg>
                    <div><strong>Alto risco:</strong> Pode perder muito valor rapidamente. Nunca invista mais do que está disposto a perder. Não é indicado para iniciantes ou reserva de emergência.</div>
                </div>
            `,
            risk: 'Muito Alto',
            liquidez: 'Alta (24/7)',
            retorno: 'Imprevisível (-50% a +500% a.a.)'
        },
        {
            id: 'consorcio',
            icon: 'icon-user',
            title: 'Consórcio',
            subtitle: 'Grupo de compras coletivas',
            summary: 'Forma de adquirir bens (carro, moto, imóvel) sem juros, pagando parcelas mensais até ser contemplado por sorteio ou lance.',
            details: `
                <p><strong>O que é?</strong></p>
                <p>Consórcio é um grupo de pessoas que se juntam para comprar bens (carros, motos, imóveis, serviços) de forma planejada. Cada mês, alguns participantes são sorteados ou dão lances para receber sua carta de crédito.</p>
                
                <p><strong>Como funciona?</strong></p>
                <ol>
                    <li><strong>Adesão:</strong> Você escolhe o bem e paga uma taxa de adesão</li>
                    <li><strong>Parcelas:</strong> Paga mensalmente durante o prazo (24, 60, 100 meses, etc)</li>
                    <li><strong>Contemplação:</strong> Por sorteio mensal ou oferecendo lance (adiantar parcelas)</li>
                    <li><strong>Compra:</strong> Quando contemplado, recebe a carta de crédito e compra o bem</li>
                </ol>

                <p><strong>Vantagens:</strong></p>
                <ul>
                    <li><strong>Sem juros:</strong> Paga apenas taxa de administração (15-25%)</li>
                    <li><strong>Planejamento:</strong> Ideal para compras futuras programadas</li>
                    <li><strong>Valorização:</strong> Se o bem valorizar, você ganha</li>
                    <li><strong>Disciplina:</strong> Força a guardar dinheiro mensalmente</li>
                </ul>

                <p><strong>Desvantagens:</strong></p>
                <ul>
                    <li><strong>Incerteza:</strong> Não sabe quando será contemplado</li>
                    <li><strong>Longo prazo:</strong> Pode levar anos para ser sorteado</li>
                    <li><strong>Taxa de administração:</strong> Custo de 15-25% sobre o total</li>
                    <li><strong>Fundo de reserva:</strong> Parte do valor vai para reserva (3-10%)</li>
                </ul>

                <p><strong>Comparação: Consórcio vs Financiamento</strong></p>
                <div class="comparison-table">
                    <div class="comparison-row">
                        <div class="comparison-item">
                            <strong>Consórcio</strong>
                            <ul>
                                <li>Sem juros (só taxa admin)</li>
                                <li>Contemplação por sorteio</li>
                                <li>Prazo flexível</li>
                                <li>Melhor para planejamento</li>
                            </ul>
                        </div>
                        <div class="comparison-item">
                            <strong>Financiamento</strong>
                            <ul>
                                <li>Com juros (1-3% a.m.)</li>
                                <li>Recebe imediatamente</li>
                                <li>Prazo fixo</li>
                                <li>Melhor para urgência</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <p><strong>Para quem serve?</strong></p>
                <ul>
                    <li>Quem tem tempo para esperar</li>
                    <li>Compra planejada (não urgente)</li>
                    <li>Quer economizar em juros</li>
                    <li>Tem disciplina financeira</li>
                </ul>

                <div class="alert alert-warning mt-3">
                    <svg class="icon"><use href="svgs/icons.svg#icon-alert"></use></svg>
                    <div><strong>Atenção:</strong> Consórcio NÃO é investimento! É uma forma de compra programada. Se precisar do bem com urgência, financiamento pode ser melhor opção.</div>
                </div>
            `,
            risk: 'Baixo',
            liquidez: 'Baixa (até contemplação)',
            retorno: 'Economia de juros (variável)'
        }
    ],

    perfis: [
        {
            id: 'conservador',
            name: 'Conservador',
            icon: 'icon-safe',
            color: '#10B981',
            description: 'Prioriza segurança e preservação do capital. Aceita baixa volatilidade e retornos mais modestos.',
            characteristics: [
                'Não tolera perdas',
                'Prefere investimentos garantidos',
                'Horizonte de curto a médio prazo',
                'Busca liquidez e previsibilidade'
            ],
            allocation: {
                'Renda Fixa': 80,
                'Fundos Imobiliários': 15,
                'Ações/Criptomoedas': 5
            },
            expectedReturn: 10,
            assets: ['Tesouro Selic', 'CDB 100-110% CDI', 'LCI/LCA', 'Fundos DI']
        },
        {
            id: 'moderado',
            name: 'Moderado',
            icon: 'icon-chart',
            color: '#F59E0B',
            description: 'Equilíbrio entre segurança e rentabilidade. Aceita alguma volatilidade por retornos maiores.',
            characteristics: [
                'Aceita oscilações moderadas',
                'Busca diversificação',
                'Horizonte de médio a longo prazo',
                'Mix de renda fixa e variável'
            ],
            allocation: {
                'Renda Fixa': 50,
                'Fundos Imobiliários': 30,
                'Ações': 15,
                'Criptomoedas': 5
            },
            expectedReturn: 14,
            assets: ['Tesouro IPCA+', 'CDB 110-120% CDI', 'FIIs diversificados', 'Ações blue chips']
        },
        {
            id: 'agressivo',
            name: 'Agressivo',
            icon: 'icon-trending-up',
            color: '#EF4444',
            description: 'Busca máxima rentabilidade. Aceita alta volatilidade e risco de perdas por ganhos maiores.',
            characteristics: [
                'Tolera grandes oscilações',
                'Foco em crescimento',
                'Horizonte de longo prazo (5+ anos)',
                'Maior exposição a renda variável'
            ],
            allocation: {
                'Renda Fixa': 20,
                'Fundos Imobiliários': 25,
                'Ações': 40,
                'Criptomoedas': 15
            },
            expectedReturn: 20,
            assets: ['Tesouro IPCA+', 'FIIs de papel', 'Ações growth', 'BTC/ETH', 'Fundos multimercado']
        }
    ],

    quiz: [
        {
            id: 'q1',
            question: 'Qual é o seu principal objetivo ao investir?',
            options: [
                { text: 'Preservar capital e ter segurança', score: { conservador: 3, moderado: 1, agressivo: 0 } },
                { text: 'Equilibrar segurança com crescimento', score: { conservador: 1, moderado: 3, agressivo: 1 } },
                { text: 'Maximizar ganhos no longo prazo', score: { conservador: 0, moderado: 1, agressivo: 3 } }
            ]
        },
        {
            id: 'q2',
            question: 'Como você reagiria se seu investimento perdesse 20% em um mês?',
            options: [
                { text: 'Venderia imediatamente para evitar mais perdas', score: { conservador: 3, moderado: 1, agressivo: 0 } },
                { text: 'Ficaria preocupado mas esperaria recuperar', score: { conservador: 1, moderado: 3, agressivo: 1 } },
                { text: 'Veria como oportunidade de comprar mais', score: { conservador: 0, moderado: 1, agressivo: 3 } }
            ]
        },
        {
            id: 'q3',
            question: 'Qual é o seu horizonte de investimento?',
            options: [
                { text: 'Curto prazo (até 2 anos)', score: { conservador: 3, moderado: 1, agressivo: 0 } },
                { text: 'Médio prazo (2 a 5 anos)', score: { conservador: 1, moderado: 3, agressivo: 1 } },
                { text: 'Longo prazo (mais de 5 anos)', score: { conservador: 0, moderado: 1, agressivo: 3 } }
            ]
        },
        {
            id: 'q4',
            question: 'Qual percentual do seu portfólio você está disposto a arriscar?',
            options: [
                { text: 'Até 10% - quero máxima segurança', score: { conservador: 3, moderado: 1, agressivo: 0 } },
                { text: '20-40% - aceito algum risco', score: { conservador: 1, moderado: 3, agressivo: 1 } },
                { text: 'Mais de 50% - busco alta rentabilidade', score: { conservador: 0, moderado: 1, agressivo: 3 } }
            ]
        },
        {
            id: 'q5',
            question: 'Qual é a sua experiência com investimentos?',
            options: [
                { text: 'Nenhuma - estou começando agora', score: { conservador: 3, moderado: 1, agressivo: 0 } },
                { text: 'Alguma - já invisto em renda fixa', score: { conservador: 1, moderado: 3, agressivo: 1 } },
                { text: 'Experiente - já investi em ações/FIIs/cripto', score: { conservador: 0, moderado: 1, agressivo: 3 } }
            ]
        },
        {
            id: 'q6',
            question: 'Você precisa resgatar o dinheiro investido com frequência?',
            options: [
                { text: 'Sim, pode ser necessário a qualquer momento', score: { conservador: 3, moderado: 1, agressivo: 0 } },
                { text: 'Raramente, mas gostaria de ter liquidez', score: { conservador: 1, moderado: 3, agressivo: 1 } },
                { text: 'Não, posso deixar investido por anos', score: { conservador: 0, moderado: 1, agressivo: 3 } }
            ]
        },
        {
            id: 'q7',
            question: 'Como você se sente em relação a volatilidade (oscilações de preço)?',
            options: [
                { text: 'Me deixa muito ansioso, prefiro estabilidade', score: { conservador: 3, moderado: 1, agressivo: 0 } },
                { text: 'Aceito oscilações moderadas', score: { conservador: 1, moderado: 3, agressivo: 1 } },
                { text: 'Não me incomodo, faz parte do jogo', score: { conservador: 0, moderado: 1, agressivo: 3 } }
            ]
        }
    ]
};

async function loadEducationalContent() {
    // Usa o conteúdo educacional local
    state.data.educacao = educationalContent;
}

// ===== PÁGINA HOME - RENDERIZAÇÃO =====
function renderHomePage() {
    renderSiglasCards();
    renderPerfisCards();
}

function renderSiglasCards() {
    const grid = document.getElementById('siglasGrid');
    if (!grid || !state.data.educacao) return;
    
    grid.innerHTML = state.data.educacao.siglas.map(sigla => `
        <div class="card card-educational" onclick="openSiglaModal('${sigla.id}')">
            <div class="educational-header">
                <div class="educational-icon">
                    <svg class="icon"><use href="svgs/icons.svg#${sigla.icon}"></use></svg>
                </div>
                <span class="educational-badge badge-${sigla.risk.toLowerCase().replace(' ', '-')}">${sigla.risk}</span>
            </div>
            
            <h3 class="educational-title">${sigla.title}</h3>
            <p class="educational-subtitle">${sigla.subtitle}</p>
            <p class="educational-summary">${sigla.summary}</p>
            
            <div class="educational-footer">
                <div class="educational-stats">
                    <div class="stat-item">
                        <span class="stat-label">Liquidez</span>
                        <span class="stat-value">${sigla.liquidez}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Retorno</span>
                        <span class="stat-value">${sigla.retorno}</span>
                    </div>
                </div>
                <button class="btn btn-outline" style="width: 100%; margin-top: 1rem;">
                    <svg class="icon"><use href="svgs/icons.svg#icon-info"></use></svg>
                    Saber mais
                </button>
            </div>
        </div>
    `).join('');
}

function openSiglaModal(siglaId) {
    const sigla = state.data.educacao.siglas.find(s => s.id === siglaId);
    if (!sigla) return;
    
    const content = `
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <svg class="icon" style="width: 40px; height: 40px; color: var(--info);">
                    <use href="svgs/icons.svg#${sigla.icon}"></use>
                </svg>
                <div>
                    <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem;">${sigla.title}</h4>
                    <p style="color: var(--text-light); margin: 0;">${sigla.subtitle}</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 0.5rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 0.25rem;">RISCO</div>
                    <div style="font-weight: 700;">${sigla.risk}</div>
                </div>
                <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 0.5rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 0.25rem;">LIQUIDEZ</div>
                    <div style="font-weight: 700;">${sigla.liquidez}</div>
                </div>
                <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 0.5rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 0.25rem;">RETORNO</div>
                    <div style="font-weight: 700;">${sigla.retorno}</div>
                </div>
            </div>
        </div>
        
        ${sigla.details}
    `;
    
    openModal(`
        <svg class="icon" style="width: 28px; height: 28px;"><use href="svgs/icons.svg#${sigla.icon}"></use></svg>
        ${sigla.title}
    `, content);
}

function renderPerfisCards() {
    const grid = document.getElementById('perfisGrid');
    if (!grid || !state.data.educacao) return;
    
    grid.innerHTML = state.data.educacao.perfis.map(perfil => `
        <div class="card" style="border-top: 4px solid ${perfil.color};">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <svg class="icon" style="width: 48px; height: 48px; color: ${perfil.color}; margin-bottom: 0.75rem;">
                    <use href="svgs/icons.svg#${perfil.icon}"></use>
                </svg>
                <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">${perfil.name}</h4>
                <p style="color: var(--text-light);">${perfil.description}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <strong style="display: block; margin-bottom: 0.5rem; color: var(--text-dark);">Características:</strong>
                <ul style="list-style: none; padding: 0; font-size: 0.875rem; color: var(--text-light);">
                    ${perfil.characteristics.map(c => `
                        <li style="padding: 0.25rem 0; display: flex; align-items: center; gap: 0.5rem;">
                            <svg class="icon" style="width: 14px; height: 14px; color: ${perfil.color};"><use href="svgs/icons.svg#icon-check"></use></svg>
                            ${c}
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div style="padding: 1rem; background: var(--bg-surface); border-radius: 0.5rem; margin-bottom: 1rem;">
                <strong style="display: block; margin-bottom: 0.5rem;">Retorno esperado:</strong>
                <div style="font-size: 1.75rem; font-weight: 700; color: ${perfil.color};">~${perfil.expectedReturn}% a.a.</div>
            </div>
            
            <button class="btn btn-outline" style="width: 100%;" onclick="navigateToPage('profile')">
                <svg class="icon"><use href="svgs/icons.svg#icon-user"></use></svg>
                Fazer teste de perfil
            </button>
        </div>
    `).join('');
}

// ===== DASHBOARD - CARREGAR DADOS =====
async function loadDashboardData() {
    showLoading(true);
    
    try {
        const [cryptoRes, fiisRes, cdbRes] = await Promise.all([
            fetchWithCache(`${API_BASE}/crypto`, 'crypto', 300000),
            fetchWithCache(`${API_BASE}/fiis`, 'fiis', 300000),
            fetchWithCache(`${API_BASE}/cdb`, 'cdb', 300000)
        ]);
        
        state.data.cryptos = cryptoRes?.cryptos || [];
        state.data.fiis = fiisRes?.fiis || [];
        state.data.cdbs = cdbRes?.cdbs || [];
        state.cache.lastUpdate = new Date();
        
        renderDashboard();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    } finally {
        showLoading(false);
    }
}

function renderDashboard() {
    renderAssetsCards();
    renderCharts();
    updateLastUpdateTime();
}

function renderAssetsCards() {
    const grid = document.getElementById('assetsGrid');
    if (!grid) return;
    
    const allAssets = [
        ...state.data.cryptos.map(c => ({ ...c, type: 'crypto', icon: 'icon-crypto' })),
        ...state.data.fiis.map(f => ({ ...f, type: 'fii', icon: 'icon-building' })),
        ...state.data.cdbs.map(c => ({ ...c, type: 'cdb', icon: 'icon-money' }))
    ];
    
    if (allAssets.length === 0) {
        grid.innerHTML = '<div class="card"><p>Carregando dados...</p></div>';
        return;
    }
    
    grid.innerHTML = allAssets.map(asset => {
        const isCrypto = asset.type === 'crypto';
        const isFii = asset.type === 'fii';
        const isCdb = asset.type === 'cdb';
        
        // Configuração específica por tipo
        const config = {
            crypto: {
                accent: 'crypto',
                mainValue: formatCurrency(asset.price),
                subValue: `Vol: ${formatLargeNumber(asset.volume24h || asset.volume)}`
            },
            fii: {
                accent: 'fii',
                mainValue: formatCurrency(asset.price),
                subValue: `DY: ${formatPercent(asset.yield, 2)}`
            },
            cdb: {
                accent: 'cdb',
                mainValue: `${asset.rate}% CDI`,
                subValue: asset.liquidity
            }
        };
        
        const typeConfig = config[asset.type];
        
        return `
            <div class="card card-asset card-${typeConfig.accent}" data-type="${asset.type}">
                <div class="asset-type-badge badge-${typeConfig.accent}">
                    ${asset.type === 'crypto' ? 'Cripto' : asset.type === 'fii' ? 'FII' : 'Renda Fixa'}
                </div>
                
                <div class="asset-icon-wrapper icon-${typeConfig.accent}">
                    <svg class="icon"><use href="svgs/icons.svg#${asset.icon}"></use></svg>
                </div>
                
                ${isCdb ? `
                    <h3 class="asset-title">${asset.bank}</h3>
                    
                    <div class="asset-main-display cdb-display">
                        <div class="cdb-rate-large">${asset.rate}%</div>
                        <div class="cdb-rate-label">do CDI</div>
                    </div>
                    
                    <div class="asset-details">
                        <div class="detail-row highlight">
                            <span class="detail-label">Rende</span>
                            <span class="detail-value">${formatPercent(asset.yieldAnnual, 2)} a.a.</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Liquidez</span>
                            <span class="detail-value">${asset.liquidity}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Mínimo</span>
                            <span class="detail-value">${formatCurrency(asset.minAmount)}</span>
                        </div>
                    </div>
                ` : `
                    <h3 class="asset-title">${asset.name || asset.bank}</h3>
                    <div class="asset-subtitle">${(asset.symbol || asset.ticker || '').toUpperCase()}</div>
                    
                    <div class="asset-main-display">
                        <div class="asset-price">${typeConfig.mainValue}</div>
                        ${asset.change24h !== undefined ? `
                            <div class="asset-change ${parseFloat(asset.change24h) >= 0 ? 'positive' : 'negative'}">
                                <svg class="icon-change">
                                    <use href="svgs/icons.svg#icon-trending-${parseFloat(asset.change24h) >= 0 ? 'up' : 'down'}"></use>
                                </svg>
                                ${formatPercent(asset.change24h)}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="asset-details">
                        <div class="detail-row">
                            <span class="detail-label">${isCrypto ? 'Volume 24h' : 'Dividend Yield'}</span>
                            <span class="detail-value">${isCrypto ? formatLargeNumber(asset.volume24h || asset.volume) : formatPercent(asset.yield, 2)}</span>
                        </div>
                    </div>
                `}
            </div>
        `;
    }).join('');
}

// Armazenar instâncias dos gráficos
const chartInstances = {
    crypto: null
};

function openAssetModal(type, id) {
    // Implementar modal com detalhes do ativo + mini gráfico
    openModal('Detalhes do Ativo', '<p>Em desenvolvimento...</p>');
}

function renderCharts() {
    renderCryptoChart();
    renderFiisTable();
}

function renderCryptoChart() {
    const canvas = document.getElementById('cryptoChart');
    if (!canvas || state.data.cryptos.length === 0) return;
    
    // Destruir gráfico existente
    if (chartInstances.crypto) {
        chartInstances.crypto.destroy();
        chartInstances.crypto = null;
    }
    
    const ctx = canvas.getContext('2d');
    chartInstances.crypto = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: state.data.cryptos.slice(0, 6).map(c => c.symbol),
            datasets: [{
                label: 'Variação 24h (%)',
                data: state.data.cryptos.slice(0, 6).map(c => c.change24h),
                backgroundColor: state.data.cryptos.slice(0, 6).map(c => 
                    c.change24h >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                )
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderFiisTable() {
    const container = document.getElementById('fiisTable');
    if (!container || state.data.fiis.length === 0) {
        console.log('FIIs Table: container ou dados não disponíveis');
        return;
    }
    
    const fiisData = state.data.fiis.slice(0, 10);
    
    const tableHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: var(--text-dark);">Ticker</th>
                        <th style="padding: 0.75rem; text-align: left; font-weight: 600; color: var(--text-dark);">Nome</th>
                        <th style="padding: 0.75rem; text-align: right; font-weight: 600; color: var(--text-dark);">Dividend Yield</th>
                        <th style="padding: 0.75rem; text-align: right; font-weight: 600; color: var(--text-dark);">Preço</th>
                    </tr>
                </thead>
                <tbody>
                    ${fiisData.map((fii, index) => {
                        const yield_value = parseFloat(fii.yield || fii.dividendYield || 0);
                        const price = fii.price || fii.currentPrice || '-';
                        
                        return `
                            <tr style="border-bottom: 1px solid var(--border-light); transition: background-color 0.2s;">
                                <td style="padding: 0.875rem 0.75rem;">
                                    <span style="font-weight: 600; color: var(--accent-primary);">${fii.ticker}</span>
                                </td>
                                <td style="padding: 0.875rem 0.75rem; color: var(--text-dark);">
                                    ${fii.name || fii.ticker}
                                </td>
                                <td style="padding: 0.875rem 0.75rem; text-align: right;">
                                    <span style="font-weight: 600; color: var(--success);">${yield_value.toFixed(2)}%</span>
                                </td>
                                <td style="padding: 0.875rem 0.75rem; text-align: right; color: var(--text-dark);">
                                    ${typeof price === 'number' ? `R$ ${price.toFixed(2)}` : price}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
    
    // Adicionar hover effect
    const rows = container.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = 'var(--bg-surface)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = 'transparent';
        });
    });
}

function updateLastUpdateTime() {
    const element = document.getElementById('lastUpdate');
    if (element && state.cache.lastUpdate) {
        element.textContent = formatDate(state.cache.lastUpdate);
    }
}

// ===== NOTÍCIAS =====
async function loadNews() {
    showLoading(true);
    
    try {
        const newsRes = await fetchWithCache(`${API_BASE}/news`, 'news', 1800000); // 30min
        console.log('Notícias recebidas:', newsRes);
        state.data.news = newsRes?.news || [];
        console.log('Total de notícias:', state.data.news.length);
        
        // Log das fontes disponíveis
        const sources = [...new Set(state.data.news.map(n => n.source))];
        
        renderNews();
    } catch (error) {
        console.error('Erro ao carregar notícias:', error);
        state.data.news = [];
        renderNews();
    } finally {
        showLoading(false);
    }
}

function renderNews() {
    const grid = document.getElementById('newsGrid');
    if (!grid) return;
    
    if (state.data.news.length === 0) {
        grid.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <svg class="icon" style="width: 64px; height: 64px; margin: 0 auto 1rem; color: var(--text-muted);">
                    <use href="svgs/icons.svg#icon-news"></use>
                </svg>
                <h3 style="color: var(--text-dark); margin-bottom: 0.5rem;">Nenhuma notícia disponível</h3>
                <p style="color: var(--text-muted);">Tente novamente mais tarde.</p>
            </div>
        `;
        return;
    }
    
    // Atualiza os botões de filtro com as fontes disponíveis
    updateNewsSourceButtons();
    
    grid.innerHTML = state.data.news.slice(0, 12).map(article => `
        <div class="card" data-source="${article.source || 'Desconhecido'}">
            ${article.image ? `<img src="${article.image}" alt="${article.title}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 0.5rem 0.5rem 0 0; margin: -1.5rem -1.5rem 1rem;">` : ''}
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <span class="badge badge-info">${article.source || 'Desconhecido'}</span>
                <span style="font-size: 0.75rem; color: var(--text-light);">${getTimeAgo(article.pubDate)}</span>
            </div>
            
            <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-dark); line-height: 1.4;">
                ${article.title}
            </h3>
            
            <p style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 1rem; line-height: 1.6;">
                ${(article.description || '').substring(0, 120)}...
            </p>
            
            <a href="${article.link}" target="_blank" class="btn btn-outline" style="width: 100%;">
                <svg class="icon"><use href="svgs/icons.svg#icon-arrow-right"></use></svg>
                Ler completa
            </a>
        </div>
    `).join('');
}

function updateNewsSourceButtons() {
    // Pega as fontes únicas disponíveis
    const sources = [...new Set(state.data.news.map(n => n.source).filter(Boolean))];
    
    // Encontra o container dos botões
    const buttonContainer = document.querySelector('#page-news .card div[style*="display: flex"]');
    if (!buttonContainer) return;
    
    // Reconstrói os botões com as fontes reais
    buttonContainer.innerHTML = `
        <button class="btn btn-primary" data-source="all">Todas as Fontes</button>
        ${sources.map(source => `
            <button class="btn btn-outline" data-source="${source}">${source}</button>
        `).join('')}
    `;
}

// ===== CALCULADORAS =====
document.getElementById('financingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateFinancing();
});

document.getElementById('investmentForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateInvestment();
});

function calculateFinancing() {
    const value = parseFloat(document.getElementById('finValue').value);
    const annualRate = parseFloat(document.getElementById('finRate').value);
    const months = parseInt(document.getElementById('finMonths').value);
    
    const monthlyRate = annualRate / 12 / 100;
    const installment = value * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const total = installment * months;
    
    document.getElementById('finInstallment').textContent = formatCurrency(installment);
    document.getElementById('finTotal').textContent = formatCurrency(total);
    document.getElementById('finResult').style.display = 'block';
}

function calculateInvestment() {
    const initial = parseFloat(document.getElementById('invInitial').value);
    const monthly = parseFloat(document.getElementById('invMonthly').value);
    const annualRate = parseFloat(document.getElementById('invType').value);
    const years = parseInt(document.getElementById('invYears').value);
    
    const monthlyRate = annualRate / 12 / 100;
    const months = years * 12;
    
    // Fórmula de juros compostos com aportes
    const finalValue = initial * Math.pow(1 + monthlyRate, months) + 
                       monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    
    const invested = initial + (monthly * months);
    const profit = finalValue - invested;
    
    document.getElementById('invFinal').textContent = formatCurrency(finalValue);
    document.getElementById('invInvested').textContent = formatCurrency(invested);
    document.getElementById('invProfit').textContent = formatCurrency(profit);
    document.getElementById('invResult').style.display = 'block';
}

// ===== PERFIL & PROJEÇÕES =====
function renderProfileQuiz() {
    const container = document.getElementById('quizQuestions');
    if (!container || !state.data.educacao) return;
    
    container.innerHTML = state.data.educacao.quiz.map((q, index) => `
        <div class="form-group" style="padding: 1.5rem; background: var(--bg-surface); border-radius: 0.5rem; margin-bottom: 1.5rem;">
            <label class="form-label" style="font-size: 1rem; margin-bottom: 1rem;">
                ${index + 1}. ${q.question}
            </label>
            ${q.options.map((opt, optIndex) => `
                <div style="margin-bottom: 0.75rem;">
                    <label style="display: flex; align-items: center; padding: 0.75rem; border: 2px solid var(--border-color); border-radius: 0.5rem; cursor: pointer; transition: var(--transition);" onmouseover="this.style.borderColor='var(--info)'" onmouseout="this.style.borderColor='var(--border-color)'">
                        <input type="radio" name="${q.id}" value="${optIndex}" required style="margin-right: 0.75rem;">
                        <span style="color: var(--text-dark);">${opt.text}</span>
                    </label>
                </div>
            `).join('')}
        </div>
    `).join('');
}

document.getElementById('quizForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateProfile();
});

function calculateProfile() {
    const scores = { conservador: 0, moderado: 0, agressivo: 0 };
    
    state.data.educacao.quiz.forEach(q => {
        const selected = document.querySelector(`input[name="${q.id}"]:checked`);
        if (selected) {
            const optIndex = parseInt(selected.value);
            const optScore = q.options[optIndex].score;
            scores.conservador += optScore.conservador;
            scores.moderado += optScore.moderado;
            scores.agressivo += optScore.agressivo;
        }
    });
    
    const profileType = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const profile = state.data.educacao.perfis.find(p => p.id === profileType);
    
    state.userProfile = profile;
    showProfileResult(profile);
}

function showProfileResult(profile) {
    document.getElementById('profileQuiz').style.display = 'none';
    document.getElementById('profileResult').style.display = 'block';
    
    document.getElementById('profileName').textContent = profile.name;
    document.getElementById('profileName').style.color = profile.color;
    document.getElementById('profileDescription').textContent = profile.description;
    
    // Gráfico de alocação
    const canvas = document.getElementById('allocationChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(profile.allocation),
                datasets: [{
                    data: Object.values(profile.allocation),
                    backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
    
    // Projeção
    const initial = 10000;
    const years = 10;
    const finalValue = initial * Math.pow(1 + profile.expectedReturn / 100, years);
    
    document.getElementById('projectionValue').textContent = formatCurrency(finalValue);
    document.getElementById('projectionRate').textContent = `${profile.expectedReturn}% a.a.`;
}

function resetProfileQuiz() {
    document.getElementById('profileQuiz').style.display = 'block';
    document.getElementById('profileResult').style.display = 'none';
    document.getElementById('quizForm').reset();
    state.userProfile = null;
}

// ===== PÁGINA COMO COMEÇAR =====
function renderGettingStartedPage() {
    const container = document.getElementById('gettingStartedContent');
    if (!container) return;
    
    container.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto;">
            
            <div class="card" style="margin-bottom: 2rem; padding: 2rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border-left: 4px solid var(--accent-primary);">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    <svg style="width: 32px; height: 32px; color: var(--accent-primary); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="6"/>
                        <circle cx="12" cy="12" r="2"/>
                    </svg>
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-dark); margin: 0;">
                        Por onde começar?
                    </h2>
                </div>
                <p style="font-size: 1rem; line-height: 1.7; color: var(--text-light); margin-bottom: 1rem;">
                    Investir pode parecer complicado no começo, mas com as informações certas e os passos corretos, qualquer pessoa pode começar. 
                    Este guia vai te mostrar exatamente o que fazer para abrir sua conta e fazer seus primeiros investimentos.
                </p>
                <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                    <svg style="width: 20px; height: 20px; min-width: 20px; color: var(--accent-primary); flex-shrink: 0; margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18h6"/>
                        <path d="M10 22h4"/>
                        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8a6 6 0 10-12 0c0 1.36.52 2.5 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
                    </svg>
                    <p style="font-size: 0.9375rem; color: var(--text-muted); font-style: italic; margin: 0;">
                        <strong>Lembre-se:</strong> investir é uma jornada de aprendizado contínuo. Comece aos poucos e vá aumentando seu conhecimento e seus aportes gradualmente.
                    </p>
                </div>
            </div>

            <div class="card" style="margin-bottom: 2rem; padding: 2rem;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="width: 48px; height: 48px; min-width: 48px; background: linear-gradient(135deg, #10B981, #059669); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 1.25rem; font-weight: 700;">1</span>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-dark); margin: 0;">
                        Escolha onde abrir sua conta
                    </h3>
                </div>
                
                <p style="font-size: 1rem; line-height: 1.7; color: var(--text-light); margin-bottom: 1.5rem;">
                    Para investir, você precisa de uma conta em uma <strong>corretora de valores</strong> ou em um <strong>banco digital</strong> que ofereça serviços de investimento. 
                    Estas instituições são regulamentadas pela CVM (Comissão de Valores Mobiliários) e oferecem acesso seguro ao mercado financeiro.
                </p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div style="padding: 1.5rem; background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                            <svg style="width: 24px; height: 24px; color: var(--success); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 21h18"/>
                                <path d="M5 21V7l7-4 7 4v14"/>
                                <path d="M9 9v12"/>
                                <path d="M15 9v12"/>
                            </svg>
                            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--success); margin: 0;">
                                Corretoras Independentes
                            </h4>
                        </div>
                        <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-light); margin-bottom: 1rem;">
                            Instituições especializadas em investimentos com plataformas completas e diversas opções.
                        </p>
                        <ul style="font-size: 0.875rem; color: var(--text-light); line-height: 1.8; margin: 0; padding-left: 1.25rem;">
                            <li>XP Investimentos</li>
                            <li>Rico (XP)</li>
                            <li>Clear (XP)</li>
                            <li>BTG Pactual Digital</li>
                            <li>Órama</li>
                            <li>Genial Investimentos</li>
                        </ul>
                    </div>

                    <div style="padding: 1.5rem; background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                            <svg style="width: 24px; height: 24px; color: var(--info); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                <line x1="1" y1="10" x2="23" y2="10"/>
                            </svg>
                            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--info); margin: 0;">
                                Bancos Digitais
                            </h4>
                        </div>
                        <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-light); margin-bottom: 1rem;">
                            Bancos modernos que já oferecem serviços de investimento integrados à conta corrente.
                        </p>
                        <ul style="font-size: 0.875rem; color: var(--text-light); line-height: 1.8; margin: 0; padding-left: 1.25rem;">
                            <li>Nubank</li>
                            <li>Inter</li>
                            <li>C6 Bank</li>
                            <li>PagBank (PagSeguro)</li>
                            <li>Mercado Pago</li>
                        </ul>
                    </div>
                </div>

                <div style="padding: 1.25rem; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border-left: 4px solid var(--info); display: flex; gap: 0.75rem;">
                    <svg style="width: 20px; height: 20px; min-width: 20px; color: var(--info); flex-shrink: 0; margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18h6"/>
                        <path d="M10 22h4"/>
                        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8a6 6 0 10-12 0c0 1.36.52 2.5 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
                    </svg>
                    <p style="font-size: 0.9375rem; color: var(--text-dark); margin: 0; line-height: 1.6;">
                        <strong>Dica:</strong> Escolha uma instituição com baixas taxas, plataforma fácil de usar e bom atendimento. 
                        Muitas corretoras não cobram taxa de corretagem para investimentos em renda fixa e têm custo zero para manter a conta.
                    </p>
                </div>
            </div>

            <div class="card" style="margin-bottom: 2rem; padding: 2rem;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="width: 48px; height: 48px; min-width: 48px; background: linear-gradient(135deg, #3B82F6, #2563EB); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 1.25rem; font-weight: 700;">2</span>
                    </div>
                    <h3 style="font-size: 1.375rem; font-weight: 700; color: var(--text-dark); margin: 0;">
                        Documentos necessários
                    </h3>
                </div>

                <p style="font-size: 1rem; line-height: 1.7; color: var(--text-light); margin-bottom: 1.5rem;">
                    Para abrir sua conta, você vai precisar de alguns documentos básicos. O processo todo é feito online e leva cerca de 10 a 15 minutos.
                </p>

                <div style="display: grid; gap: 1rem;">
                    <div style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="width: 24px; height: 24px; min-width: 24px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="color: white; font-size: 12px; font-weight: 700;">✓</span>
                        </div>
                        <div>
                            <strong style="color: var(--text-dark); display: block; margin-bottom: 0.25rem;">CPF</strong>
                            <span style="font-size: 0.875rem; color: var(--text-light);">Seu número de CPF (obrigatório para identificação)</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="width: 24px; height: 24px; min-width: 24px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="color: white; font-size: 12px; font-weight: 700;">✓</span>
                        </div>
                        <div>
                            <strong style="color: var(--text-dark); display: block; margin-bottom: 0.25rem;">RG ou CNH</strong>
                            <span style="font-size: 0.875rem; color: var(--text-light);">Documento de identificação com foto (frente e verso)</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="width: 24px; height: 24px; min-width: 24px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="color: white; font-size: 12px; font-weight: 700;">✓</span>
                        </div>
                        <div>
                            <strong style="color: var(--text-dark); display: block; margin-bottom: 0.25rem;">Comprovante de Residência</strong>
                            <span style="font-size: 0.875rem; color: var(--text-light);">Conta de luz, água, telefone ou internet (últimos 3 meses)</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="width: 24px; height: 24px; min-width: 24px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="color: white; font-size: 12px; font-weight: 700;">✓</span>
                        </div>
                        <div>
                            <strong style="color: var(--text-dark); display: block; margin-bottom: 0.25rem;">Foto ou Selfie</strong>
                            <span style="font-size: 0.875rem; color: var(--text-light);">Para validação de identidade (tirada na hora pelo celular)</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="width: 24px; height: 24px; min-width: 24px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="color: white; font-size: 12px; font-weight: 700;">✓</span>
                        </div>
                        <div>
                            <strong style="color: var(--text-dark); display: block; margin-bottom: 0.25rem;">Dados bancários</strong>
                            <span style="font-size: 0.875rem; color: var(--text-light);">Número da sua conta corrente para transferências</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 2rem; padding: 2rem;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="width: 48px; height: 48px; min-width: 48px; background: linear-gradient(135deg, #F59E0B, #D97706); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 1.25rem; font-weight: 700;">3</span>
                    </div>
                    <h3 style="font-size: 1.375rem; font-weight: 700; color: var(--text-dark); margin: 0;">
                        Passo a passo para abrir sua conta
                    </h3>
                </div>

                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div style="display: flex; gap: 1rem;">
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--accent-primary); line-height: 1;">1.</div>
                        <div>
                            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.5rem;">Acesse o site ou app da instituição escolhida</h4>
                            <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-light); margin: 0;">
                                Baixe o aplicativo na loja do seu celular (Google Play ou App Store) ou acesse o site oficial. 
                                Procure pela opção "Abrir conta", "Cadastre-se" ou "Começar a investir".
                            </p>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--accent-primary); line-height: 1;">2.</div>
                        <div>
                            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.5rem;">Preencha seus dados pessoais</h4>
                            <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-light); margin: 0;">
                                Informe nome completo, CPF, data de nascimento, telefone e e-mail. 
                                Crie uma senha forte (use letras, números e símbolos).
                            </p>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--accent-primary); line-height: 1;">3.</div>
                        <div>
                            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.5rem;">Envie os documentos</h4>
                            <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-light); margin: 0;">
                                Tire fotos claras dos seus documentos ou faça upload das imagens. 
                                Geralmente você também precisará tirar uma selfie segurando o documento.
                            </p>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--accent-primary); line-height: 1;">4.</div>
                        <div>
                            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.5rem;">Responda ao perfil de investidor</h4>
                            <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-light); margin: 0;">
                                Você responderá um questionário (API - Análise de Perfil de Investidor) que ajuda a identificar 
                                se você é conservador, moderado ou arrojado. Seja honesto nas respostas!
                            </p>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--accent-primary); line-height: 1;">5.</div>
                        <div>
                            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.5rem;">Aguarde a aprovação</h4>
                            <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-light); margin: 0;">
                                A análise dos documentos costuma levar de algumas horas até 2 dias úteis. 
                                Você receberá um e-mail ou notificação quando sua conta estiver aprovada.
                            </p>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--accent-primary); line-height: 1;">6.</div>
                        <div>
                            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.5rem;">Transfira dinheiro e comece a investir</h4>
                            <p style="font-size: 0.9375rem; line-height: 1.6; color: var(--text-light); margin: 0;">
                                Faça uma transferência (TED ou PIX) da sua conta bancária para a corretora. 
                                Quando o dinheiro cair (geralmente no mesmo dia), você já pode começar a investir!
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 2rem; padding: 2rem;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="width: 48px; height: 48px; min-width: 48px; background: linear-gradient(135deg, #8B5CF6, #7C3AED); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 1.25rem; font-weight: 700;">4</span>
                    </div>
                    <h3 style="font-size: 1.375rem; font-weight: 700; color: var(--text-dark); margin: 0;">
                        Fazendo seu primeiro investimento
                    </h3>
                </div>

                <p style="font-size: 1rem; line-height: 1.7; color: var(--text-light); margin-bottom: 1.5rem;">
                    Com a conta aprovada e o dinheiro disponível, está na hora de fazer seu primeiro investimento. Aqui vai uma dica de ouro:
                </p>

                <div style="padding: 1.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15)); border-radius: 12px; border: 2px solid rgba(16, 185, 129, 0.3); margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <svg style="width: 24px; height: 24px; color: var(--success); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                        </svg>
                        <h4 style="font-size: 1.125rem; font-weight: 700; color: var(--success); margin: 0;">
                            Recomendação para iniciantes
                        </h4>
                    </div>
                    <p style="font-size: 0.9375rem; line-height: 1.7; color: var(--text-dark); margin-bottom: 1rem;">
                        Comece com investimentos de <strong>renda fixa e baixo risco</strong>, como:
                    </p>
                    <ul style="font-size: 0.9375rem; line-height: 1.8; color: var(--text-dark); margin: 0 0 1rem 1.25rem;">
                        <li><strong>Tesouro Selic:</strong> Liquidez diária, pode resgatar quando quiser</li>
                        <li><strong>CDB de liquidez diária:</strong> Rentabilidade acima da poupança</li>
                        <li><strong>Fundos DI:</strong> Gestão profissional com baixo risco</li>
                    </ul>
                    <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0; font-style: italic;">
                        Esses investimentos são seguros, fáceis de entender e permitem que você se familiarize com a plataforma sem correr grandes riscos.
                    </p>
                </div>

                <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--text-dark); margin-bottom: 1rem;">
                    Como fazer o investimento na prática:
                </h4>

                <ol style="font-size: 0.9375rem; line-height: 1.8; color: var(--text-light); margin: 0 0 0 1.5rem; padding: 0;">
                    <li style="margin-bottom: 0.75rem;">Acesse a área de investimentos no app ou site</li>
                    <li style="margin-bottom: 0.75rem;">Procure por "Renda Fixa" ou "Tesouro Direto"</li>
                    <li style="margin-bottom: 0.75rem;">Escolha o investimento (ex: Tesouro Selic 2029)</li>
                    <li style="margin-bottom: 0.75rem;">Digite o valor que deseja investir</li>
                    <li style="margin-bottom: 0.75rem;">Confirme a operação com sua senha</li>
                    <li>Pronto! Seu investimento estará ativo em alguns instantes</li>
                </ol>
            </div>

            <div class="card" style="margin-bottom: 2rem; padding: 2rem; background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1)); border-left: 4px solid var(--danger);">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <svg style="width: 28px; height: 28px; color: var(--danger); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--danger); margin: 0;">
                        Dicas importantes de segurança
                    </h3>
                </div>
                <ul style="font-size: 0.9375rem; line-height: 1.8; color: var(--text-dark); margin: 0; padding-left: 1.5rem;">
                    <li><strong>Nunca compartilhe sua senha</strong> com ninguém, nem mesmo com funcionários da corretora</li>
                    <li><strong>Ative a autenticação em duas etapas</strong> (2FA) para maior segurança</li>
                    <li><strong>Cuidado com promessas de retorno garantido:</strong> se parece bom demais, provavelmente é golpe</li>
                    <li><strong>Não invista dinheiro que você vai precisar no curto prazo</strong> - tenha uma reserva de emergência primeiro</li>
                    <li><strong>Diversifique:</strong> não coloque todo seu dinheiro em um único investimento</li>
                    <li><strong>Estude antes de investir:</strong> entenda onde está colocando seu dinheiro</li>
                </ul>
            </div>

            <div class="card" style="padding: 2rem; text-align: center; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));">
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-dark); margin: 0;">
                        Pronto para começar?
                    </h3>
                    <svg style="width: 28px; height: 28px; color: var(--accent-primary); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/>
                        <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/>
                        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                    </svg>
                </div>
                <p style="font-size: 1rem; line-height: 1.7; color: var(--text-light); margin-bottom: 1.5rem;">
                    Agora que você já sabe como abrir sua conta e fazer seus primeiros investimentos, 
                    explore nossa seção de <strong>Educação Financeira</strong> para entender melhor cada tipo de investimento 
                    e descubra seu <strong>Perfil de Investidor</strong> com nosso questionário!
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="navigateToPage('home')" style="display: flex; align-items: center; gap: 0.5rem;">
                        <svg class="icon" style="width: 20px; height: 20px;">
                            <use href="svgs/icons.svg#icon-book"></use>
                        </svg>
                        Ir para Educação
                    </button>
                    <button class="btn btn-outline" onclick="navigateToPage('profile')" style="display: flex; align-items: center; gap: 0.5rem;">
                        <svg class="icon" style="width: 20px; height: 20px;">
                            <use href="svgs/icons.svg#icon-user"></use>
                        </svg>
                        Descobrir meu Perfil
                    </button>
                </div>
            </div>

        </div>
    `;
}

// ===== MODAL DE RECOMENDAÇÕES =====
function openRecommendationsModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const modal = document.getElementById('welcomeModal');
    modal.classList.add('active');
    
    // Recarrega recomendações
    loadRecommendations();
}

async function showWelcomeModal() {
    // Verifica se usuário já viu o modal
    const dontShow = localStorage.getItem('dontShowRecommendations');
    if (dontShow === 'true') return;
    
    // Aguarda um pouco para não ser intrusivo
    setTimeout(async () => {
        openRecommendationsModal();
    }, 1000);
}

function closeWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    modal.classList.remove('active');
    
    // Salva preferência se marcado
    const dontShow = document.getElementById('dontShowAgain').checked;
    if (dontShow) {
        localStorage.setItem('dontShowRecommendations', 'true');
    }
    
    // Retorna para a página home (educação) apenas se não estiver nela
    if (state.currentPage !== 'home') {
        navigateToPage('home');
    }
}

async function loadRecommendations() {
    try {
        // Carrega dados reais das APIs
        const [cryptoRes, fiiRes, cdbRes] = await Promise.all([
            fetchWithCache(`${API_BASE}/crypto`, 'crypto', 600000).catch(() => ({ cryptos: [] })),
            fetchWithCache(`${API_BASE}/fiis`, 'fiis', 21600000).catch(() => ({ fiis: [] })),
            fetchWithCache(`${API_BASE}/cdb`, 'cdb', 7200000).catch(() => ({ cdbs: [], benchmark: {} }))
        ]);
        
        const cryptos = cryptoRes?.cryptos || [];
        const fiis = fiiRes?.fiis || [];
        const cdbs = cdbRes?.cdbs || [];
        const benchmark = cdbRes?.benchmark || { cdi: 11.75, selic: 11.75 };
        
        // Seleciona melhores opções por risco
        const recommendations = {
            muitoBaixo: {
                title: 'Risco Muito Baixo',
                color: '#10B981',
                icon: 'icon-treasure',
                options: [
                    {
                        name: 'Tesouro Selic',
                        return: `${benchmark.selic}% a.a.`,
                        description: 'Liquidez diária, sem risco de perda',
                        tag: 'Mais Seguro'
                    },
                    cdbs[0] ? {
                        name: `${cdbs[0].bank} - CDB ${cdbs[0].rate}% CDI`,
                        return: `${cdbs[0].yieldAnnual}% a.a.`,
                        description: `FGC até R$ 250 mil, ${cdbs[0].liquidity}`,
                        tag: 'Protegido'
                    } : null
                ].filter(Boolean)
            },
            baixo: {
                title: 'Risco Baixo',
                color: '#3B82F6',
                icon: 'icon-money',
                options: [
                    cdbs[1] ? {
                        name: `${cdbs[1].bank} - CDB ${cdbs[1].rate}% CDI`,
                        return: `${cdbs[1].yieldAnnual}% a.a.`,
                        description: `FGC até R$ 250 mil, ${cdbs[1].liquidity}`,
                        tag: 'Rendendo'
                    } : null,
                    {
                        name: 'Tesouro IPCA+',
                        return: 'IPCA + 6% a.a.',
                        description: 'Protege da inflação no longo prazo',
                        tag: 'Aposentadoria'
                    }
                ].filter(Boolean)
            },
            moderado: {
                title: 'Risco Moderado',
                color: '#F59E0B',
                icon: 'icon-building',
                options: [
                    fiis[0] ? {
                        name: fiis[0].name,
                        return: `${formatPercent(fiis[0].yield, 2)} a.a. DY`,
                        description: 'Renda mensal com dividendos',
                        tag: 'Renda Passiva'
                    } : null,
                    fiis[1] ? {
                        name: fiis[1].name,
                        return: `${formatPercent(fiis[1].yield, 2)} a.a. DY`,
                        description: 'Fundos imobiliários diversificados',
                        tag: 'Diversificação'
                    } : null
                ].filter(Boolean)
            },
            alto: {
                title: 'Risco Alto',
                color: '#EF4444',
                icon: 'icon-crypto',
                options: [
                    cryptos[0] ? {
                        name: cryptos[0].name,
                        return: `${formatPercent(cryptos[0].change24h)} últimas 24h`,
                        description: 'Alta volatilidade, potencial de crescimento',
                        tag: 'Volátil'
                    } : null,
                    cryptos[1] ? {
                        name: cryptos[1].name,
                        return: `${formatPercent(cryptos[1].change24h)} últimas 24h`,
                        description: 'Tecnologia blockchain estabelecida',
                        tag: 'Criptomoeda'
                    } : null
                ].filter(Boolean)
            }
        };
        
        renderRecommendations(recommendations);
        
    } catch (error) {
        console.error('Erro ao carregar recomendações:', error);
        document.getElementById('recommendationsBody').innerHTML = `
            <p style="text-align: center; color: var(--text-muted);">
                Não foi possível carregar as recomendações. Por favor, tente novamente mais tarde.
            </p>
        `;
    }
}

function renderRecommendations(recs) {
    const body = document.getElementById('recommendationsBody');
    
    body.innerHTML = `
        <div style="margin-bottom: 1.5rem; text-align: center;">
            <p style="font-size: 0.9375rem; color: var(--text-light); line-height: 1.6;">
                Aqui estão sugestões baseadas em dados reais do mercado hoje (${new Date().toLocaleDateString('pt-BR')}). 
                Escolha de acordo com seu perfil de risco e objetivos financeiros.
            </p>
        </div>
        
        <div style="display: grid; gap: 1.5rem;">
            ${Object.entries(recs).map(([key, risk]) => `
                <div style="border: 2px solid ${risk.color}; border-radius: 12px; padding: 1.5rem; background: linear-gradient(135deg, ${risk.color}10 0%, transparent 100%);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="width: 40px; height: 40px; background: ${risk.color}; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <svg class="icon" style="width: 24px; height: 24px; color: white;">
                                <use href="svgs/icons.svg#${risk.icon}"></use>
                            </svg>
                        </div>
                        <h4 style="font-family: 'Poppins', sans-serif; font-size: 1.125rem; font-weight: 700; color: ${risk.color}; margin: 0;">
                            ${risk.title}
                        </h4>
                    </div>
                    
                    <div style="display: grid; gap: 1rem;">
                        ${risk.options.map(opt => `
                            <div style="background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 700; color: var(--text-dark); margin-bottom: 0.25rem;">${opt.name}</div>
                                        <div style="font-size: 0.8125rem; color: var(--text-muted);">${opt.description}</div>
                                    </div>
                                    <span style="background: ${risk.color}20; color: ${risk.color}; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; margin-left: 0.5rem;">
                                        ${opt.tag}
                                    </span>
                                </div>
                                <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.9375rem; font-weight: 700; color: ${risk.color};">
                                    📈 ${opt.return}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top: 1.5rem; padding: 1.25rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%); border-radius: 12px; border-left: 4px solid var(--accent-primary);">
            <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <div style="width: 24px; height: 24px; min-width: 24px; background: var(--accent-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="color: white; font-size: 14px; font-weight: 700; line-height: 1;">i</span>
                </div>
                <div>
                    <strong style="color: var(--text-dark); display: block; margin-bottom: 0.25rem; font-size: 0.9375rem;">Importante:</strong>
                    <p style="font-size: 0.875rem; color: var(--text-light); margin: 0; line-height: 1.6;">
                        Rentabilidade passada não garante retornos futuros. Diversifique seus investimentos e invista apenas o que pode perder. 
                        Explore a seção <strong>Educação Financeira</strong> para entender melhor cada opção.
                    </p>
                </div>
            </div>
        </div>
    `;
}
