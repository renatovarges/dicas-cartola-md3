// Configurações globais
const CARTOLA_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'https://api.cartola.globo.com/atletas/mercado'
    : '/.netlify/functions/cartola-api';
const CANVAS_WIDTH = 2700;
const CANVAS_HEIGHT = 5400;

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
    'CRUZEIRO': 'cruzeiro',
    'GRÊMIO': 'gremio',
    'INTERNACIONAL': 'internacional',
    'BAHIA': 'bahia',
    'SPORT': 'sport',
    'CEARÁ': 'ceará',
    'FORTALEZA': 'fortaleza',
    'VITÓRIA': 'vitória',
    'JUVENTUDE': 'juventude',
    'RED BULL BRAGANTINO': 'red bull bragantino',
    'MIRASSOL': 'mirassol'
};

// Variáveis globais
let cartolaData = null;
let playerData = [];

// Elementos DOM
let artLayout, canvas, ctx;

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
    const generateBtn = document.getElementById('generateBtn');
    const updateMarketBtn = document.getElementById('updateMarketBtn');
    const downloadPngBtn = document.getElementById('downloadPngBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const downloadPdfVectorBtn = document.getElementById('downloadPdfVectorBtn');
    const roundNumberInput = document.getElementById('roundNumber');
    
    fileInput.addEventListener('change', handleFileUpload);
    generateBtn.addEventListener('click', generateArt);
    updateMarketBtn.addEventListener('click', updateMarketData);
    downloadPngBtn.addEventListener('click', () => downloadImage('png'));
    downloadPdfBtn.addEventListener('click', () => downloadImage('pdf'));
    downloadPdfVectorBtn.addEventListener('click', () => downloadImage('pdf-vector'));
    roundNumberInput.addEventListener('input', updateArtTitle);
    
    // Carregar dados do Cartola na inicialização
    loadCartolaData().then(() => {
        console.log('Dados do Cartola carregados na inicialização');
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
    try {
        const response = await fetch('exemplo_rodada.csv');
        if (response.ok) {
            const csvText = await response.text();
            parsePlayerData(csvText);
            console.log('Arquivo de exemplo carregado automaticamente');
        }
    } catch (error) {
        console.log('Arquivo de exemplo não encontrado, aguardando upload manual');
    }
}

function parsePlayerData(content) {
    const lines = content.split('\n');
    playerData = [];
    
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
            // Formato: pos,nome,clube,conf,cap,uni,rl
            for (let j = 4; j < parts.length; j++) {
                const indicator = parts[j].trim().toUpperCase();
                if (indicator === 'CAP') {
                    player.capitao = true;
                } else if (indicator === 'UNI') {
                    player.unanimidade = true;
                } else if (indicator === 'RL') {
                    player.luxo = true;
                }
            }
            
            // Buscar preço na API do Cartola
            player.preco = getPlayerPrice(player.nome, player.clube);
            playerData.push(player);
        }
    }
    
    console.log('Dados dos jogadores processados:', playerData);
    generateBtn.disabled = false;
}

// Função para normalizar nomes (remover acentos, espaços extras)
function normalizeString(str) {
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9\s]/g, '');
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
        'mirassol': ['mirassol', 'mir']
    };
    
    const normalized = normalizeString(clubName.toLowerCase());
    
    for (const [key, variations] of Object.entries(clubMap)) {
        if (variations.some(variation => normalized.includes(normalizeString(variation.toLowerCase())))) {
            return key;
        }
    }
    
    return normalized.replace(/\s+/g, ' ');
}

