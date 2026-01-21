const CARTOLA_API_URL = '/.netlify/functions/cartola-api';
const GATOMESTRE_API_URL = '/.netlify/functions/gatomestre-api';

let cartolaData = null;
let gatoMestreData = null;
let playerData = [];

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('updateMarketBtn').addEventListener('click', updateMarketData);
    document.getElementById('generateBtn').addEventListener('click', generateArt);
    document.getElementById('saveTokenBtn').addEventListener('click', () => {
        const token = document.getElementById('gatoMestreToken').value.trim();
        if (token) {
            localStorage.setItem('gatoMestreToken', token);
            showMessage('✅ Token salvo com sucesso!', 'success');
            loadGatoMestreData();
        } else {
            showMessage('⚠️ Por favor, cole o token antes de salvar', 'warning');
        }
    });
    
    // Carrega token salvo anteriormente
    const savedToken = localStorage.getItem('gatoMestreToken');
    if (savedToken) {
        document.getElementById('gatoMestreToken').value = savedToken;
    }
    
    loadCartolaData();
});

// Função para exibir mensagens de erro/sucesso
function showMessage(message, type = 'error') {
    const errorDiv = document.getElementById('errorMessages');
    const messageClass = type === 'success' ? 'success-message' : type === 'warning' ? 'warning-message' : 'error-message';
    errorDiv.innerHTML = `<div class="${messageClass}">${message}</div>`;
    
    // Remove mensagem após 5 segundos
    setTimeout(() => {
        errorDiv.innerHTML = '';
    }, 5000);
}

async function loadCartolaData() {
    try {
        showMessage('🔄 Carregando dados do Cartola...', 'warning');
        
        const response = await fetch(CARTOLA_API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        cartolaData = await response.json();
        
        // Verifica se os dados vieram corretos
        if (!cartolaData || Object.keys(cartolaData).length === 0) {
            throw new Error('Dados do Cartola vazios');
        }
        
        console.log('✅ Cartola carregado:', Object.keys(cartolaData).length, 'atletas');
        showMessage('✅ Dados do Cartola carregados com sucesso!', 'success');
        
        // Se já tem jogadores carregados, atualiza os preços
        if (playerData.length > 0) {
            updatePlayerPrices();
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar Cartola:', error);
        showMessage(`❌ Erro ao carregar dados do Cartola: ${error.message}`, 'error');
        cartolaData = null;
    }
}

async function loadGatoMestreData() {
    const token = localStorage.getItem('gatoMestreToken');
    
    if (!token) {
        showMessage('⚠️ Token do Gato Mestre não encontrado. Cole o token e clique em "Salvar Access Token"', 'warning');
        return;
    }
    
    try {
        showMessage('🔄 Carregando dados do Gato Mestre...', 'warning');
        
        const response = await fetch(GATOMESTRE_API_URL, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            throw new Error('Token expirado ou inválido. Gere um novo token no Gato Mestre.');
        }
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        gatoMestreData = await response.json();
        
        console.log('✅ Gato Mestre carregado:', gatoMestreData);
        showMessage('✅ Dados do Gato Mestre carregados com sucesso!', 'success');
        
        // Se já tem jogadores carregados, atualiza os dados
        if (playerData.length > 0) {
            updatePlayerData();
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar Gato Mestre:', error);
        showMessage(`❌ Erro Gato Mestre: ${error.message}`, 'error');
        gatoMestreData = null;
    }
}

async function updateMarketData() {
    showMessage('🔄 Atualizando dados do mercado...', 'warning');
    await Promise.all([loadCartolaData(), loadGatoMestreData()]);
}

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

function parsePlayerData(content) {
    playerData = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length >= 2) {
            playerData.push({
                nome: parts[0],
                clube: parts[1],
                preco: null,
                mpv: null,
                atletaId: null
            });
        }
    });
    
    console.log('📋 Jogadores carregados:', playerData.length);
    showMessage(`✅ ${playerData.length} jogadores carregados do arquivo!`, 'success');
    
    // Se já tem dados do Cartola, atualiza preços
    if (cartolaData) {
        updatePlayerPrices();
    }
}

