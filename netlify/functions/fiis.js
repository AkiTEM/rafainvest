const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ 
  rejectUnauthorized: false,
  keepAlive: true
});

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 horas - evita rate limit 429

// Top FIIs para buscar na brapi.dev
const TOP_FIIS = [
  'KNRI11', 'HGLG11', 'VISC11', 'MXRF11', 'XPML11', 'BTLG11',
  'KNCR11', 'ALZR11', 'VILG11', 'RBRR11', 'GGRC11', 'HSML11'
];

// Mock data apenas para fallback extremo
const MOCK_FIIS = [
  { ticker: 'KNRI11', name: 'Kinea Renda Imobiliária FII', price: 98.50, change24h: 1.2, yield: 0.85 },
  { ticker: 'HGLG11', name: 'CSHG Logística FII', price: 165.30, change24h: -0.5, yield: 0.78 },
  { ticker: 'VISC11', name: 'Vinci Shopping Centers FII', price: 107.20, change24h: 0.8, yield: 0.92 },
  { ticker: 'MXRF11', name: 'Maxi Renda FII', price: 10.15, change24h: 0.3, yield: 0.88 },
  { ticker: 'XPML11', name: 'XP Malls FII', price: 104.80, change24h: 1.5, yield: 0.95 },
  { ticker: 'BTLG11', name: 'BTG Pactual Logística FII', price: 112.40, change24h: -0.2, yield: 0.82 }
];

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const now = Date.now();
    
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cache.data, cached: true })
      };
    }

    // Busca FIIs via brapi.dev (Plano gratuito: 1 ticker por requisição)
    let fiisData = [];
    
    try {
      const apiKey = process.env.BRAPI_API_KEY || 'd6EkPxHiKsswXcbwg6wzzf';
      
      // Busca apenas os 6 primeiros FIIs (plano gratuito: 1 por vez)
      // Reduzido para evitar muitas requisições
      const fiisToFetch = TOP_FIIS.slice(0, 6);
      
      for (const ticker of fiisToFetch) {
        try {
          const response = await axios.get(`https://brapi.dev/api/quote/${ticker}`, {
            params: {
              range: '1d',
              fundamental: true
            },
            timeout: 10000,
            httpsAgent: httpsAgent,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'User-Agent': 'rafaInvest/1.0',
              'Accept': 'application/json'
            }
          });
          
          if (response.data && response.data.results && response.data.results[0]) {
            const fii = response.data.results[0];
            const dividendYield = fii.dividendsData?.yield || 0.85;
            
            fiisData.push({
              ticker: fii.symbol,
              name: fii.longName || fii.shortName || fii.symbol,
              price: fii.regularMarketPrice?.toFixed(2) || '0.00',
              change24h: fii.regularMarketChangePercent?.toFixed(2) || '0.00',
              yield: (dividendYield).toFixed(2),
              volume: fii.regularMarketVolume || 0,
              lastUpdate: new Date().toISOString()
            });
          }
          
          // Delay de 300ms entre requisições (evita rate limit)
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (tickerError) {
          console.log(`Error fetching ${ticker}:`, tickerError.message);
          // Continua com próximo ticker
        }
      }
      
      // Se retornou poucos ou nenhum, usa mock
      if (fiisData.length === 0) {
        throw new Error('No data returned from brapi.dev');
      }
      
    } catch (apiError) {
      console.log('brapi.dev error, using mock FII data:', apiError.message);
      // Fallback para mock data
      fiisData = MOCK_FIIS.map(fii => ({
        ...fii,
        price: (fii.price * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2),
        change24h: (fii.change24h + (Math.random() - 0.5) * 0.5).toFixed(2)
      }));
    }

    const result = {
      fiis: fiisData.slice(0, 12).map(fii => ({
        ticker: fii.ticker,
        name: fii.name,
        price: typeof fii.price === 'number' ? fii.price.toFixed(2) : fii.price,
        change24h: typeof fii.change24h === 'number' ? fii.change24h.toFixed(2) : fii.change24h,
        yield: typeof fii.yield === 'number' ? fii.yield.toFixed(2) : fii.yield,
        volume: fii.volume || 0,
        lastUpdate: fii.lastUpdate || new Date().toISOString()
      })),
      timestamp: new Date().toISOString(),
      source: fiisData.length > 0 && fiisData[0].lastUpdate ? 'brapi.dev' : 'mock'
    };

    cache = { data: result, timestamp: now };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('FIIs API Error:', error.message);
    
    if (cache.data) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cache.data, error: 'Using cached data', cached: true })
      };
    }

    // Fallback final para mock
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        fiis: MOCK_FIIS.slice(0, 12).map(fii => ({
          ...fii,
          price: fii.price.toFixed(2),
          change24h: fii.change24h.toFixed(2),
          yield: (fii.yield * 100).toFixed(2)
        })),
        timestamp: new Date().toISOString(),
        source: 'mock',
        error: 'API unavailable'
      })
    };
  }
};
