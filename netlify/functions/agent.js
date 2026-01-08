const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { messages } = JSON.parse(event.body);

        if (!messages || !Array.isArray(messages)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Messages array is required' })
            };
        }

        // Chave da API - segura pois roda apenas no servidor Netlify
        // O código das functions NÃO é exposto publicamente
        const PERPLEXITY_API_KEY = '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';

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: messages,
                max_tokens: 800,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Perplexity API Error:', response.status, errorText);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: 'API request failed',
                    details: errorText
                })
            };
        }

        const data = await response.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Agent function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
