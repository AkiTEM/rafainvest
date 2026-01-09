const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ 
  rejectUnauthorized: false,
  keepAlive: true
});

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas - dados do BCB mudam raramente

// ===== ÚLTIMA ATUALIZAÇÃO MANUAL =====
// Data da última atualização das taxas de CDB
const LAST_MANUAL_UPDATE = '2026-01-09'; // Formato: YYYY-MM-DD

// COMO ATUALIZAR TAXAS DE CDB (via variáveis de ambiente ou código):
// 1. Opção A - Variáveis de Ambiente no Netlify (SEM REDEPLOY):
//    Configure no painel: Site Settings > Environment Variables
//    - CDB_RATES_JSON (JSON com array de CDBs)
// 2. Opção B - Editar código abaixo e fazer deploy
//    Consulte sites das corretoras:
//    - XP: https://www.xpi.com.br/investimentos/renda-fixa/cdb/
//    - Inter: https://www.inter.co/investimentos/renda-fixa
//    - Nubank: https://nubank.com.br/investimentos/
//    - BTG: https://www.btgpactualdigital.com/renda-fixa/cdb
//    - C6: https://www.c6bank.com.br/investimentos/
// 3. CDI/SELIC são buscados automaticamente da API do Banco Central!

// Mock CDBs de bancos populares (excluindo bancos com problemas regulatórios)
// Formato do rate: percentual do CDI (ex: 115 = 115% do CDI)
const MOCK_CDBS = [
  { bank: 'XP Investimentos', rate: 115, minAmount: 1000, liquidity: 'D+0' },
  { bank: 'Inter', rate: 112, minAmount: 100, liquidity: 'D+0' },
  { bank: 'Nubank', rate: 109, minAmount: 1, liquidity: 'D+0' },
  { bank: 'C6 Bank', rate: 113, minAmount: 500, liquidity: 'D+0' },
  { bank: 'BTG Pactual', rate: 116, minAmount: 5000, liquidity: 'D+1' },
  { bank: 'Sofisa Direto', rate: 117, minAmount: 1000, liquidity: 'D+30' },
  { bank: 'PagBank', rate: 110, minAmount: 1, liquidity: 'D+0' },
  { bank: 'Banco Bradesco', rate: 105, minAmount: 5000, liquidity: 'D+0' },
  { bank: 'Banco Itaú', rate: 104, minAmount: 5000, liquidity: 'D+0' },
  { bank: 'Santander', rate: 106, minAmount: 3000, liquidity: 'D+0' },
  { bank: 'Modal', rate: 114, minAmount: 1000, liquidity: 'D+1' },
  { bank: 'Banco Mercantil', rate: 111, minAmount: 1000, liquidity: 'D+0' }
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

    // Buscar taxas reais do Banco Central do Brasil
    let cdiRate = 11.75;    // Fallback
    let selicRate = 11.75;  // Fallback
    let inflationRate = 4.5; // Fallback
    
    try {
      // API do Banco Central - Séries temporais
      // CDI: série 12 | SELIC: série 432 | IPCA: série 433
      const [cdiRes, selicRes, ipacRes] = await Promise.all([
        axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json', { 
          timeout: 5000,
          httpsAgent 
        }).catch(() => null),
        axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json', { 
          timeout: 5000,
          httpsAgent 
        }).catch(() => null),
        axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json', { 
          timeout: 5000,
          httpsAgent 
        }).catch(() => null)
      ]);
      
      // CDI (série 12) - taxa diária, anualizamos
      if (cdiRes?.data?.[0]?.valor) {
        const cdiDaily = parseFloat(cdiRes.data[0].valor);
        cdiRate = parseFloat((Math.pow(1 + cdiDaily / 100, 252) - 1) * 100).toFixed(2);
      }
      
      // SELIC Meta (série 432) - já é anual
      if (selicRes?.data?.[0]?.valor) {
        selicRate = parseFloat(selicRes.data[0].valor);
      }
      
      // IPCA (série 433) - acumulado 12 meses
      if (ipacRes?.data && ipacRes.data.length > 0) {
        const ipacValues = ipacRes.data.map(d => parseFloat(d.valor));
        inflationRate = parseFloat(ipacValues.reduce((acc, val) => acc * (1 + val / 100), 1) - 1) * 100;
      }
      
      console.log('BCB API Success:', { cdiRate, selicRate, inflationRate });
    } catch (bcbError) {
      console.log('BCB API fallback to default values:', bcbError.message);
    }

    // Calcula yields anualizados dos CDBs
    const cdbsWithYield = MOCK_CDBS.map(cdb => {
      const yieldAnnual = (cdiRate * cdb.rate / 100).toFixed(2);
      const monthlyYield = (Math.pow(1 + (yieldAnnual / 100), 1/12) - 1) * 100;
      
      return {
        bank: cdb.bank,
        name: `CDB ${cdb.rate}% CDI`,
        rate: cdb.rate,
        cdiPercentage: cdb.rate,
        yieldAnnual: parseFloat(yieldAnnual),
        monthlyYield: monthlyYield.toFixed(2),
        minAmount: cdb.minAmount,
        liquidity: cdb.liquidity,
        lastUpdate: new Date().toISOString()
      };
    });

    // Ordena por rentabilidade
    cdbsWithYield.sort((a, b) => b.rate - a.rate);

    const result = {
      cdbs: cdbsWithYield.slice(0, 12),
      benchmark: {
        cdi: parseFloat(cdiRate),
        selic: parseFloat(selicRate),
        inflation: parseFloat(inflationRate.toFixed(2))
      },
      timestamp: new Date().toISOString(),
      lastManualUpdate: LAST_MANUAL_UPDATE,
      source: 'CDI/SELIC: Banco Central do Brasil (BCB) | CDBs: Valores educacionais'
    };

    cache = { data: result, timestamp: now };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('CDB API Error:', error.message);
    
    if (cache.data) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cache.data, error: 'Using cached data', cached: true })
      };
    }

    // Fallback completo
    const fallbackCdbs = MOCK_CDBS.map(cdb => ({
      bank: cdb.bank,
      name: `CDB ${cdb.rate}% CDI`,
      rate: cdb.rate,
      cdiPercentage: cdb.rate,
      yieldAnnual: (11.75 * cdb.rate / 100).toFixed(2),
      monthlyYield: '0.95',
      minAmount: cdb.minAmount,
      liquidity: cdb.liquidity
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        cdbs: fallbackCdbs.slice(0, 12),
        benchmark: { cdi: 11.75, selic: 11.75, inflation: 4.5 },
        timestamp: new Date().toISOString(),
        error: 'Using fallback data'
      })
    };
  }
};
