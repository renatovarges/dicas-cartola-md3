// Configurações globais
const CARTOLA_API_URL = '/.netlify/functions/cartola-api';
const GATOMESTRE_API_URL = '/.netlify/functions/gatomestre-api';
const CANVAS_WIDTH = 2900;
const CANVAS_HEIGHT = 4800;

// Mapeamento de posições
const POSITION_MAP = {
    'TEC': 'tecnicos',
    'GOL': 'goleiros', 
    'LAT': 'laterais',
    'ZAG': 'zagueiros',
    'MEI': 'meias',
    'ATA': 'atacantes'
};

// Mapeamento de clubes
const CLUB_MAP = {
    'FLAMENGO': 'flamengo',
    'PALMEIRAS': 'palmeiras',
    'CORINTHIANS': 'corinthians',
    'SÃO PAULO': 'são paulo',
    'SANTOS': 'santos',
    'VASCO': 'vasco',
    'BOTAFOGO': 'botafogo',
    'FLUMINENSE': 'fluminense',
    'ATLÉTICO-MG': 'atlético mg',
    'ATLÉTICO MG': 'atlético mg',
    'ATLETICO MG': 'atlético mg',
    'CRUZEIRO': 'cruzeiro',
    'GRÊMIO': 'gremio',
    'INTERNACIONAL': 'internacional',
    'BAHIA': 'bahia',
    'VITÓRIA': 'vitória',
    'RED BULL BRAGANTINO': 'red bull bragantino',
    'MIRASSOL': 'mirassol',
    'ATHLETICO-PR': 'athletico-pr',
    'ATHLETICO PR': 'athletico-pr',
    'ATHLETICO': 'athletico-pr',
    'CORITIBA': 'coritiba',
    'CHAPECOENSE': 'chapecoense',
    'REMO': 'remo'
};

// Variáveis globais
let cartolaData = null;
let gatoMestreData = null;
let gatoMestreToken = localStorage.getItem('gatoMestreToken') || '';
let playerData = [];

// Elementos DOM
let artLayout, canvas, ctx, generateBtn;

// Inicializar elementos DOM após carregamento
function initializeDOM() {
    artLayout = document.getElementById('artLayout');
    canvas = document.getElementById('artCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    generateBtn = document.getElementById('generateBtn');
    const updateMarketBtn = document.getElementById('updateMarketBtn');
    const downloadPngBtn = document.getElementById('downloadPngBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const downloadPdfVectorBtn = document.getElementById('downloadPdfVectorBtn');
    const roundNumberInput = document.getElementById('roundNumber');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const gatoMestreTokenInput = document.getElementById('gatoMestreToken');
    
    fileInput.addEventListener('change', handleFileUpload);
    generateBtn.addEventListener('click', generateArt);
    updateMarketBtn.addEventListener('click', updateMarketData);
    downloadPngBtn.addEventListener('click', () => downloadImage('png'));
    downloadPdfBtn.addEventListener('click', () => downloadImage('pdf'));
    downloadPdfVectorBtn.addEventListener('click', () => downloadImage('pdf-vector'));
    roundNumberInput.addEventListener('input', updateArtTitle);
    saveTokenBtn.addEventListener('click', () => {
        const token = gatoMestreTokenInput.value.trim();
        if (token) {
            setGatoMestreToken(token);
            alert('Token salvo com sucesso! Os dados de MPV serão carregados.');
        } else {
            alert('Por favor, insira um token válido.');
        }
    });
    
    // Carregar token salvo no campo de input
    if (gatoMestreToken) {
        gatoMestreTokenInput.value = gatoMestreToken;
    }
    
    // Carregar dados do Cartola na inicialização
    loadCartolaData().then(() => {
        console.log('Dados do Cartola carregados na inicialização');
        // Carregar dados do Gato Mestre
        loadGatoMestreData();
        // Carregar arquivo de exemplo automaticamente após carregar dados do Cartola
        loadExampleData();
    });
    
    // Forçar atualização dos dados a cada 5 minutos
    setInterval(() => {
        console.log('Atualizando dados do Cartola automaticamente...');
        loadCartolaData();
    }, 5 * 60 * 1000);
});

// Função para atualizar dados do mercado
function updateMarketData() {
    const btn = document.getElementById('updateMarketBtn');
    btn.textContent = 'Atualizando...';
    btn.disabled = true;
    
    loadCartolaData().finally(() => {
        btn.textContent = 'Atualizar Mercado';
        btn.disabled = false;
    });
}

// Função para mostrar mensagens de erro
function showErrorMessages(errors) {
    const errorDiv = document.getElementById('errorMessages');
    if (errors.length > 0) {
        errorDiv.innerHTML = '<strong>Jogadores não encontrados:</strong><br>' + errors.join('<br>');
        errorDiv.classList.add('show');
    } else {
        errorDiv.classList.remove('show');
    }
}

// Função para atualizar o título da arte com o número da rodada
function updateArtTitle() {
    const roundNumber = document.getElementById('roundNumber').value;
    const artTitle = document.getElementById('artTitle');
    
    if (roundNumber && roundNumber.trim() !== '') {
        artTitle.textContent = `DICAS POR POSIÇÃO - TCC - RODADA ${roundNumber}`;
    } else {
        artTitle.textContent = 'DICAS POR POSIÇÃO - TCC';
    }
}

// Função para carregar dados da API do Cartola
async function loadCartolaData() {
    try {
        console.log('Carregando dados do Cartola...');
        const response = await fetch(CARTOLA_API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const apiData = await response.json();
        console.log('Dados brutos da API:', apiData);
        
        // Processar dados da API para o formato esperado
        if (apiData && apiData.atletas) {
            cartolaData = {
                atletas: apiData.atletas
            };
            console.log('Dados do Cartola processados:', Object.keys(cartolaData.atletas).length, 'jogadores');
            
            // Verificar se há técnicos nos dados
            const tecnicos = Object.values(cartolaData.atletas).filter(atleta => atleta.posicao_id === 6);
            console.log('Técnicos encontrados na API:', tecnicos.length);
            console.log('Primeiros 3 técnicos:', tecnicos.slice(0, 3).map(t => ({ nome: t.apelido || t.nome, clube: t.clube_id })));
        } else {
            throw new Error('Estrutura de dados da API inválida');
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados do Cartola:', error);
        // Fallback: usar dados do CSV local se a API falhar
        await loadLocalCartolaData();
    }
}

// Função para carregar dados locais como fallback
async function loadLocalCartolaData() {
    try {
        const response = await fetch('cartola_jogadores_time_posicao_preco.csv');
        const csvText = await response.text();
        cartolaData = parseLocalCSV(csvText);
        console.log('Dados locais carregados como fallback');
    } catch (error) {
        console.error('Erro ao carregar dados locais:', error);
    }
}

// Função para processar CSV local
function parseLocalCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const players = {};
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= 4) {
            const playerName = values[0].trim();
            const team = values[1].trim();
            const position = values[2].trim();
            const price = parseFloat(values[3].trim());
            
            players[playerName.toUpperCase()] = {
                nome: playerName,
                clube: team,
                posicao: position,
                preco: price
            };
        }
    }
    
    return { atletas: players };
}