function updatePlayerPrices() {
    if (!cartolaData) {
        showMessage('⚠️ Carregue os dados do Cartola primeiro (clique em "Atualizar Mercado")', 'warning');
        return;
    }
    
    let matchCount = 0;
    
    playerData.forEach(player => {
        const normName = normalizeString(player.nome);
        const normClube = normalizeString(player.clube);
        
        for (const [id, atleta] of Object.entries(cartolaData)) {
            const atletaNome = normalizeString(atleta.apelido || atleta.nome || '');
            const atletaClube = normalizeString(atleta.clube?.nome || '');
            
            // Tenta match por nome E clube
            if (atletaNome === normName && atletaClube.includes(normClube)) {
                player.preco = atleta.preco_num;
                player.atletaId = id;
                matchCount++;
                break;
            }
        }
        
        // Se não encontrou, tenta só pelo nome
        if (!player.atletaId) {
            for (const [id, atleta] of Object.entries(cartolaData)) {
                const atletaNome = normalizeString(atleta.apelido || atleta.nome || '');
                
                if (atletaNome === normName) {
                    player.preco = atleta.preco_num;
                    player.atletaId = id;
                    matchCount++;
                    break;
                }
            }
        }
    });
    
    console.log(`✅ ${matchCount}/${playerData.length} jogadores encontrados no Cartola`);
    showMessage(`✅ Preços atualizados: ${matchCount}/${playerData.length} jogadores encontrados`, 'success');
    
    updatePlayerData();
}

function updatePlayerData() {
    if (gatoMestreData && gatoMestreData.atletas) {
        playerData.forEach(player => {
            if (player.atletaId && gatoMestreData.atletas[player.atletaId]) {
                player.mpv = gatoMestreData.atletas[player.atletaId].minimo_para_valorizar;
            }
        });
        console.log('✅ MPV atualizado dos jogadores');
    }
    
    renderArt();
}

function normalizeString(str) {
    return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function renderArt() {
    const roundNumber = document.getElementById('roundNumber').value || 'X';
    document.getElementById('artTitle').textContent = `DICAS POR POSIÇÃO - MD${roundNumber}`;
    
    const positions = {
        'tecnicos': [],
        'goleiros': [],
        'laterais': [],
        'zagueiros': [],
        'meias': [],
        'atacantes': []
    };
    
    playerData.forEach(player => {
        const positionKey = getPositionKey(player.clube);
        if (positionKey && positions[positionKey]) {
            positions[positionKey].push(player);
        }
    });
    
    for (const [key, players] of Object.entries(positions)) {
        const container = document.getElementById(key);
        if (!container) continue;
        
        container.innerHTML = players.map(player => {
            const preco = player.preco ? (player.preco / 100).toFixed(2) : '-.--';
            const mpv = player.mpv ? player.mpv.toFixed(2) : '-.--';
            const clube = player.clube || '';
            
            return `
                <div class="player-row">
                    <span class="player-name">${player.nome}</span>
                    <div class="player-stats">
                        <span class="stat-badge club-badge">${clube}</span>
                        <span class="stat-badge price-badge">C$ ${preco}</span>
                        <span class="stat-badge mpv-badge">${mpv}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function getPositionKey(clube) {
    const map = {
        'TEC': 'tecnicos',
        'GOL': 'goleiros',
        'LAT': 'laterais',
        'ZAG': 'zagueiros',
        'MEI': 'meias',
        'ATA': 'atacantes'
    };
    return map[clube] || null;
}

function generateArt() {
    const artLayout = document.getElementById('artLayout');
    
    showMessage('🎨 Gerando arte...', 'warning');
    
    html2canvas(artLayout, {
        scale: 2,
        backgroundColor: '#1a1a2e',
        logging: false
    }).then(canvas => {
        const link = document.createElement('a');
        const roundNumber = document.getElementById('roundNumber').value || 'X';
        link.download = `dicas-posicao-md${roundNumber}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        showMessage('✅ Arte gerada com sucesso!', 'success');
    }).catch(error => {
        console.error('Erro ao gerar arte:', error);
        showMessage('❌ Erro ao gerar arte: ' + error.message, 'error');
    });
}
