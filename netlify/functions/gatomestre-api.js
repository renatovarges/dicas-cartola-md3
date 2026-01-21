const https = require('https');

exports.handler = async function(event, context) {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Content-Type': 'application/json' 
  };

  // Suporte para requisições OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: '' 
    };
  }

  // Pega o token do header Authorization
  const authToken = event.headers.authorization || event.headers.Authorization;
  
  if (!authToken) {
    return { 
      statusCode: 401, 
      headers, 
      body: JSON.stringify({ error: 'Token de autorização não fornecido' })
    };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.cartola.globo.com',
      path: '/auth/time/info',
      method: 'GET',
      headers: {
        'Authorization': authToken
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 401) {
          resolve({
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Token expirado ou inválido' })
          });
          return;
        }

        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: 200,
            headers,
            body: JSON.stringify(jsonData)
          });
        } catch (error) {
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro ao processar dados do Gato Mestre', details: error.message })
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erro ao conectar com API Gato Mestre', details: error.message })
      });
    });

    req.end();
  });
};