// Função para carregar dados da API do Gato Mestre
async function loadGatoMestreData() {
    if (!gatoMestreToken || gatoMestreToken.trim() === '') {
        console.log('Token do Gato Mestre não configurado. MPV não será exibido.');
        return;
    }
    
    try {
        console.log('Carregando dados do Gato Mestre...');
        const response = await fetch(GATOMESTRE_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': gatoMestreToken,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error('Token do Gato Mestre inválido ou expirado. Por favor, atualize o token.');
                alert('Token do Gato Mestre expirado. Por favor, atualize o token nas configurações.');
                return;
            }
            throw new Error(`Erro na API do Gato Mestre: ${response.status}`);
        }
        
        gatoMestreData = await response.json();
        console.log('Dados do Gato Mestre carregados:', Object.keys(gatoMestreData).length, 'jogadores');
        
    } catch (error) {
        console.error('Erro ao carregar dados do Gato Mestre:', error);
        gatoMestreData = null;
    }
}

// Função para configurar o token do Gato Mestre
function setGatoMestreToken(token) {
    gatoMestreToken = token;
    localStorage.setItem('gatoMestreToken', token);
    console.log('Token do Gato Mestre salvo com sucesso');
    // Recarregar dados do Gato Mestre com o novo token
    loadGatoMestreData();
}

// Função para obter MPV de um jogador
function getPlayerMPV(atletaId) {
    if (!gatoMestreData || !atletaId) {
        return null;
    }
    
    const playerData = gatoMestreData[atletaId];
    if (playerData && playerData.minimo_para_valorizar !== undefined) {
        return playerData.minimo_para_valorizar;
    }
    
    return null;
}

// Função para determinar a cor do MPV baseada na posição e valor
function getMPVColorClass(posicao, mpv) {
    const pos = posicao.toUpperCase();
    
    // Técnicos, Goleiros e Zagueiros
    if (pos === 'TEC' || pos === 'GOL' || pos === 'ZAG') {
        if (mpv <= 2.5) return 'mpv-green';
        if (mpv <= 6.0) return 'mpv-white';
        return 'mpv-red';
    }
    
    // Laterais
    if (pos === 'LAT') {
        if (mpv <= 3.0) return 'mpv-green';
        if (mpv <= 6.5) return 'mpv-white';
        return 'mpv-red';
    }
    
    // Meias e Atacantes
    if (pos === 'MEI' || pos === 'ATA') {
        if (mpv <= 3.0) return 'mpv-green';
        if (mpv <= 7.0) return 'mpv-white';
        return 'mpv-red';
    }
    
    // Padrão (branco) se não se encaixar em nenhuma regra
    return 'mpv-white';
}

// Função para processar upload de arquivo
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parsePlayerData(content);
    };
    reader.readAsText(file);
}

// Função para processar dados dos jogadores
async function loadExampleData() {
    // Não carregar nenhum arquivo automaticamente
    // Aguardar upload manual do usuário
    console.log('Aguardando upload manual de arquivo CSV...');
    
    // Limpar dados existentes
    playerData = [];
    
    // Limpar a arte
    const positions = ['tecnicos', 'goleiros', 'laterais', 'zagueiros', 'meias', 'atacantes'];
    positions.forEach(position => {
        const container = document.querySelector(`#${position} .players-list`);
        if (container) {
            container.innerHTML = '';
        }
    });
}

