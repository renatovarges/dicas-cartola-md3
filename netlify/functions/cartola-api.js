exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    // Buscar dados do Cartola - endpoint que retorna dados completos
    const response = await fetch('https://api.cartola.globo.com/atletas');
    
    if (!response.ok) {
      throw new Error(`Erro na API do Cartola: ${response.status}`);
    }

    const data = await response.json();
    
    // Transformar dados para o formato esperado pelo script
    // A API retorna um objeto onde as chaves são IDs dos atletas
    const atletas = {};
    
    if (data && typeof data === 'object') {
      for (const [key, atleta] of Object.entries(data)) {
        // Pegar apenas os campos necessários
        atletas[key] = {
          apelido: atleta.apelido || atleta.nome || '',
          nome: atleta.nome || '',
          preco_num: atleta.preco_num || 0,
          clube: atleta.clube || { nome: '' }
        };
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ atletas })
    };
    
  } catch (error) {
    console.error('Erro ao buscar dados do Cartola:', error);
    
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
