// Configurações
const CARTOLA_API_URL = '/.netlify/functions/cartola-api';
const GATOMESTRE_API_URL = '/.netlify/functions/gatomestre-api';
const CANVAS_WIDTH = 2900;
const CANVAS_HEIGHT = 4800;

const POSITION_MAP = {
    'TEC': 'tecnicos', 'GOL': 'goleiros', 'LAT': 'laterais',
    'ZAG': 'zagueiros', 'MEI': 'meias', 'ATA': 'atacantes'
};

const CLUB_MAP = {
    'FLAMENGO': 'flamengo', 'PALMEIRAS': 'palmeiras', 'CORINTHIANS': 'corinthians',
    'SÃO PAULO': 'são paulo', 'SANTOS': 'santos', 'VASCO': 'vasco',
    'BOTAFOGO': 'botafogo', 'FLUMINENSE': 'fluminense', 'ATLÉTICO-MG': 'atlético mg',
    'ATLÉTICO MG': 'atlético mg', 'ATLETICO MG': 'atlético mg', 'CRUZEIRO': 'cruzeiro',
    'GRÊMIO': 'gremio', 'INTERNACIONAL': 'internacional', 'BAHIA': 'bahia',
    'VITÓRIA': 'vitória', 'RED BULL BRAGANTINO': 'red bull bragantino', 'MIRASSOL': 'mirassol',
    'ATHLETICO-PR': 'athletico-pr', 'ATHLETICO PR': 'athletico-pr', 'ATHLETICO': 'athletico-pr',
    'CORITIBA': 'coritiba', 'Coritiba': 'coritiba', 'coritiba': 'coritiba',
    'CHAPECOENSE': 'chapecoense', 'Chapecoense': 'chapecoense', 'chapecoense': 'chapecoense',
    'REMO': 'remo', 'Remo': 'remo', 'remo': 'remo'
};

let cartolaData = null;
let gatoMestreData = null;
let playerData = [];
let gatoMestreToken = localStorage.getItem('gatoMestreToken') || '';
let artLayout, canvas, ctx, generateBtn;

function initializeDOM() {
    artLayout = document.getElementById('artLayout');
    canvas = document.getElementById('artCanvas');
    if (canvas) ctx = canvas.getContext('2d');
}

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
            localStorage.setItem('gatoMestreToken', token);
            gatoMestreToken = token;
            alert('✅ Access Token salvo! Dura 1 hora.');
            loadGatoMestreData();
        } else {
            alert('⚠️ Cole um Access Token válido.');
        }
    });
    
    const savedToken = localStorage.getItem('gatoMestreToken');
    if (savedToken) gatoMestreTokenInput.value = savedToken;
    
    loadCartolaData();
    setInterval(loadCartolaData, 5 * 60 * 1000);
});

function updateMarketData() {
    const btn = document.getElementById('updateMarketBtn');
    btn.textContent = 'Atualizando...';
    btn.disabled = true;
    
    Promise.all([loadCartolaData(), loadGatoMestreData()]).finally(() => {
        btn.textContent = 'Atualizar Mercado';
        btn.disabled = false;
        if (playerData.length > 0) {
            updatePlayerPrices();
            renderArt();
        }
    });
}

async function loadCartolaData() {
    try {
        console.log('Carregando dados do Cartola...');
        const response = await fetch(CARTOLA_API_URL);
        if (!response.ok) throw new Error(`Erro: ${response.status}`);
        cartolaData = await response.json();
        console.log('✅ Cartola:', Object.keys(cartolaData).length, 'jogadores');
    } catch (error) {
        console.error('❌ Erro Cartola:', error);
    }
}