function parsePlayerData(content) {
    console.log('=== INICIANDO PARSE DOS DADOS ===');
    console.log('Conteúdo recebido:', content.substring(0, 200) + '...');
    console.log('Total de linhas no arquivo:', content.trim().split('\n').length);
    
    const lines = content.split('\n');
    playerData = [];
    
    console.log('=== PROCESSANDO DADOS DO ARQUIVO ===');
    console.log('Total de linhas no arquivo:', lines.length);
    console.log('Primeira linha (cabeçalho):', lines[0]);
    
    // Formato: pos,nome,clube,conf,cap,uni,rl (onde cap,uni,rl podem ser CAP,UNI,RL)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length >= 4) {
            const player = {
                posicao: parts[0].trim(),
                nome: parts[1].trim(),
                clube: parts[2].trim(),
                confianca: parts[3].trim(),
                capitao: false,
                unanimidade: false,
                luxo: false,
    
                preco: null
            };
            
            // Verificar indicadores nas colunas restantes
            // Formato: pos,nome,clube,conf,cap,uni,rl,fora20
            for (let j = 4; j < parts.length; j++) {
                const indicator = normalizeString(parts[j].trim());
                
                // Detectar capitão
                if (indicator === 'cap' || indicator === 'capitao' || indicator === 'captain') {
                    player.capitao = true;
                }
                
                // Detectar unanimidade
                if (indicator === 'uni' || indicator === 'unanimidade' || indicator === 'unanime') {
                    player.unanimidade = true;
                }
                
                // Detectar reserva de luxo
                if (indicator === 'rl' || indicator === 'reserva luxo' || indicator === 'luxo' || indicator === 'reserva de luxo') {
                    player.luxo = true;
                }
                

            }
            
            // Log específico para técnicos e Lyanco
            if (player.posicao.toUpperCase() === 'TEC') {
                console.log('=== TÉCNICO PROCESSADO ===');
                console.log('Nome:', player.nome);
                console.log('Clube:', player.clube);
                console.log('Confiança:', player.confianca);
            }
            
            if (player.nome.toLowerCase().includes('lyanco')) {
                console.log('=== LYANCO PROCESSADO ===');
                console.log('Posição:', player.posicao);
                console.log('Nome:', player.nome);
                console.log('Clube:', player.clube);
                console.log('Confiança:', player.confianca);
            }
            
            // Buscar preço na API do Cartola
            player.preco = getPlayerPrice(player.nome, player.clube, player.posicao);
            playerData.push(player);
        }
    }
    
    // Log final do processamento
    const jogadoresPorPosicao = {};
    playerData.forEach(player => {
        const pos = player.posicao.toUpperCase();
        jogadoresPorPosicao[pos] = (jogadoresPorPosicao[pos] || 0) + 1;
    });
    
    console.log('=== RESUMO DO PROCESSAMENTO ===');
    console.log('Total de jogadores processados:', playerData.length);
    console.log('Jogadores por posição:', jogadoresPorPosicao);
    console.log('Dados completos dos jogadores:', playerData);
    
    // Arte será gerada manualmente pelo usuário
    
    generateBtn.disabled = false;
}

// Função para normalizar nomes (remover acentos, espaços extras)
function normalizeString(str) {
    if (!str) return '';
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[íì]/g, 'i') // Substitui caracteres especiais específicos
        .replace(/[áàâã]/g, 'a')
        .replace(/[óòôõ]/g, 'o')
        .replace(/[úùû]/g, 'u')
        .replace(/[éèê]/g, 'e')
        .replace(/[ç]/g, 'c')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
        .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
        .replace(/\b(de|da|do|dos|das)\b/g, '') // Remove preposições comuns
        .replace(/\s+/g, ' ') // Remove espaços extras após remoção de preposições
        .trim();
}

// Função para normalizar nome de clube para busca de escudo
function normalizeClubName(clubName) {
    const clubMap = {
        'flamengo': ['flamengo', 'fla', 'flam'],
        'palmeiras': ['palmeiras', 'pal', 'palm'],
        'corinthians': ['corinthians', 'cor', 'corintians'],
        'são paulo': ['são paulo', 'sao paulo', 'sao', 'spfc'],
        'santos': ['santos', 'san'],
        'vasco': ['vasco', 'vas'],
        'botafogo': ['botafogo', 'bot', 'bota'],
        'fluminense': ['fluminense', 'flu', 'flumi'],
        'atlético mg': ['atlético-mg', 'atletico-mg', 'atletico mg', 'atl', 'cam', 'galo'],
        'cruzeiro': ['cruzeiro', 'cru', 'cruz'],
        'gremio': ['grêmio', 'gremio', 'gre', 'tricolor'],
        'internacional': ['internacional', 'inter', 'int', 'colorado'],
        'bahia': ['bahia', 'bah', 'tricolor baiano'],
        'sport': ['sport', 'spo', 'recife'],
        'ceará': ['ceará', 'ceara', 'cea', 'vozao'],
        'fortaleza': ['fortaleza', 'for', 'leao'],
        'vitória': ['vitória', 'vitoria', 'vit', 'leao da barra'],
        'juventude': ['juventude', 'juv', 'papo'],
        'red bull bragantino': ['red bull bragantino', 'bragantino', 'rbr', 'red bull'],
        'mirassol': ['mirassol', 'mir'],
        'athletico-pr': ['athletico-pr', 'athletico pr', 'athletico', 'cap', 'furacao'],
        'coritiba': ['coritiba', 'coxa', 'cfc'],
        'chapecoense': ['chapecoense', 'chape', 'verdao'],
        'remo': ['remo', 'leao azul']
    };
    
    const normalized = normalizeString(clubName.toLowerCase());
    
    // Log para debug de clubes
    console.log(`[normalizeClubName] Clube original: "${clubName}" | Normalizado: "${normalized}"`);
    
    for (const [key, variations] of Object.entries(clubMap)) {
        if (variations.some(variation => normalized === normalizeString(variation.toLowerCase()))) {
            console.log(`[normalizeClubName] Match encontrado: "${clubName}" → "${key}"`);
            return key;
        }
    }
    
    console.log(`[normalizeClubName] Nenhum match encontrado para "${clubName}", retornando normalizado: "${normalized}"`);
    return normalized.replace(/\s+/g, ' ');
}

