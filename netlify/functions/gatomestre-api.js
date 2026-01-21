// Função serverless para fazer proxy da API do Gato Mestre
// Resolve o problema de CORS ao fazer a requisição no servidor

exports.handler = async function(event, context) {
    // Headers CORS
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Responder a requisições OPTIONS (preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Apenas aceitar requisições GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Obter o token de autorização dos headers
    const authToken = event.headers.authorization || event.headers.Authorization;
    
    if (!authToken) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Token de autorização não fornecido' })
        };
    }

    try {
        // Fazer requisição para a API do Gato Mestre
        const response = await fetch('https://api.cartola.globo.com/auth/gatomestre/atletas', {
            method: 'GET',
            headers: {
                'Authorization': authToken,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: `Erro na API do Gato Mestre: ${response.status}`,
                    message: response.status === 401 ? 'Token inválido ou expirado' : 'Erro ao buscar dados'
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
        console.error('Erro ao buscar dados do Gato Mestre:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro interno ao buscar dados',
                details: error.message 
            })
        };
    }
};
