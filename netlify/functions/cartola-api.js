const https = require('https');

exports.handler = async (event, context) => {
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

  return new Promise((resolve) => {
    const url = 'https://api.cartola.globo.com/atletas/mercado';
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          // Retorna apenas a parte "atletas" que contém os jogadores
          const atletas = jsonData.atletas || {};
          
          resolve({
            statusCode: 200,
            headers,
            body: JSON.stringify(atletas)
          });
        } catch (error) {
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro ao processar dados do Cartola', details: error.message })
          });
        }
      });
    }).on('error', (error) => {
      resolve({
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erro ao conectar com Cartola API', details: error.message })
      });
    });
  });
};