// ========================================
// FUNÇÃO DE SIMILARIDADE (Levenshtein Distance)
// Calcula quantas letras são diferentes entre dois nomes
// ========================================

function calcularSimilaridade(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];
    
    // Inicializar matriz
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    // Calcular distância
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,  // substituição
                    matrix[i][j - 1] + 1,      // inserção
                    matrix[i - 1][j] + 1       // remoção
                );
            }
        }
    }
    
    return matrix[len1][len2];
}

// ========================================
// FUNÇÃO BLINDADA - getPlayerPrice
// Busca por: POSIÇÃO + NOME + CLUBE
// ========================================

function getPlayerPrice(playerName, clubName, posicao) {
    if (!cartolaData || !cartolaData.atletas) {
        console.log('❌ Dados do Cartola não disponíveis para:', playerName);
        return { price: null, found: false };
    }
    
    const normalizedPlayerName = normalizeString(playerName);
    const normalizedClubName = normalizeClubName(clubName);
    
    // Mapeamento de IDs dos clubes
    const CLUB_ID_MAP = {
        'flamengo': 262,
        'palmeiras': 275,
        'corinthians': 264,
        'são paulo': 276,
        'sao paulo': 276,
        'santos': 277,
        'vasco': 267,
        'botafogo': 263,
        'fluminense': 266,
        'atletico mg': 282,
        'atlético mg': 282,
        'cruzeiro': 283,
        'gremio': 284,
        'internacional': 285,
        'bahia': 265,
        'vitoria': 287,
        'vitória': 287,
        'red bull bragantino': 280,
        'bragantino': 280,
        'mirassol': 2305,
        'athletico-pr': 293,
        'athletico pr': 293,
        'coritiba': 294,
        'chapecoense': 315,
        'remo': 364
    };
    
    // Mapeamento de IDs das posições
    const POSITION_ID_MAP = {
        'GOL': 1,  // Goleiro
        'LAT': 2,  // Lateral
        'ZAG': 3,  // Zagueiro
        'MEI': 4,  // Meia
        'ATA': 5,  // Atacante
        'TEC': 6   // Técnico
    };
    
    const expectedClubId = CLUB_ID_MAP[normalizedClubName];
    const expectedPosicaoId = posicao ? POSITION_ID_MAP[posicao.toUpperCase()] : null;
    
    console.log(`\n[BUSCA BLINDADA] ${posicao} | ${playerName} | ${clubName}`);
    console.log(`   → Posição ID: ${expectedPosicaoId} | Clube ID: ${expectedClubId}`);
    
    const atletasArray = Object.values(cartolaData.atletas);
    
    // ========================================
    // ETAPA 1: BUSCA EXATA (posição + nome + clube)
    // ========================================
    const exactMatch = atletasArray.find(atleta => {
        const atletaNome = normalizeString(atleta.apelido || atleta.nome);
        const nomeMatch = atletaNome === normalizedPlayerName;
        const clubeMatch = expectedClubId && atleta.clube_id === expectedClubId;
        const posicaoMatch = expectedPosicaoId && atleta.posicao_id === expectedPosicaoId;
        
        if (nomeMatch && clubeMatch && posicaoMatch) {
            console.log(`✅ MATCH EXATO: ${atleta.apelido || atleta.nome} (${atleta.posicao_id}/${atleta.clube_id}) - C$ ${atleta.preco_num}`);
            return true;
        }
        return false;
    });
    
    if (exactMatch) {
        return { 
            price: exactMatch.preco_num || exactMatch.preco, 
            found: true, 
            player: exactMatch 
        };
    }
    
    // ========================================
    // ETAPA 2: BUSCA SIMILAR COM PRIORIDADE TRIPLA
    // ========================================
    const candidatos = [];
    
    atletasArray.forEach(atleta => {
        const atletaNome = normalizeString(atleta.apelido || atleta.nome);
        
        // Dividir o nome do jogador em palavras
        const palavrasEsperadas = normalizedPlayerName.split(' ').filter(p => p.length > 0);
        const palavrasAtleta = atletaNome.split(' ').filter(p => p.length > 0);
        
        // Verificar se TODAS as palavras do nome esperado estão no nome do atleta
        // Agora com tolerância a pequenas diferenças (William vs Willian)
        const todasPalavrasPresentes = palavrasEsperadas.every(palavra => 
            palavrasAtleta.some(p => {
                const distancia = calcularSimilaridade(p, palavra);
                // Aceita se a distância for menor ou igual a 2 letras diferentes
                return p.includes(palavra) || palavra.includes(p) || distancia <= 2;
            })
        );
        
        // Verificar se há alguma similaridade no nome
        const nomeMatch = todasPalavrasPresentes || 
                          atletaNome.includes(normalizedPlayerName) || 
                          normalizedPlayerName.includes(atletaNome);
        
        if (nomeMatch) {
            let score = 0;
            let detalhes = [];
            
            // Pontos por qualidade do match de nome
            if (atletaNome === normalizedPlayerName) {
                score += 100;
                detalhes.push('nome=100');
            } else if (todasPalavrasPresentes) {
                score += 90;  // Quase perfeito: todas as palavras presentes
                detalhes.push('nome=90');
            } else if (atletaNome.includes(normalizedPlayerName)) {
                score += 50;
                detalhes.push('nome=50');
            } else if (normalizedPlayerName.includes(atletaNome)) {
                score += 40;
                detalhes.push('nome=40');
            } else {
                score += 20;
                detalhes.push('nome=20');
            }
            
            // ⭐ POSIÇÃO CORRETA: +100000 pontos (prioridade máxima)
            if (expectedPosicaoId && atleta.posicao_id === expectedPosicaoId) {
                score += 100000;
                detalhes.push('posição=100000');
            } else {
                detalhes.push('posição=0');
            }
            
            // ⭐ CLUBE CORRETO: +10000 pontos
            if (expectedClubId && atleta.clube_id === expectedClubId) {
                score += 10000;
                detalhes.push('clube=10000');
            } else {
                detalhes.push('clube=0');
            }
            
            const status = (atleta.posicao_id === expectedPosicaoId && atleta.clube_id === expectedClubId) ? '✅' : '⚠️';
            console.log(`   ${status} ${atleta.apelido || atleta.nome} (pos:${atleta.posicao_id}/clube:${atleta.clube_id}) - Score: ${score} [${detalhes.join(', ')}]`);
            
            candidatos.push({
                atleta: atleta,
                score: score,
                nome: atleta.apelido || atleta.nome,
                clube_id: atleta.clube_id,
                posicao_id: atleta.posicao_id,
                preco: atleta.preco_num || atleta.preco
            });
        }
    });
    
    if (candidatos.length > 0) {
        // Ordenar por score (maior score = melhor match)
        candidatos.sort((a, b) => b.score - a.score);
        const melhor = candidatos[0];
        
        console.log(`✅ MELHOR MATCH: ${melhor.nome} (pos:${melhor.posicao_id}/clube:${melhor.clube_id}, score:${melhor.score}) - C$ ${melhor.preco}`);
        
        // Avisar se posição ou clube não batem
        if (expectedPosicaoId && melhor.posicao_id !== expectedPosicaoId) {
            console.error(`❌ ERRO CRÍTICO: Posição diferente! Esperado: ${expectedPosicaoId}, Encontrado: ${melhor.posicao_id}`);
        }
        if (expectedClubId && melhor.clube_id !== expectedClubId) {
            console.error(`❌ ERRO CRÍTICO: Clube diferente! Esperado: ${expectedClubId}, Encontrado: ${melhor.clube_id}`);
        }
        
        return { 
            price: melhor.preco, 
            found: true, 
            player: melhor.atleta,
            positionMismatch: expectedPosicaoId && melhor.posicao_id !== expectedPosicaoId,
            clubMismatch: expectedClubId && melhor.clube_id !== expectedClubId
        };
    }
    
    // ========================================
    // ETAPA 3: BUSCA SEM CLUBE (último recurso)
    // ========================================
    console.warn(`⚠️ Buscando ${playerName} apenas por POSIÇÃO + NOME (sem clube)`);
    
    const positionMatch = atletasArray.find(atleta => {
        const atletaNome = normalizeString(atleta.apelido || atleta.nome);
        const nomeMatch = atletaNome === normalizedPlayerName;
        const posicaoMatch = expectedPosicaoId && atleta.posicao_id === expectedPosicaoId;
        return nomeMatch && posicaoMatch;
    });
    
    if (positionMatch) {
        console.log(`⚠️ Match por posição+nome: ${positionMatch.apelido || positionMatch.nome} (pos:${positionMatch.posicao_id}/clube:${positionMatch.clube_id}) - C$ ${positionMatch.preco_num}`);
        return { 
            price: positionMatch.preco_num || positionMatch.preco, 
            found: true, 
            player: positionMatch 
        };
    }
    
    console.error(`❌ Jogador NÃO encontrado: ${posicao} ${playerName} (${clubName})`);
    return { price: null, found: false };
}