// Função para buscar preço do jogador
function getPlayerPrice(playerName, clubName) {
    if (!cartolaData || !cartolaData.atletas) {
        console.log('Dados do Cartola não disponíveis para:', playerName);
        return { price: null, found: false };
    }
    
    const normalizedPlayerName = normalizeString(playerName);
    const normalizedClubName = normalizeString(clubName);
    
    console.log(`Buscando preço para: ${playerName} (${normalizedPlayerName}) do ${clubName}`);
    
    // Busca exata primeiro
    const exactMatch = Object.values(cartolaData.atletas).find(atleta => {
        const atletaNome = normalizeString(atleta.apelido || atleta.nome);
        const match = atletaNome === normalizedPlayerName;
        if (match) {
            console.log(`Match exato encontrado: ${atleta.apelido || atleta.nome} - Preço: ${atleta.preco_num}`);
        }
        return match;
    });
    
    if (exactMatch) {
        return { price: exactMatch.preco_num || exactMatch.preco, found: true, player: exactMatch };
    }
    
    // Busca por apelido similar
    const similarMatch = Object.values(cartolaData.atletas).find(atleta => {
        const atletaNome = normalizeString(atleta.apelido || atleta.nome);
        const match = atletaNome.includes(normalizedPlayerName) || normalizedPlayerName.includes(atletaNome);
        if (match) {
            console.log(`Match similar encontrado: ${atleta.apelido || atleta.nome} - Preço: ${atleta.preco_num}`);
        }
        return match;
    });
    
    if (similarMatch) {
        return { price: similarMatch.preco_num || similarMatch.preco, found: true, player: similarMatch, clubMismatch: true };
    }
    
    console.log(`Jogador não encontrado: ${playerName}`);
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
        const positionKey = POSITION_MAP[player.posicao];
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
        }
    });
    
    // Mostrar mensagens de erro se houver jogadores não encontrados
    showErrorMessages(notFoundPlayers);
    
    // Renderizar jogadores em cada posição
    Object.entries(playersByPosition).forEach(([positionId, players]) => {
        const container = document.getElementById(positionId);
        if (container) {
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
            
            sortedPlayers.forEach(player => {
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
    const baseWeight1 = 0.25; // Técnicos/Goleiros - peso menor
    const baseWeight2 = 0.3;  // Laterais/Zagueiros - peso médio
    const baseWeight3 = 0.4;  // Meias/Atacantes - peso maior para evitar corte
    const playerWeight = 0.08; // Peso adicional aumentado por jogador
    
    const row1Weight = Math.max(baseWeight1, baseWeight1 + (row1Count * playerWeight));
    const row2Weight = Math.max(baseWeight2, baseWeight2 + (row2Count * playerWeight));
    const row3Weight = Math.max(baseWeight3, baseWeight3 + (row3Count * playerWeight * 1.2)); // Peso extra para linha 3
    
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
    
    // Escudo do time
    const teamBadge = document.createElement('img');
    teamBadge.className = 'team-badge';
    const clubFileName = normalizeClubName(player.clube);
    teamBadge.src = `public/escudos/${clubFileName}.png`;
    teamBadge.alt = player.clube;
    teamBadge.onerror = function() {
        this.style.display = 'none';
    };
    
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
        playerPrice.textContent = price.toFixed(2);
    }
    
    // Montar estrutura
    playerInfo.appendChild(teamBadge);
    playerInfo.appendChild(playerName);
    playerInfo.appendChild(playerIcons);
    
    playerRow.appendChild(playerInfo);
    playerRow.appendChild(confidenceLevel);
    playerRow.appendChild(playerPrice);
    
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
    
    // Calcular escala baseada na resolução desejada
    const scaleX = width / 2700;
        const scaleY = height / 4500;
    const scale = Math.min(scaleX, scaleY); // Usar a menor escala para manter proporção
    
    artLayout.style.width = width + 'px';
    artLayout.style.height = height + 'px';
    artLayout.style.transform = 'scale(1)'; // Garantir escala 1:1 para captura
    artLayout.style.transformOrigin = 'top left';
    artLayout.style.position = 'relative';
    artLayout.style.left = '0';
    artLayout.style.top = '0';
    
    // Ajustar tamanhos internos proporcionalmente
    const scaleFactor = width / 2700;
    document.documentElement.style.setProperty('--export-scale', scaleFactor);
    
    // Adicionar classe específica para a resolução
    artLayout.classList.remove('export-1350', 'export-2700', 'export-4050');
        if (width === 1350) {
            artLayout.classList.add('export-1350');
        } else if (width === 2700) {
            artLayout.classList.add('export-2700');
        } else if (width === 4050) {
            artLayout.classList.add('export-4050');
        }
    
    // Gerar imagem com html2canvas com configurações de alta qualidade
    html2canvas(artLayout, {
        width: width,
        height: height,
        scale: Math.max(scaleFactor, 2), // Mínimo de 2x para melhor qualidade
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
        windowHeight: height
    }).then(canvas => {
        // Restaurar tamanho original
        artLayout.style.width = originalWidth;
        artLayout.style.height = originalHeight;
        artLayout.style.transform = originalTransform;
        artLayout.style.transformOrigin = originalTransformOrigin;
        document.documentElement.style.removeProperty('--export-scale');
        artLayout.classList.remove('export-1350', 'export-2700', 'export-4050');
        
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