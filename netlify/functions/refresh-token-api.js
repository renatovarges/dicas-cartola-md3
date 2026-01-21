exports.handler = async function(event, context) {
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Responder a requisições OPTIONS (preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Apenas aceitar POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método não permitido' })
        };
    }

    try {
        // Obter refresh_token do body
        const { refresh_token } = JSON.parse(event.body);

        if (!refresh_token) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Refresh token não fornecido' })
            };
        }

        // Fazer requisição para a API do Globoid
        const response = await fetch('https://web-api.globoid.globo.com/v1/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: 'cartola-web@apps.globoid',
                refresh_token: refresh_token
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na API Globoid:', response.status, errorText);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: 'Erro ao obter Access Token',
                    status: response.status,
                    details: errorText
                })
            };
        }

        const data = await response.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                access_token: data.access_token,
                refresh_token: data.refresh_token
            })
        };

    } catch (error) {
        console.error('Erro na function refresh-token-api:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro interno do servidor',
                message: error.message
            })
        };
    }
};