// Função para gerar a arte
function generateArt() {
    console.log('=== FUNÇÃO GENERATEART EXECUTADA ===');
    console.log('Dados dos jogadores:', playerData);
    
    if (!playerData.length) {
        console.log('ERRO: Nenhum dado de jogador encontrado!');
        alert('Por favor, faça upload do arquivo CSV primeiro.');
        return;
    }
    
    console.log('Iniciando geração da arte com', playerData.length, 'jogadores');
    
    // Inicializar DOM se necessário
    if (!artLayout) {
        initializeDOM();
    }
    
    // Atualizar título com número da rodada
    updateArtTitle();
    
    // Limpar listas existentes
    Object.values(POSITION_MAP).forEach(positionId => {
        const container = document.getElementById(positionId);
        if (container) container.innerHTML = '';
    });
    
    console.log('=== GERANDO ARTE ===');
    
    // Agrupar jogadores por posição e detectar erros
    const playersByPosition = {};
    const notFoundPlayers = [];
    
    playerData.forEach(player => {
        console.log(`Processando jogador: ${player.nome} - Posição: ${player.posicao}`);
        const positionKey = POSITION_MAP[player.posicao];
        console.log(`Posição mapeada: ${positionKey}`);
        
        if (positionKey) {
            // Verificar se jogador foi encontrado no mercado
            const priceData = getPlayerPrice(player.nome, player.clube);
            if (!priceData.found) {
                notFoundPlayers.push(`${player.nome} (${player.clube})`);
            }
            
            if (!playersByPosition[positionKey]) {
                playersByPosition[positionKey] = [];
            }
            playersByPosition[positionKey].push(player);
            console.log(`Jogador ${player.nome} adicionado à posição ${positionKey}`);
        } else {
            console.log(`ERRO: Posição ${player.posicao} não encontrada no POSITION_MAP`);
        }
    });
    
    // Mostrar mensagens de erro se houver jogadores não encontrados
    showErrorMessages(notFoundPlayers);
    
    // Renderizar jogadores em cada posição
    console.log('Jogadores agrupados por posição:', playersByPosition);
    Object.entries(playersByPosition).forEach(([positionId, players]) => {
        console.log(`Renderizando posição: ${positionId} com ${players.length} jogadores`);
        const container = document.getElementById(positionId);
        if (container) {
            // Log específico para técnicos antes da ordenação
            if (positionId === 'tecnicos') {
                console.log('=== TÉCNICOS ANTES DA ORDENAÇÃO ===');
                players.forEach(player => {
                    console.log(`${player.nome} - Confiança: ${player.confianca} - Unanimidade: ${player.unanimidade}`);
                });
            }
            
            // Ordenar jogadores: primeiro unanimidade, depois por confiança (A, B, C)
            const sortedPlayers = players.sort((a, b) => {
                // Primeiro critério: unanimidade (unânimes primeiro)
                if (a.unanimidade && !b.unanimidade) return -1;
                if (!a.unanimidade && b.unanimidade) return 1;
                
                // Segundo critério: confiança (A, B, C)
                if (a.confianca !== b.confianca) {
                    return a.confianca.localeCompare(b.confianca);
                }
                
                // Terceiro critério: nome (ordem alfabética)
                return a.nome.localeCompare(b.nome);
            });
            
            // Log específico para técnicos depois da ordenação
            if (positionId === 'tecnicos') {
                console.log('=== TÉCNICOS DEPOIS DA ORDENAÇÃO ===');
                sortedPlayers.forEach(player => {
                    console.log(`${player.nome} - Confiança: ${player.confianca} - Unanimidade: ${player.unanimidade}`);
                });
            }
            
            sortedPlayers.forEach(player => {
                console.log(`Criando elemento para: ${player.nome}`);
                const playerElement = createPlayerElement(player);
                container.appendChild(playerElement);
            });
        }
    });
    
    // Aplicar layout dinâmico baseado na quantidade de jogadores
    applyDynamicLayout(playersByPosition);
    
    // Mostrar botões de download
    const exportButtons = document.querySelector('.export-buttons');
    if (exportButtons) {
        exportButtons.style.display = 'flex';
    }
}

