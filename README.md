# 🚀 rafaInvest - Dashboard Educacional de Investimentos

Plataforma educacional interativa para aprender sobre investimentos com dados reais do mercado brasileiro: Criptomoedas, FIIs, CDBs, Tesouro Direto e mais.

## ✨ Funcionalidades

### 🎓 Educação Financeira
- **6 Modalidades de Investimento**: CDB, FII, Tesouro Direto, Criptomoedas, Ações, Consórcio
- **Perfis de Investidor**: Conservador, Moderado, Arrojado com questionário interativo
- **Recomendações Inteligentes**: Sugestões personalizadas por nível de risco (Muito Baixo, Baixo, Moderado, Alto)
- **Conteúdo Didático**: Explicações claras sobre cada tipo de investimento

### 📊 Dados em Tempo Real
- **Criptomoedas**: Top 12 via CoinGecko API
- **FIIs**: Cotações B3 via brapi.dev (KNRI11, HGLG11, etc)
- **CDBs**: Taxas CDI/SELIC reais + simulação de 12 bancos
- **Notícias**: RSS de InfoMoney, Valor Econômico, UOL Economia
- **Benchmarks**: CDI 11.75%, SELIC 11.75%, IPCA 4.5%

### 🎨 Interface Profissional
- **Design System Moderno**: Poppins, Inter, JetBrains Mono
- **Responsivo**: Mobile-first, otimizado para todos os dispositivos
- **Dark Theme**: Interface confortável para leitura prolongada
- **Animações Suaves**: Transições e hover effects profissionais

### 🧮 Calculadoras
- **Financiamento**: Simule parcelas de imóveis e veículos
- **Investimento**: Projete rendimentos com juros compostos

## 📁 Estrutura do Projeto

```
rafaInvest/
├── netlify/
│   └── functions/
│       ├── crypto.js      # API CoinGecko
│       ├── fiis.js        # API brapi.dev FIIs
│       ├── cdb.js         # Simulação CDBs + taxas
│       └── news.js        # RSS agregador de notícias
├── public/
│   ├── index.html         # SPA structure
│   ├── app.js             # Lógica principal
│   ├── style.css          # Design system
│   └── svgs/
│       └── icons.svg      # Sprite de ícones
├── package.json
├── netlify.toml
└── server-test.js         # Servidor local
```
└── README.md
```

## 🚀 Como Usar

### Instalação

```bash
# Clone o projeto
cd rafaInvest

# Instale dependências
npm install
```

### Desenvolvimento Local

```bash
# Servidor com Netlify Functions
npm start

# Acesse: http://localhost:3000
```

### Deploy

#### Deploy Rápido no Netlify

1. Crie conta em [netlify.com](https://netlify.com)
2. Conecte seu repositório GitHub
3. Configure:
   - Build command: (vazio - static site)
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. Deploy automático!
BRAPI_API_KEY=d6EkPxHiKsswXcbwg6wzzf
```

**Setup Netlify (produção):**
1. Netlify Dashboard → Site Settings → Environment Variables
2. Adicione: `BRAPI_API_KEY` = `d6EkPxHiKsswXcbwg6wzzf`

**Limites com API key:**
- Sem key: 15 req/min (gratuito)
- Com key: 200+ req/min (dependendo do plano)
- Obtenha sua key: https://brapi.dev/dashboard

### CORS (Se necessário)
As functions já incluem headers CORS. Se usar domínio customizado, confirme origins em:
- [crypto.js](netlify/functions/crypto.js#L8)
- [fiis.js](netlify/functions/fiis.js#L31)
- [cdb.js](netlify/functions/cdb.js#L21)

## 🛠️ Customização

### Ajustar Ativos Exibidos
Em [app.js](public/app.js#L72-L77):
```javascript
const allAssets = [
    ...state.cryptos.slice(0, 6), // Aumentar para 6 cryptos
    ...state.fiis.slice(0, 3),     // Reduzir para 3 FIIs
    ...state.cdbs.slice(0, 3)      // Reduzir para 3 CDBs
];
```

### Alterar Intervalo de Refresh
Em [app.js](public/app.js#L342):
```javascript
refreshInterval = setInterval(() => {
    // ...
}, 30000); // 30 segundos (padrão: 60000)
```

### Cores Neon
Em [style.css](public/style.css#L5-L15) ou Tailwind config em [index.html](public/index.html#L23-L36):
```javascript
colors: {
    neon: {
        blue: '#00f0ff',    // Azul neon
        pink: '#ff00ea',    // Rosa neon
        purple: '#bf00ff',  // Roxo neon
        green: '#00ff88',   // Verde neon
        yellow: '#ffea00'   // Amarelo neon
    }
}
```

### Adicionar Watchlist
LocalStorage já configurado. Para implementar UI:

1. Adicione botão "⭐" nos cards:
```html
<button onclick="toggleWatchlist('${asset.id}')">
    <i class="fas fa-star"></i>
</button>


## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3 (Custom Design System), JavaScript Vanilla
- **Fontes**: Google Fonts (Poppins, Inter, JetBrains Mono)
- **APIs**: CoinGecko, brapi.dev
- **Backend**: Netlify Functions (Serverless)
- **Charts**: Chart.js 4.4.1
- **Deployment**: Netlify

## 📝 Licença

MIT License - use livremente para projetos pessoais e educacionais.

## 🤝 Contribuindo

Melhorias são bem-vindas! Abra issues ou pull requests.

---

**Desenvolvido com 💜 para educação financeira**

## 🐛 Troubleshooting

### Functions não carregam no Netlify Dev
```bash
# Verifique instalação do CLI
netlify --version

# Reinstale se necessário
npm install -g netlify-cli@latest

# Limpe cache
rm -rf .netlify


## ⚠️ Aviso Legal

**Este é um projeto educacional**. As informações não constituem aconselhamento financeiro. Sempre consulte um profissional certificado antes de investir.

Os dados são fornecidos por APIs de terceiros (CoinGecko, brapi.dev) e podem conter atrasos ou imprecisões.