async function loadGatoMestreData() {
    const token = localStorage.getItem('gatoMestreToken');
    if (!token) {
        console.log('⚠️ Token não configurado');
        return;
    }
    
    try {
        console.log('Carregando Gato Mestre...');
        const response = await fetch(GATOMESTRE_API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Erro: ${response.status}`);
        gatoMestreData = await response.json();
        console.log('✅ Gato Mestre:', Object.keys(gatoMestreData).length, 'jogadores');
    } catch (error) {
        console.error('❌ Erro Gato Mestre:', error);
    }
}

function normalizeString(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        parsePlayerData(e.target.result);
    };
    reader.readAsText(file);
}

function parsePlayerData(content) {
    const lines = content.split('\n');
    playerData = [];
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
                capitao: false, unanimidade: false, luxo: false, preco: null, atletaId: null
            };
            for (let j = 4; j < parts.length; j++) {
                const indicator = normalizeString(parts[j].trim());
                if (indicator === 'cap' || indicator === 'capitao') player.capitao = true;
                if (indicator === 'uni' || indicator === 'unanimidade') player.unanimidade = true;
                if (indicator === 'rl' || indicator === 'luxo') player.luxo = true;
            }
            playerData.push(player);
        }
    }
    updatePlayerPrices();
    renderArt();
}

function updatePlayerPrices() {
    if (!cartolaData) return;
    const errors = [];
    playerData.forEach(player => {
        const normalizedPlayerName = normalizeString(player.nome);
        const normalizedClubName = normalizeString(player.clube);
        let found = false;
        
        for (const [atletaId, atleta] of Object.entries(cartolaData)) {
            if (typeof atleta !== 'object') continue;
            
            const atletaNome = normalizeString(atleta.apelido || atleta.nome || '');
            const atletaClube = normalizeString(atleta.clube?.nome || '');
            
            if (atletaNome === normalizedPlayerName && atletaClube === normalizedClubName) {
                player.preco = atleta.preco_num || 0;
                player.atletaId = atletaId;
                found = true;
                break;
            }
        }
        
        if (!found) errors.push(`${player.nome} (${player.clube})`);
    });
    
    const errorDiv = document.getElementById('errorMessages');
    if (errors.length > 0) {
        errorDiv.innerHTML = '<strong>Não encontrados:</strong><br>' + errors.join('<br>');
        errorDiv.classList.add('show');
    } else {
        errorDiv.classList.remove('show');
    }
}

function updateArtTitle() {
    const roundNumber = document.getElementById('roundNumber').value;
    const artTitle = document.getElementById('artTitle');
    if (roundNumber && roundNumber.trim() !== '') {
        artTitle.textContent = `DICAS POR POSIÇÃO - MD3 - RODADA ${roundNumber}`;
    } else {
        artTitle.textContent = 'DICAS POR POSIÇÃO - MD3';
    }
}

function getPlayerMPV(atletaId) {
    if (!gatoMestreData || !atletaId) return null;
    const player = gatoMestreData[atletaId];
    return (player && player.minimo_para_valorizar !== undefined) ? player.minimo_para_valorizar : null;
}

function getMPVColorClass(posicao, mpv) {
    const pos = posicao.toUpperCase();
    if (pos === 'TEC' || pos === 'GOL' || pos === 'ZAG') {
        if (mpv <= 2.5) return 'mpv-green';
        if (mpv <= 6.0) return 'mpv-white';
        return 'mpv-red';
    }
    if (pos === 'LAT') {
        if (mpv <= 3.0) return 'mpv-green';
        if (mpv <= 6.5) return 'mpv-white';
        return 'mpv-red';
    }
    if (pos === 'MEI' || pos === 'ATA') {
        if (mpv <= 3.0) return 'mpv-green';
        if (mpv <= 7.0) return 'mpv-white';
        return 'mpv-red';
    }
    return 'mpv-white';
}

function renderArt() {
    const positions = ['tecnicos', 'goleiros', 'laterais', 'zagueiros', 'meias', 'atacantes'];
    positions.forEach(pos => {
        const container = document.querySelector(`#${pos} .players-list`);
        if (container) container.innerHTML = '';
    });
    playerData.forEach(player => {
        const pos = player.posicao.toUpperCase();
        const containerName = POSITION_MAP[pos];
        const container = document.querySelector(`#${containerName} .players-list`);
        if (container) container.appendChild(createPlayerCard(player));
    });
}

function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = `player-card confidence-${player.confianca.toLowerCase()}`;
    if (player.capitao) card.classList.add('capitao');
    if (player.unanimidade) card.classList.add('unanimidade');
    if (player.luxo) card.classList.add('luxo');
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'player-name';
    nameDiv.textContent = player.nome;
    card.appendChild(nameDiv);
    
    const clubeNormalizado = normalizeString(player.clube);
    const clubeMapeado = CLUB_MAP[player.clube.toUpperCase()] || clubeNormalizado;
    const badgeDiv = document.createElement('div');
    badgeDiv.className = 'club-badge';
    const badgeImg = document.createElement('img');
    badgeImg.src = `escudos/${clubeMapeado}.png`;
    badgeImg.onerror = function() { this.style.display = 'none'; };
    badgeDiv.appendChild(badgeImg);
    card.appendChild(badgeDiv);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'player-info';
    const priceDiv = document.createElement('div');
    priceDiv.className = 'player-price';
    priceDiv.textContent = player.preco !== null ? `C$ ${player.preco.toFixed(2)}` : 'C$ -.--';
    infoDiv.appendChild(priceDiv);
    
    if (player.atletaId) {
        const mpv = getPlayerMPV(player.atletaId);
        if (mpv !== null) {
            const mpvDiv = document.createElement('div');
            mpvDiv.className = `player-mpv ${getMPVColorClass(player.posicao, mpv)}`;
            mpvDiv.textContent = mpv.toFixed(1);
            infoDiv.appendChild(mpvDiv);
        }
    }
    card.appendChild(infoDiv);
    return card;
}

function generateArt() {
    if (!canvas || !ctx) initializeDOM();
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    html2canvas(artLayout, { scale: 2, backgroundColor: '#1a1a1a', width: CANVAS_WIDTH, height: CANVAS_HEIGHT }).then(canvasResult => {
        ctx.drawImage(canvasResult, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        document.getElementById('downloadPngBtn').disabled = false;
        document.getElementById('downloadPdfBtn').disabled = false;
        alert('Arte gerada!');
    });
}

function downloadImage(format) {
    const roundNumber = document.getElementById('roundNumber').value || 'X';
    const filename = `dicas-md3-rodada-${roundNumber}`;
    if (format === 'png') {
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${filename}.png`; a.click();
            URL.revokeObjectURL(url);
        });
    } else if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (CANVAS_HEIGHT * pdfWidth) / CANVAS_WIDTH;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${filename}.pdf`);
    }
}