// Função para aplicar layout dinâmico baseado na quantidade de jogadores
function applyDynamicLayout(playersByPosition) {
    // Contar jogadores por linha do grid
    const row1Count = (playersByPosition.tecnicos?.length || 0) + (playersByPosition.goleiros?.length || 0);
    const row2Count = (playersByPosition.laterais?.length || 0) + (playersByPosition.zagueiros?.length || 0);
    const row3Count = (playersByPosition.meias?.length || 0) + (playersByPosition.atacantes?.length || 0);
    
    // Calcular proporções baseadas na quantidade de jogadores
    // Pesos ajustados para dar mais espaço aos meias e atacantes
    const baseWeight1 = 0.2; // Técnicos/Goleiros - peso menor
    const baseWeight2 = 0.25;  // Laterais/Zagueiros - peso médio
    const baseWeight3 = 0.55;  // Meias/Atacantes - peso maior para evitar corte
    const playerWeight = 0.1; // Peso adicional aumentado por jogador
    
    const row1Weight = Math.max(baseWeight1, baseWeight1 + (row1Count * playerWeight));
    const row2Weight = Math.max(baseWeight2, baseWeight2 + (row2Count * playerWeight));
    const row3Weight = Math.max(baseWeight3, baseWeight3 + (row3Count * playerWeight * 1.5)); // Peso extra para linha 3
    
    // Normalizar os pesos para que a soma seja proporcional
    const totalWeight = row1Weight + row2Weight + row3Weight;
    const normalizedRow1 = (row1Weight / totalWeight * 3).toFixed(2);
    const normalizedRow2 = (row2Weight / totalWeight * 3).toFixed(2);
    const normalizedRow3 = (row3Weight / totalWeight * 3).toFixed(2);
    
    // Aplicar as novas proporções ao grid
    const positionsGrid = document.querySelector('.positions-grid');
    if (positionsGrid) {
        const newGridRows = `${normalizedRow1}fr ${normalizedRow2}fr ${normalizedRow3}fr`;
        positionsGrid.style.gridTemplateRows = newGridRows;
        
        console.log(`Layout dinâmico aplicado:`);
        console.log(`Linha 1 (Técnicos/Goleiros): ${row1Count} jogadores - ${normalizedRow1}fr`);
        console.log(`Linha 2 (Laterais/Zagueiros): ${row2Count} jogadores - ${normalizedRow2}fr`);
        console.log(`Linha 3 (Meias/Atacantes): ${row3Count} jogadores - ${normalizedRow3}fr`);
        console.log(`Grid template rows: ${newGridRows}`);
    }
}

