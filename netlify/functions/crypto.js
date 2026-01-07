const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ 
  rejectUnauthorized: false,
  keepAlive: true
});

// Cache simples em memória
let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos - dados reais

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const now = Date.now();
    
    // Retorna cache se válido
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cache.data, cached: true })
      };
    }

    // Busca top cryptos via CoinGecko
    // Alternativa: brapi.dev também tem cryptos: https://brapi.dev/api/v2/crypto
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'volume_desc',
        per_page: 20,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h'
      },
      timeout: 10000,
      httpsAgent: httpsAgent,
      headers: {
        'User-Agent': 'rafaInvest/1.0',
        'Accept': 'application/json'
      }
    });

    // Filtra e ordena por variação 24h
    const topByChange = response.data
      .sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h))
      .slice(0, 12)
      .map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        volume24h: coin.total_volume,
        marketCap: coin.market_cap,
        image: coin.image,
        lastUpdate: new Date().toISOString()
      }));

    const result = {
      cryptos: topByChange,
      timestamp: new Date().toISOString()
    };

    // Atualiza cache
    cache = { data: result, timestamp: now };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Crypto API Error:', error.message);
    
    // Retorna cache antigo em caso de erro, se existir
    if (cache.data) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cache.data, error: 'Using cached data', cached: true })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch crypto data',
        message: error.message,
        cryptos: [] // Fallback vazio
      })
    };
  }
};
