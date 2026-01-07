const axios = require('axios');
const https = require('https');
const Parser = require('rss-parser');

const httpsAgent = new https.Agent({ 
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 15000
});

const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure', 'content:encoded']
  },
  requestOptions: {
    httpsAgent: httpsAgent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }
});

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora - notícias reais

// Usando API brapi.dev para notícias (melhor para redes corporativas)
const BRAPI_API_KEY = process.env.BRAPI_API_KEY || 'd6EkPxHiKsswXcbwg6wzzf';

// Função para buscar notícias via brapi.dev
async function fetchNewsFromBrapi() {
  try {
    const response = await axios.get('https://brapi.dev/api/news', {
      params: {
        limit: 15
      },
      timeout: 10000,
      httpsAgent: httpsAgent,
      headers: {
        'Authorization': `Bearer ${BRAPI_API_KEY}`,
        'User-Agent': 'rafaInvest/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.results) {
      return response.data.results.map(item => ({
        title: item.title,
        description: item.text || item.summary || '',
        link: item.link || item.url,
        pubDate: item.date || new Date().toISOString(),
        source: item.source || 'Mercado',
        category: 'geral',
        image: item.image || null
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching brapi news:', error.message);
    return [];
  }
}

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
    
    // Retorna cache se válido
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cache.data, cached: true })
      };
    }

    // Busca notícias via brapi.dev (funciona melhor em redes corporativas)
    let allNews = await fetchNewsFromBrapi();
    
    // Se não conseguiu buscar, usa múltiplas fontes RSS
    if (allNews.length === 0) {
      console.log('brapi.dev não retornou resultados, usando RSS feeds');
      
      // Array de feeds RSS para tentar
      const rssFeeds = [
        { url: 'https://www.infomoney.com.br/feed/', source: 'InfoMoney' },
        { url: 'https://valor.globo.com/rss/home', source: 'Valor Econômico' },
        { url: 'https://economia.uol.com.br/index.xml', source: 'UOL Economia' }
      ];
      
      // Tenta buscar de cada feed
      for (const feed of rssFeeds) {
        try {
          const rss = await parser.parseURL(feed.url);
          const feedNews = rss.items.slice(0, 8).map(item => ({
            title: item.title,
            description: item.contentSnippet || item.description || item.summary || '',
            link: item.link,
            pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
            source: feed.source,
            category: 'geral',
            image: item.enclosure?.url || item['media:thumbnail']?.$ || null
          }));
          allNews.push(...feedNews);
          console.log(`RSS ${feed.source}: ${feedNews.length} notícias`);
        } catch (rssError) {
          console.error(`Erro ao buscar RSS ${feed.source}:`, rssError.message);
        }
      }
    }

    // Ordena por data (mais recentes primeiro)
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const topNews = allNews;

    const result = {
      news: topNews,
      total: topNews.length,
      timestamp: new Date().toISOString(),
      source: 'brapi.dev + InfoMoney RSS'
    };

    // Atualiza cache
    cache = { data: result, timestamp: now };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('News API Error:', error.message);
    
    // Retorna cache antigo em caso de erro
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
        error: 'Failed to fetch news',
        message: error.message,
        news: []
      })
    };
  }
};