// Função para criar elemento do jogador
function createPlayerElement(player) {
    const playerRow = document.createElement('div');
    playerRow.className = 'player-row';
    
    const priceData = getPlayerPrice(player.nome, player.clube);
    
    // Adicionar classe de erro se jogador não foi encontrado
    if (!priceData.found) {
        playerRow.classList.add('player-not-found');
    }
    
    const playerInfo = document.createElement('div');
    playerInfo.className = 'player-info';
    
    // Nome do jogador
    const playerName = document.createElement('span');
    playerName.className = 'player-name';
    playerName.textContent = player.nome.toUpperCase();
    
    // Escudo do time com div de fundo branco
    const teamBadgeWrapper = document.createElement('div');
    teamBadgeWrapper.className = 'team-badge-wrapper';
    
    // Criar SVG com círculo branco (sempre renderizado pelo html2canvas)
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '85');
    svg.setAttribute('height', '85');
    svg.setAttribute('viewBox', '0 0 85 85');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.zIndex = '0';
    
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '42.5');
    circle.setAttribute('cy', '42.5');
    circle.setAttribute('r', '42.5');
    circle.setAttribute('fill', '#ffffff');
    
    svg.appendChild(circle);
    teamBadgeWrapper.appendChild(svg);
    
    const teamBadge = document.createElement('img');
    teamBadge.className = 'team-badge-img';
    const clubFileName = normalizeClubName(player.clube);
    
    // Log específico para Lyanco
    if (player.nome.toLowerCase().includes('lyanco')) {
        console.log('=== DEBUG LYANCO ESCUDO ===');
        console.log('Clube original:', player.clube);
        console.log('Clube normalizado:', clubFileName);
        console.log('URL do escudo:', `public/escudos/${clubFileName}.png`);
    }
    
    teamBadge.src = `public/escudos/${clubFileName}.png`;
    teamBadge.alt = player.clube;
    teamBadge.onerror = function() {
        console.log('Erro ao carregar escudo:', this.src);
        this.style.display = 'none';
    };
    
    teamBadgeWrapper.appendChild(teamBadge);
    
    // Criar container de ícones
    const playerIcons = document.createElement('div');
    playerIcons.className = 'player-icons';
    
    console.log(`=== JOGADOR ${player.nome} ===`);
    console.log(`Luxo: ${player.luxo}, Unanimidade: ${player.unanimidade}, Capitão: ${player.capitao}`);
    console.log(`Container playerIcons criado:`, playerIcons);
    
    if (player.luxo) {
        const luxoIcon = document.createElement('img');
        luxoIcon.src = 'public/icons/luxo.svg';
        luxoIcon.className = 'icon';
        luxoIcon.alt = 'RL';
        luxoIcon.onerror = function() { console.error('Erro ao carregar ícone de luxo'); };
        luxoIcon.onload = function() { console.log('Ícone de luxo carregado com sucesso'); };
        playerIcons.appendChild(luxoIcon);
        console.log('Ícone de luxo adicionado');
    }
    
    if (player.unanimidade) {
        const uniIcon = document.createElement('img');
        uniIcon.src = 'public/icons/estrela.svg';
        uniIcon.className = 'icon';
        uniIcon.alt = 'Unanimidade';
        uniIcon.onerror = function() { console.error('Erro ao carregar ícone de unanimidade'); };
        uniIcon.onload = function() { console.log('Ícone de unanimidade carregado com sucesso'); };
        playerIcons.appendChild(uniIcon);
        console.log('Ícone de unanimidade adicionado');
    }
    
    if (player.capitao) {
        const capIcon = document.createElement('img');
        capIcon.src = 'public/icons/capitao.svg';
        capIcon.className = 'icon';
        capIcon.alt = 'Capitão';
        capIcon.onerror = function() { console.error('Erro ao carregar ícone de capitão'); };
        capIcon.onload = function() { console.log('Ícone de capitão carregado com sucesso'); };
        playerIcons.appendChild(capIcon);
        console.log('Ícone de capitão adicionado');
    }
    

    
    console.log(`Total de ícones no container: ${playerIcons.children.length}`);
    console.log(`PlayerIcons HTML:`, playerIcons.outerHTML);
    console.log(`PlayerIcons será inserido em playerInfo:`, playerInfo);
    
    // Nível de confiança
    const confidenceLevel = document.createElement('div');
    confidenceLevel.className = `confidence-level confidence-${player.confianca}`;
    confidenceLevel.textContent = player.confianca;
    
    // Preço
    const playerPrice = document.createElement('span');
    playerPrice.className = 'player-price';
    if (!priceData.found) {
        playerPrice.classList.add('price-error');
        playerPrice.textContent = 'N/E';
    } else {
        const price = priceData.price || 0;
        playerPrice.textContent = price.toFixed(1);
    }
    
    // Mínimo Para Valorizar (MPV)
    const playerMPV = document.createElement('span');
    playerMPV.className = 'player-mpv';
    if (priceData.found && priceData.player && priceData.player.atleta_id) {
        const mpv = getPlayerMPV(priceData.player.atleta_id);
        if (mpv !== null) {
            playerMPV.textContent = mpv.toFixed(1);
            // Aplicar cor baseada na posição e valor do MPV
            const colorClass = getMPVColorClass(player.posicao, mpv);
            if (colorClass) {
                playerMPV.classList.add(colorClass);
            }
        } else {
            playerMPV.textContent = '-';
        }
    } else {
        playerMPV.textContent = '-';
    }
    
    // Criar container para os dados (C, C$, MPV)
    const playerData = document.createElement('div');
    playerData.className = 'player-data';
    playerData.appendChild(confidenceLevel);
    playerData.appendChild(playerPrice);
    playerData.appendChild(playerMPV);
    
    // Montar estrutura
    playerInfo.appendChild(teamBadgeWrapper);
    playerInfo.appendChild(playerName);
    playerInfo.appendChild(playerIcons);
    
    playerRow.appendChild(playerInfo);
    playerRow.appendChild(playerData);
    
    return playerRow;
}

// Função para gerar imagem no canvas
function generateCanvasImage() {
    return new Promise((resolve) => {
        // Configurar canvas
        ctx.fillStyle = '#1e3c72';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Usar html2canvas para capturar o layout
        html2canvas(artLayout, {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            scale: 1,
            useCORS: true,
            allowTaint: true
        }).then(canvas => {
            // Desenhar no canvas principal
            ctx.drawImage(canvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            resolve();
        });
    });
}

// Função para baixar a imagem
function downloadImage(format = 'png') {
    const exportSize = document.getElementById('exportSize').value;
    const [width, height] = exportSize.split('x').map(Number);
    
    // Ajustar temporariamente o tamanho do layout
    const originalWidth = artLayout.style.width;
    const originalHeight = artLayout.style.height;
    const originalTransform = artLayout.style.transform;
    const originalTransformOrigin = artLayout.style.transformOrigin;
    
    // Calcular altura real do conteúdo
    artLayout.style.width = width + 'px';
    artLayout.style.height = 'auto'; // Permitir altura automática
    artLayout.style.transform = 'scale(1)';
    artLayout.style.transformOrigin = 'top left';
    artLayout.style.position = 'relative';
    artLayout.style.left = '0';
    artLayout.style.top = '0';
    
    // Ajustar tamanhos internos proporcionalmente
    const scaleFactor = width / 2900;
    document.documentElement.style.setProperty('--export-scale', scaleFactor);
    
    // Forçar recálculo do layout
    artLayout.offsetHeight;
    
    // Calcular altura precisa do conteúdo visível
    const contentHeight = artLayout.scrollHeight;
    const minHeight = Math.min(height, contentHeight);
    
    // Adicionar margem mínima de segurança (2% da altura original)
    const safetyMargin = Math.floor(height * 0.02);
    const optimizedHeight = Math.min(contentHeight + safetyMargin, height);
    
    artLayout.style.height = optimizedHeight + 'px';
    
    // Adicionar classe específica para a resolução
    artLayout.classList.remove('export-1450', 'export-2900', 'export-4350');
    if (width === 1450) {
        artLayout.classList.add('export-1450');
    } else if (width === 2900) {
        artLayout.classList.add('export-2900');
    } else if (width === 4350) {
        artLayout.classList.add('export-4350');
    }    
    // Calcular scale seguro baseado no tamanho total para evitar canvas muito grande
    const maxCanvasSize = 16384; // Limite seguro para a maioria dos navegadores
    const maxPixels = 50000000; // 50 megapixels como limite seguro
    const totalPixels = width * height;
    
    let safeScale = 1;
    
    // Se a resolução já é grande, não aplicar scale adicional
    if (width >= 2900 || totalPixels > maxPixels) {
        safeScale = 1;
    } else {
        // Para resoluções menores, permitir scale maior para melhor qualidade
        safeScale = Math.min(2, maxCanvasSize / Math.max(width, height));
    }
    
    console.log(`Configuração de exportação: ${width}x${optimizedHeight}, scale: ${safeScale}, pixels totais: ${(width * safeScale * optimizedHeight * safeScale).toLocaleString()}`);
    
    // Gerar imagem com html2canvas com configurações otimizadas
    html2canvas(artLayout, {
        width: width,
        height: optimizedHeight,
        scale: safeScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1a1a1a',
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        windowWidth: width,
        windowHeight: optimizedHeight,
        onclone: function(clonedDoc) {
            // Forçar background branco nos wrappers de escudos
            const wrappers = clonedDoc.querySelectorAll('.team-badge-wrapper');
            wrappers.forEach(wrapper => {
                wrapper.style.backgroundColor = '#ffffff';
                wrapper.style.background = '#ffffff';
            });
        }
    }).then(canvas => {
        // Restaurar tamanho original
        artLayout.style.width = originalWidth;
        artLayout.style.height = originalHeight;
        artLayout.style.transform = originalTransform;
        artLayout.style.transformOrigin = originalTransformOrigin;
        document.documentElement.style.removeProperty('--export-scale');
        artLayout.classList.remove('export-1450', 'export-2900', 'export-4350');
        
        if (format === 'png') {
            downloadPNG(canvas, exportSize);
        } else if (format === 'pdf') {
            downloadPDF(canvas, exportSize);
        } else if (format === 'pdf-vector') {
            downloadPDFVector(exportSize);
        }
    }).catch(error => {
        console.error('Erro ao gerar imagem:', error);
        alert('Erro ao gerar imagem. Tente novamente.');
        
        // Restaurar tamanho original em caso de erro
        artLayout.style.width = originalWidth;
        artLayout.style.height = originalHeight;
        artLayout.style.transform = originalTransform;
        artLayout.style.transformOrigin = originalTransformOrigin;
        document.documentElement.style.removeProperty('--export-scale');
    });
}

// Função para baixar PNG
function downloadPNG(canvas, size) {
    const link = document.createElement('a');
    link.download = `dicas-por-posicao-${size}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
}

// Função para baixar PDF
function downloadPDF(canvas, size) {
    // Criar PDF com jsPDF
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        alert('Biblioteca jsPDF não carregada. Baixando PNG ao invés.');
        downloadPNG(canvas, size);
        return;
    }
    
    const [width, height] = size.split('x').map(Number);
    const pdf = new jsPDF({
        orientation: height > width ? 'portrait' : 'landscape',
        unit: 'px',
        format: [width, height]
    });
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`dicas-por-posicao-${size}.pdf`);
}

// Função para baixar PDF vetorial (placeholder)
function downloadPDFVector(size) {
    alert('Exportação PDF vetorial requer servidor. Baixando PDF rápido ao invés.');
    downloadImage('pdf');
}

// Função auxiliar para carregar html2canvas se não estiver disponível
if (typeof html2canvas === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(script);
}