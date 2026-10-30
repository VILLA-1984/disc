import * as THREE from 'three';
import { criarAvatar3D } from './avatars.js';
import { continuos } from './audio.js';
import { criarPainelDesempenho } from './desempenho.js';
import { criarEspacoVivo, criarVeiculoEspacial, construirEspaco } from './espaco.js';
import { MEIOS, construirCeu, construirNeve, construirRio, construirTrilhos, criarAeronave, criarBarco, criarNevasca, criarPassaros, criarPeixes, criarVeiculoNeve, criarVeiculoTrilho } from './cenarios.js';

/**
 * Velocimetro em SVG para avatares sobre rodas. A escala vai de 0 a kmhMax; o ponteiro acompanha a
 * velocidade relativa do jogo (1 = normal, turbo ~1,9) multiplicada pelo kmhBase do veiculo.
 */
function criarVelocimetro(parent, info) {
    const raiz = document.createElement('div');
    raiz.className = 'rua-velo';
    raiz.setAttribute('aria-hidden', 'true');

    // Marcas e numeros da escala: 0, meio e fim, mais tracos intermediarios.
    const marcas = [];

    for (let i = 0; i <= 8; i++) {
        const angulo = Math.PI - (i / 8) * Math.PI;
        const grande = i % 4 === 0;
        const r1 = grande ? 38 : 41;
        const x1 = 60 + Math.cos(angulo) * r1;
        const y1 = 60 - Math.sin(angulo) * r1;
        const x2 = 60 + Math.cos(angulo) * 46;
        const y2 = 60 - Math.sin(angulo) * 46;
        marcas.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fff" stroke-width="${grande ? 1.6 : 0.8}" opacity="${grande ? 1 : 0.6}"/>`);
    }

    raiz.innerHTML = `<svg viewBox="0 0 120 72" width="132" role="img" focusable="false">
        <defs><linearGradient id="rua-velo-grad" x1="0" x2="1"><stop offset="0" stop-color="#4cc38a"/><stop offset="0.55" stop-color="#f2b705"/><stop offset="1" stop-color="#e5484d"/></linearGradient></defs>
        <path d="M14 60 A46 46 0 0 1 106 60" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="7" stroke-linecap="round"/>
        <path d="M14 60 A46 46 0 0 1 106 60" fill="none" stroke="url(#rua-velo-grad)" stroke-width="4" stroke-linecap="round"/>
        ${marcas.join('')}
        <text x="14" y="70" fill="#fff" font-size="7" text-anchor="middle">0</text>
        <text x="60" y="11" fill="#fff" font-size="7" text-anchor="middle">${Math.round(info.kmhMax / 2)}</text>
        <text x="106" y="70" fill="#fff" font-size="7" text-anchor="middle">${info.kmhMax}</text>
        <line class="rua-velo-ponteiro" x1="60" y1="60" x2="60" y2="22" stroke="#f08a3c" stroke-width="2.2" stroke-linecap="round" transform="rotate(-90 60 60)"/>
        <circle cx="60" cy="60" r="4" fill="#f08a3c"/>
    </svg>
    <div class="rua-velo-num"><strong>0</strong><small>km/h</small></div>`;
    parent.appendChild(raiz);

    const ponteiro = raiz.querySelector('.rua-velo-ponteiro');
    const numero = raiz.querySelector('strong');
    let kmh = 0;
    let exibido = -1;

    return {
        atualizar(ritmo) {
            const alvo = Math.max(0, ritmo) * info.kmhBase;
            kmh += (alvo - kmh) * 0.2;
            const fracao = Math.min(1, kmh / info.kmhMax);
            ponteiro.setAttribute('transform', `rotate(${(-90 + fracao * 180).toFixed(1)} 60 60)`);
            const inteiro = Math.round(kmh);

            if (inteiro !== exibido) {
                exibido = inteiro;
                numero.textContent = String(inteiro);
            }
        },
        valor: () => Math.round(kmh),
        remover: () => raiz.remove(),
    };
}

/**
 * Jogo da rua em 3D (three.js). Um avatar corre por uma rua e, em cada portao, escolhe UMA entre
 * duas palavras (uma em cada pista). Ele so avanca depois da escolha e a etapa termina quando todos
 * os portoes dela foram atravessados.
 *
 * Duas vistas, mesma cena: '3d' (camera atras do avatar, que corre para o topo da tela, pistas
 * esquerda e direita) e 'lateral' (camera ao lado, o avatar corre para a direita, pistas de cima e
 * de baixo). "cima" e sempre a pista esquerda/de tras e "baixo" a direita/da frente.
 *
 * O modulo so cuida da cena e do HUD. Quem usa decide o resto (textos entre etapas, som, gravacao)
 * pelos callbacks. As etapas chegam prontas (pairs.js). Os fatores DISC nunca aparecem na tela.
 */

const PISTA_X = 2.3;
const LARGURA_ESTRADA = 9;
const PERIODO = 175; // comprimento do ciclo de reciclagem do cenario
const Z_TRAS = 20;

const PORTAO_Z_INICIAL = -74;
const PORTAO_Z_FIM = 9;

/** Ajustes de cada vista: onde o portao fica legivel e para, tamanho das placas e camera. */
const CONFIG = {
    '3d': {
        legivel: -34, parada: -8.5, placaL: 4.5, placaA: 2.25, alturaCima: 3.0, alturaBaixo: 3.0, postes: 2.0, fov: 52,
    },
    lateral: {
        legivel: -14, parada: -6.5, placaL: 3.9, placaA: 1.95, alturaCima: 3.9, alturaBaixo: 2.15, postes: 1.65, fov: 34,
    },
};

const VELOCIDADE = { normal: 11, reduzida: 6.5 };

const COR = { marinho: 0x0d2b4e, azul: 0x1f6fb8, azulClaro: 0x6fa8e0, laranja: 0xf08a3c };

const PREDIOS = ['#1f6fb8', '#0d2b4e', '#f08a3c', '#6fa8e0', '#2f5f94', '#c9d8ea', '#e9b27a'];

/**
 * Climas da rua. O jogo comeca ensolarado e muda a cada poucos portoes; a transicao e gradual.
 * Todos os numeros sao so de ambientacao: o clima nao afeta a velocidade nem as escolhas.
 *   ceu: cor do topo e do horizonte; nevoa: cor e alcance (1 = normal); luz/direta: intensidades;
 *   sol/nuvem: opacidade; nuvemCor: tom das nuvens; chuva/vento: 0 a 1; asfalto: cor da rua.
 */
const CLIMAS = {
    sol: {
        nome: 'Ensolarado', ceuTopo: '#9cc8f0', ceuBase: '#f4f9ff', nevoa: '#dcebf9', alcance: 1,
        luz: 1.5, direta: 1.35, sol: 1, nuvem: 0.85, nuvemCor: '#ffffff', chuva: 0, vento: 0, asfalto: '#3b4a5c', agua: '#2f86b8', solo: '#5aa25c', neve: '#f4f8fc', nuvemVelocidade: 0.6,
    },
    nublado: {
        nome: 'Nublado', ceuTopo: '#8f9cab', ceuBase: '#d8dde4', nevoa: '#c9d0d8', alcance: 0.85,
        luz: 1.25, direta: 0.4, sol: 0, nuvem: 1, nuvemCor: '#b4bcc7', chuva: 0, vento: 0, asfalto: '#36424f', agua: '#4f7288', solo: '#4f8a58', neve: '#dfe6ee', nuvemVelocidade: 0.9,
    },
    chuva: {
        nome: 'Chuvoso', ceuTopo: '#566476', ceuBase: '#a7b2be', nevoa: '#97a3b0', alcance: 0.62,
        luz: 0.98, direta: 0.18, sol: 0, nuvem: 1, nuvemCor: '#7d8896', chuva: 1, vento: 0.15, asfalto: '#27313d', agua: '#3d5a6e', solo: '#3f6e4c', neve: '#cfd8e2', nuvemVelocidade: 1.2,
    },
    // Espaco: nao ha tempo (sol, chuva, vento): o ceu e preto e o clima nunca muda.
    espaco: {
        nome: 'Espaço', ceuTopo: '#01020a', ceuBase: '#0a1233', nevoa: '#050a22', alcance: 2.6,
        luz: 1.05, direta: 1.25, sol: 0, nuvem: 0, nuvemCor: '#000000', chuva: 0, vento: 0, asfalto: '#01020a', agua: '#01020a', solo: '#01020a', neve: '#01020a', nuvemVelocidade: 0,
    },
    vento: {
        nome: 'Ventania', ceuTopo: '#86bde8', ceuBase: '#e6f0fa', nevoa: '#d3e5f4', alcance: 1,
        luz: 1.45, direta: 1.15, sol: 0.85, nuvem: 0.9, nuvemCor: '#f2f6fb', chuva: 0, vento: 1, asfalto: '#3b4a5c', agua: '#3a8bbd', solo: '#5aa25c', neve: '#eef3f9', nuvemVelocidade: 7,
    },
};

/** Quantos portoes entre uma mudanca de clima e a seguinte. */
const PORTOES_POR_CLIMA = 4;

const ICONES_CLIMA = {
    sol: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    nublado: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 1 1 .6-7.95A5.5 5.5 0 0 1 18 11a3.5 3.5 0 0 1-.5 7z"/></svg>',
    chuva: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15a4 4 0 1 1 .6-7.95A5.5 5.5 0 0 1 18 8a3.5 3.5 0 0 1-.5 7"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>',
    vento: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/></svg>',
    espaco: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17v4M17 19h4"/></svg>',
};

/** Gradiente do ceu em um canvas que pode ser redesenhado quando o clima muda. */
function criarCeu() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;

    return {
        textura,
        desenhar(topo, base) {
            const c = canvas.getContext('2d');
            const g = c.createLinearGradient(0, 0, 0, 256);
            g.addColorStop(0, topo);
            g.addColorStop(1, base);
            c.fillStyle = g;
            c.fillRect(0, 0, 2, 256);
            textura.needsUpdate = true;
        },
    };
}

function texturaPredio(cor, sorteio) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const c = canvas.getContext('2d');
    c.fillStyle = cor;
    c.fillRect(0, 0, 128, 256);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(0, 0, 128, 10);

    for (let linha = 0; linha < 8; linha++) {
        for (let coluna = 0; coluna < 4; coluna++) {
            c.fillStyle = sorteio() < 0.68 ? '#ffe9b8' : '#203a5a';
            c.fillRect(10 + coluna * 29, 22 + linha * 29, 17, 19);
        }
    }

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;

    return t;
}

function texturaSol() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    const g = c.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,214,150,1)');
    g.addColorStop(0.35, 'rgba(255,196,120,0.75)');
    g.addColorStop(1, 'rgba(255,196,120,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;

    return t;
}

function texturaNuvem() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const c = canvas.getContext('2d');
    c.fillStyle = 'rgba(255,255,255,0.92)';

    for (const [x, y, r] of [[70, 56, 34], [110, 44, 42], [158, 52, 36], [196, 60, 28], [130, 66, 32]]) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
    }

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;

    return t;
}

/** Desenha uma placa de palavra no canvas (estado: normal, escolhida, descartada). */
function desenharPlaca(canvas, palavra, estado, dica) {
    const c = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const cores = {
        normal: { fundo: '#ffffff', borda: '#1f6fb8', texto: '#0d2b4e' },
        escolhida: { fundo: '#fff1e3', borda: '#f08a3c', texto: '#0d2b4e' },
        descartada: { fundo: '#e9eef5', borda: '#9aa7b6', texto: '#8a97a8' },
    }[estado];

    c.clearRect(0, 0, w, h);
    c.beginPath();
    c.roundRect(12, 12, w - 24, h - 24, 36);
    c.fillStyle = cores.fundo;
    c.fill();
    c.lineWidth = estado === 'escolhida' ? 14 : 10;
    c.strokeStyle = cores.borda;
    c.stroke();

    let tamanho = 108;
    c.font = `bold ${tamanho}px system-ui, "Segoe UI", sans-serif`;

    while (c.measureText(palavra).width > w - 120 && tamanho > 40) {
        tamanho -= 4;
        c.font = `bold ${tamanho}px system-ui, "Segoe UI", sans-serif`;
    }

    c.fillStyle = cores.texto;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(palavra, w / 2, h / 2 + 8);

    // Etiqueta do lado, no canto correspondente da placa: azul "← ESQUERDA" / laranja "DIREITA →".
    if (dica) {
        c.font = 'bold 40px system-ui, "Segoe UI", sans-serif';
        const largura = Math.ceil(c.measureText(dica.texto).width) + 40;
        const x = dica.direita ? w - 28 - largura : 28;

        c.beginPath();
        c.roundRect(x, 22, largura, 64, 16);
        c.fillStyle = estado === 'descartada' ? '#b9c3d0' : dica.cor;
        c.fill();
        c.fillStyle = '#ffffff';
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillText(dica.texto, x + 20, 55);
    }
}

/**
 * @param {object} opcoes
 * @param {HTMLElement} opcoes.parent elemento onde o canvas e criado
 * @param {{cima: object, baixo: object, combinacao: string}[][]} opcoes.etapas portoes de cada etapa
 * @param {object} opcoes.avatar especificacao do avatar (ver avatars.js)
 * @param {'3d'|'lateral'} [opcoes.modo]
 * @param {'rua'|'rio'|'ar'} [opcoes.cenario] so o visual: o resto do jogo e igual
 * @param {string} [opcoes.meio] meio de locomocao do cenario (rio: barco, veleiro; ar: aviao, jato, helicoptero,
 *        asa-delta, parapente); ver MEIOS em cenarios.js
 * @param {string[]} [opcoes.rotulosEtapas]
 * @param {boolean} [opcoes.reduzirMovimento]
 * @param {Function} [opcoes.aoPronto]
 * @param {Function} [opcoes.proximoPortao] modo ciclo: ({etapa, indice}) => {cima, baixo} | null (null encerra a etapa)
 * @param {Function} [opcoes.aoPortao] portao legivel: {etapa, indice, total, cima, baixo}
 * @param {Function} [opcoes.aoEscolher] {etapa, indice, lado, escolhida, outra, combinacao, tempoMs}
 * @param {Function} [opcoes.aoConcluirEtapa] {etapa, escolhas}
 * @param {Function} [opcoes.aoPasso] a cada passada do avatar (para o som)
 */
export function criarJogo3D(opcoes) {
    const { parent, etapas, rotulosEtapas = [], reduzirMovimento = false } = opcoes;
    const modo = opcoes.modo === 'lateral' ? 'lateral' : '3d';
    const cenario = ['rio', 'ar', 'neve', 'trilhos', 'espaco'].includes(opcoes.cenario) ? opcoes.cenario : 'rua'; // ver cenarios.js
    const cfg = CONFIG[modo];
    const velocidadeBase = reduzirMovimento ? VELOCIDADE.reduzida : VELOCIDADE.normal;

    // ------------------------------------------------------------ renderizador
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation';
    parent.appendChild(renderer.domElement);
    const painelDesempenho = criarPainelDesempenho(renderer, parent);

    const cena = new THREE.Scene();
    const ceu = criarCeu();
    ceu.desenhar(CLIMAS.sol.ceuTopo, CLIMAS.sol.ceuBase);
    cena.background = ceu.textura;
    const nevoaBase = modo === '3d' ? { perto: 36, longe: 125 } : { perto: 40, longe: 160 };
    cena.fog = new THREE.Fog(0xdcebf9, nevoaBase.perto, nevoaBase.longe);
    const luzCeu = new THREE.HemisphereLight(0xffffff, 0x8fa5bf, 1.5);
    cena.add(luzCeu);
    const sol = new THREE.DirectionalLight(0xfff3dc, 1.35);
    sol.position.set(-8, 14, 6);
    cena.add(sol);

    const camera = new THREE.PerspectiveCamera(cfg.fov, 16 / 9, 0.1, 300);

    // ------------------------------------------------------------------ curvas
    // A rua faz curvas suaves na vista 3D: no vertex shader, tudo que esta longe sai um pouco para o
    // lado em proporcao ao quadrado da distancia (a tecnica do "mundo curvo"). Nada muda de lugar na
    // logica do jogo, so no desenho. Desligado na vista lateral e com "reduzir movimento".
    const curvasAtivas = modo === '3d' && !reduzirMovimento;
    const uCurva = { value: 0 };

    function curvarMaterial(material) {
        if (!curvasAtivas || material.userData.curvado || !(material.isMeshLambertMaterial || material.isMeshBasicMaterial)) {
            return;
        }

        material.userData.curvado = true;
        material.customProgramCacheKey = () => 'curvado';
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uCurva = uCurva;
            shader.vertexShader = `uniform float uCurva;\n${shader.vertexShader.replace(
                '#include <project_vertex>',
                '#include <project_vertex>\nmvPosition.x += uCurva * mvPosition.z * mvPosition.z;\ngl_Position = projectionMatrix * mvPosition;',
            )}`;
        };
        material.needsUpdate = true;
    }

    function curvarObjeto(objeto) {
        if (!curvasAtivas) {
            return;
        }

        objeto.traverse((o) => {
            if (o.material) {
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(curvarMaterial);
            }
        });
    }

    // ---------------------------------------------------------------- cenario
    const sorteio = (() => {
        let s = 20261028;

        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;

            return s / 4294967296;
        };
    })();

    const movel = []; // itens que andam com a rua: { obj, comprimento }
    const arvores = []; // balancam com o vento
    const lados = { esquerdo: new THREE.Group(), direito: new THREE.Group() };
    cena.add(lados.esquerdo, lados.direito);

    function adicionarMovel(obj, comprimento, zInicial, pai = cena) {
        obj.position.z = zInicial;
        pai.add(obj);
        movel.push({ obj, comprimento });
    }

    // Rio: agua, margens, mata e palafitas no lugar da rua e dos predios (cenarios.js). `estrada` e a
    // superficie sobre a qual o avatar corre: asfalto na rua, agua no rio.
    const rio = cenario === 'rio'
        ? construirRio({ cena, lados, adicionarMovel, arvores, sorteio, periodo: PERIODO, zTras: Z_TRAS })
        : null;
    const aereo = cenario === 'ar'
        ? construirCeu({ cena, adicionarMovel, sorteio, periodo: PERIODO, zTras: Z_TRAS })
        : null;
    const gelo = cenario === 'neve'
        ? construirNeve({ cena, lados, adicionarMovel, arvores, sorteio, periodo: PERIODO, zTras: Z_TRAS })
        : null;
    const ferrovia = cenario === 'trilhos'
        ? construirTrilhos({ cena, lados, adicionarMovel, arvores, sorteio, periodo: PERIODO, zTras: Z_TRAS })
        : null;
    const espacial = cenario === 'espaco'
        ? construirEspaco({ cena, lados, adicionarMovel, sorteio, periodo: PERIODO, zTras: Z_TRAS, modo })
        : null;
    const mundo = rio ?? aereo ?? gelo ?? ferrovia ?? espacial; // cenario sem rua nem predios (rio, ceu, neve, trilhos ou espaco)
    const estrada = rio ? rio.agua : (aereo ? aereo.solo : (gelo ? gelo.solo : (ferrovia ? ferrovia.solo : (espacial ? espacial.solo : new THREE.Mesh(new THREE.BoxGeometry(LARGURA_ESTRADA, 0.1, 420, 1, 1, 140), new THREE.MeshLambertMaterial({ color: 0x3b4a5c }))))));

    if (!mundo) {
        estrada.position.set(0, -0.05, -170);
        cena.add(estrada);

        for (const lado of [-1, 1]) {
            const calcada = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 420, 1, 1, 140), new THREE.MeshLambertMaterial({ color: 0xc9d3df }));
            calcada.position.set(lado * (LARGURA_ESTRADA / 2 + 2.1), 0, -170);
            cena.add(calcada);
            const meioFio = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 420, 1, 1, 140), new THREE.MeshLambertMaterial({ color: 0x9aa7b6 }));
            meioFio.position.set(lado * (LARGURA_ESTRADA / 2 + 0.1), 0.01, -170);
            cena.add(meioFio);
        }
    }

    // Faixa central tracejada.
    const tracoGeo = new THREE.BoxGeometry(0.18, 0.03, 1.8);
    const tracoMat = new THREE.MeshLambertMaterial({ color: 0xf6f1e0 });

    for (let i = 0; !mundo && i < PERIODO / 5; i++) {
        const traco = new THREE.Mesh(tracoGeo, tracoMat);
        traco.position.set(0, 0.02, 0);
        adicionarMovel(traco, 0, Z_TRAS - i * 5 - 2.5);
    }

    // Predios dos dois lados (comprimentos normalizados para fechar o ciclo sem emendas).
    const texturas = mundo ? [] : PREDIOS.map((cor) => texturaPredio(cor, sorteio));

    for (const lado of mundo ? [] : [-1, 1]) {
        const quantidade = 14;
        const brutos = Array.from({ length: quantidade }, () => 0.7 + sorteio() * 0.7);
        const soma = brutos.reduce((a, b) => a + b, 0);
        let percorrido = 0;

        brutos.forEach((bruto, i) => {
            const comprimento = (bruto / soma) * PERIODO;
            const altura = 9 + sorteio() * 15;
            const largura = 5 + sorteio() * 3;
            const predio = new THREE.Mesh(
                new THREE.BoxGeometry(largura, altura, comprimento - 1, 1, 1, 4),
                new THREE.MeshLambertMaterial({ map: texturas[(i + (lado > 0 ? 3 : 0)) % texturas.length] }),
            );
            predio.position.set(lado * (LARGURA_ESTRADA / 2 + 4.4 + largura / 2), altura / 2, 0);
            adicionarMovel(predio, comprimento, Z_TRAS - percorrido - comprimento / 2, lado < 0 ? lados.esquerdo : lados.direito);
            percorrido += comprimento;
        });

        // Postes de luz e arvores nas calcadas.
        for (let i = 0; i < PERIODO / 17.5; i++) {
            const poste = new THREE.Group();
            poste.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.4, 8), new THREE.MeshLambertMaterial({ color: 0x4a5668 })), { }));
            poste.children[0].position.y = 2.2;
            const lampada = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe9b8 }));
            lampada.position.set(-lado * 0.35, 4.5, 0);
            poste.add(lampada);
            poste.position.x = lado * (LARGURA_ESTRADA / 2 + 0.9);
            adicionarMovel(poste, 0, Z_TRAS - i * 17.5 - 4, lado < 0 ? lados.esquerdo : lados.direito);

            const arvore = new THREE.Group();
            const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.5, 8), new THREE.MeshLambertMaterial({ color: 0x6b4a2e }));
            tronco.position.y = 0.75;
            const copa = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), new THREE.MeshLambertMaterial({ color: i % 2 ? 0x3f9b5f : 0x2e8350 }));
            copa.position.y = 2.2;
            arvore.add(tronco, copa);
            arvore.position.x = lado * (LARGURA_ESTRADA / 2 + 3.2);
            arvores.push(arvore);
            adicionarMovel(arvore, 0, Z_TRAS - i * 17.5 - 13, lado < 0 ? lados.esquerdo : lados.direito);
        }
    }

    // Sol e nuvens ao fundo.
    const solSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaSol(), transparent: true, fog: false, depthWrite: false }));
    solSprite.scale.set(46, 46, 1);
    solSprite.position.set(modo === '3d' ? 26 : -40, modo === '3d' ? 30 : 34, -150);
    cena.add(solSprite);

    const nuvemTextura = texturaNuvem();
    const nuvens = [];

    for (let i = 0; i < 7; i++) {
        const nuvem = new THREE.Sprite(new THREE.SpriteMaterial({ map: nuvemTextura, transparent: true, fog: false, depthWrite: false, opacity: 0.9 }));
        nuvem.scale.set(34 + sorteio() * 22, 13 + sorteio() * 8, 1);
        nuvem.position.set(-80 + i * 28 + sorteio() * 10, 26 + sorteio() * 18, -120 - sorteio() * 40);
        cena.add(nuvem);
        nuvens.push(nuvem);
    }

    // Lateral: os predios do lado da camera taparia a cena.
    if (modo === 'lateral') {
        lados.direito.visible = false;
    }

    // ------------------------------------------------------------------ avatar
    // No rio e no ceu o avatar segue o mesmo, mas num veiculo (barco, veleiro, aviao, jato, helicoptero, asa
    // delta, parapente): no rio de colete salva-vidas, sentado no banco. O veiculo e filho do avatar: acompanha
    // troca de pista, inclinacao e salto; a escala inversa mantem o tamanho real.
    const meioEscolhido = opcoes.meio ?? (rio ? 'barco' : (aereo ? 'aviao' : (gelo ? 'treno' : (ferrovia ? 'locomotiva' : (espacial ? 'nave' : undefined)))));
    const infoMeio = MEIOS[meioEscolhido] ?? {};
    const ALTURA_CONVES = infoMeio.base ?? 0.34;
    const sentadoNoMeio = infoMeio.sentado !== false; // a asa delta pendura o avatar em pe
    // Alguns meios levam o avatar sem apoios (a cadeira, a bengala e o andador ficam na margem), e outros
    // pedem os bracos numa posicao (remo, guidao, comandos da vela).
    const tracosDoMeio = {
        ...(infoMeio.semApoio ? { mobilidade: 'anda' } : {}),
        ...(infoMeio.nadando ? { nadando: true, noBarco: false } : {}), // deitado de bruços, sem banco
        ...(infoMeio.bombeando ? { bombeando: true } : {}), // bracos na alavanca da draisina
        ...(infoMeio.bracos !== undefined ? { anguloBracos: infoMeio.bracos } : {}),
    };
    const specAvatar = rio
        ? { ...opcoes.avatar, colete: true, noBarco: true, ...tracosDoMeio }
        : ((aereo || gelo || ferrovia || espacial) ? { ...opcoes.avatar, noBarco: sentadoNoMeio, ...tracosDoMeio } : opcoes.avatar);
    const avatar = criarAvatar3D(specAvatar);
    avatar.grupo.position.set(0, 0, 0);
    cena.add(avatar.grupo);

    // Quando um modelo pronto (glTF) entra no lugar do veiculo, a pessoa passa a ir por dentro dele.
    const esconderAvatar = () => {
        for (const parte of avatar.grupo.children) {
            if (parte !== barco.grupo) {
                parte.visible = false;
            }
        }
    };
    const barco = rio
        ? criarBarco(meioEscolhido, modo)
        : (aereo
            ? criarAeronave(meioEscolhido, modo)
            : (gelo ? criarVeiculoNeve(meioEscolhido) : (ferrovia ? criarVeiculoTrilho(meioEscolhido, modo, { aoModelo: esconderAvatar }) : (espacial ? criarVeiculoEspacial(meioEscolhido, modo) : null))));

    if (barco) {
        barco.grupo.scale.setScalar(1 / avatar.grupo.scale.x);
        avatar.grupo.add(barco.grupo);

        // No espaco so o astronauta mostra o avatar (de traje); nave, foguete e disco levam a pessoa por dentro.
        if (espacial && meioEscolhido !== 'astronauta') {
            for (const parte of avatar.grupo.children) {
                if (parte !== barco.grupo) {
                    parte.visible = false;
                }
            }
        }
    }

    // Enfeites vivos (so visuais; ficam de fora com "reduzir movimento"): peixes que pulam no rio, passaros no ceu.
    const peixes = rio && !reduzirMovimento ? criarPeixes({ cena, sorteio }) : null;
    const passaros = aereo && !reduzirMovimento ? criarPassaros({ cena, sorteio }) : null;
    const nevasca = gelo && !reduzirMovimento ? criarNevasca({ cena, sorteio }) : null;
    const espacoVivo = espacial && !reduzirMovimento ? criarEspacoVivo({ cena, sorteio, planetas: espacial.planetas, modo }) : null;

    // Som do meio de locomocao: motor no barco, aviao, jato e helicoptero; veleiro, asa delta e parapente
    // so tem o ar do turbo.
    const semMotor = ['veleiro', 'caiaque', 'boia-pato', 'nado', 'asa-delta', 'parapente', 'esqui', 'sit-ski', 'treno', 'astronauta'].includes(meioEscolhido);
    const somDoMeio = mundo ? (meioEscolhido === 'draisina' ? 'rodas' : (semMotor ? 'passos' : 'motor')) : avatar.info.som;
    curvarObjeto(cena);

    // ------------------------------------------------------------------- clima
    const climaAlvo = { ...CLIMAS.sol };
    const climaAtual = {
        ...CLIMAS.sol,
        ceuTopo: new THREE.Color(CLIMAS.sol.ceuTopo),
        ceuBase: new THREE.Color(CLIMAS.sol.ceuBase),
        nevoa: new THREE.Color(CLIMAS.sol.nevoa),
        nuvemCor: new THREE.Color(CLIMAS.sol.nuvemCor),
        asfalto: new THREE.Color(CLIMAS.sol.asfalto),
        agua: new THREE.Color(CLIMAS.sol.agua),
        solo: new THREE.Color(CLIMAS.sol.solo),
        neve: new THREE.Color(CLIMAS.sol.neve),
    };
    let nomeClima = 'sol';
    let portoesPassados = 0;
    let ultimoCeu = '';

    // Chuva: tracos que caem; acompanham a rua (somam dz) para dar a sensacao de correr debaixo dela.
    const GOTAS = 460;
    const gotas = new Float32Array(GOTAS * 6);
    const chuvaGeo = new THREE.BufferGeometry();
    chuvaGeo.setAttribute('position', new THREE.BufferAttribute(gotas, 3));
    const chuva = new THREE.LineSegments(chuvaGeo, new THREE.LineBasicMaterial({ color: 0xd6e8f8, transparent: true, opacity: 0, depthWrite: false }));
    chuva.frustumCulled = false;
    chuva.visible = false;
    cena.add(chuva);

    function reposicionarGota(i, topo = false) {
        const x = -15 + sorteio() * 30;
        const y = topo ? 14 + sorteio() * 3 : sorteio() * 16;
        const z = -75 + sorteio() * 85;
        gotas.set([x, y, z, x - 0.05, y + 0.7, z], i * 6);
    }

    for (let i = 0; i < GOTAS; i++) {
        reposicionarGota(i);
    }

    // Vento: folhas e poeira clara cruzando a tela, e arvores que balancam.
    const FOLHAS = 90;
    const folhas = new Float32Array(FOLHAS * 3);
    const folhasGeo = new THREE.BufferGeometry();
    folhasGeo.setAttribute('position', new THREE.BufferAttribute(folhas, 3));
    const folhasMat = new THREE.PointsMaterial({ color: 0xeaf3ff, size: 0.16, transparent: true, opacity: 0, depthWrite: false });
    const folhasPontos = new THREE.Points(folhasGeo, folhasMat);
    folhasPontos.frustumCulled = false;
    folhasPontos.visible = false;
    cena.add(folhasPontos);

    for (let i = 0; i < FOLHAS; i++) {
        folhas.set([-20 + sorteio() * 40, 0.4 + sorteio() * 6, -70 + sorteio() * 80], i * 3);
    }

    const hudClimaEl = document.createElement('span');

    function escolherClima(nome) {
        nomeClima = nome;
        Object.assign(climaAlvo, CLIMAS[nome]);
        hudClimaEl.innerHTML = `${ICONES_CLIMA[nome]}<span>${CLIMAS[nome].nome}</span>`;
        hudClimaEl.setAttribute('aria-label', `Clima: ${CLIMAS[nome].nome}`);
    }

    /** Proximo clima: sempre diferente do atual, sorteado de forma reproduzivel. */
    function proximoClima() {
        if (cenario === 'espaco') {
            return; // no espaco o clima nunca muda
        }

        const outros = Object.keys(CLIMAS).filter((c) => c !== nomeClima);
        escolherClima(outros[Math.floor(sorteio() * outros.length)]);
    }

    function atualizarClima(dt) {
        const k = Math.min(1, dt * 0.9);
        const lerpNum = (a, b) => a + (b - a) * k;

        for (const chave of ['alcance', 'luz', 'direta', 'sol', 'nuvem', 'chuva', 'vento', 'nuvemVelocidade']) {
            climaAtual[chave] = lerpNum(climaAtual[chave], climaAlvo[chave]);
        }

        for (const chave of ['ceuTopo', 'ceuBase', 'nevoa', 'nuvemCor', 'asfalto', 'agua', 'solo', 'neve']) {
            climaAtual[chave].lerp(new THREE.Color(climaAlvo[chave]), k);
        }

        const assinatura = `${climaAtual.ceuTopo.getHexString()}${climaAtual.ceuBase.getHexString()}`;

        if (assinatura !== ultimoCeu) {
            ultimoCeu = assinatura;
            ceu.desenhar(`#${climaAtual.ceuTopo.getHexString()}`, `#${climaAtual.ceuBase.getHexString()}`);
        }

        cena.fog.color.copy(climaAtual.nevoa);
        cena.fog.near = nevoaBase.perto * climaAtual.alcance;
        cena.fog.far = nevoaBase.longe * climaAtual.alcance;
        luzCeu.intensity = climaAtual.luz;
        sol.intensity = climaAtual.direta;
        solSprite.material.opacity = climaAtual.sol;
        solSprite.visible = climaAtual.sol > 0.02;
        estrada.material.color.copy(rio ? climaAtual.agua : (aereo ? climaAtual.solo : (gelo ? climaAtual.neve : climaAtual.asfalto)));

        for (const nuvem of nuvens) {
            nuvem.material.opacity = climaAtual.nuvem;
            nuvem.material.color.copy(climaAtual.nuvemCor);
        }

        // Particulas so quando ha movimento permitido.
        const chuvaVisivel = !reduzirMovimento && !gelo && climaAtual.chuva > 0.03; // na neve cai neve, nao chuva
        chuva.visible = chuvaVisivel;
        chuva.material.opacity = 0.5 * climaAtual.chuva;
        const ventoVisivel = !reduzirMovimento && climaAtual.vento > 0.08;
        folhasPontos.visible = ventoVisivel;
        folhasMat.opacity = Math.min(0.85, climaAtual.vento * 0.85);

        continuos.clima.definir({ chuva: climaAtual.chuva, vento: climaAtual.vento });
    }

    function moverParticulasDoClima(dt, dz) {
        if (chuva.visible) {
            for (let i = 0; i < GOTAS; i++) {
                const o = i * 6;
                const queda = 26 * dt;
                gotas[o + 1] -= queda;
                gotas[o + 4] -= queda;
                gotas[o + 2] += dz;
                gotas[o + 5] += dz;

                if (gotas[o + 1] < 0 || gotas[o + 2] > 10) {
                    reposicionarGota(i, true);
                    // gotas que reaparecem na frente da camera devem vir de longe
                    if (gotas[o + 2] > 0) {
                        gotas[o + 2] -= 70;
                        gotas[o + 5] -= 70;
                    }
                }
            }

            chuvaGeo.attributes.position.needsUpdate = true;
        }

        if (folhasPontos.visible) {
            for (let i = 0; i < FOLHAS; i++) {
                const o = i * 3;
                folhas[o] += (14 + (i % 5)) * dt * climaAtual.vento;
                folhas[o + 1] += Math.sin(agoraSeg * 3 + i) * dt * 0.8;
                folhas[o + 2] += dz;

                if (folhas[o] > 22 || folhas[o + 2] > 10) {
                    folhas[o] = -22;
                    folhas[o + 2] = -70 + sorteio() * 75;
                }
            }

            folhasGeo.attributes.position.needsUpdate = true;
        }

        if (!reduzirMovimento) {
            arvores.forEach((a, i) => { a.rotation.z = Math.sin(agoraSeg * 2.2 + i) * 0.1 * climaAtual.vento; });
        }
    }

    // ------------------------------------------------------------------ estado
    const hud = document.createElement('div');
    hud.className = 'rua-hud';
    hud.innerHTML = `<div class="rua-hud-linha">
            <span class="rua-hud-etapa"></span>
            <span class="rua-hud-bolas" aria-hidden="true"></span>
            <span class="rua-hud-clima" aria-hidden="true"></span>
            <span class="rua-hud-conta" aria-live="off"></span>
        </div>
        <div class="rua-hud-barra" role="progressbar" aria-label="Progresso do teste" aria-valuemin="0" aria-valuemax="100"><i></i></div>`;
    parent.appendChild(hud);
    const hudEtapa = hud.querySelector('.rua-hud-etapa');
    const hudBolas = hud.querySelector('.rua-hud-bolas');
    const hudConta = hud.querySelector('.rua-hud-conta');
    const hudBarra = hud.querySelector('.rua-hud-barra');
    const hudBarraPreenchimento = hudBarra.querySelector('i');
    hudClimaEl.className = 'rua-hud-clima-item';
    hud.querySelector('.rua-hud-clima').appendChild(hudClimaEl);
    escolherClima(cenario === 'espaco' ? 'espaco' : 'sol');

    // Velocimetro: so para quem se desloca sobre rodas (moto, taxi, cadeiras).
    const velocimetro = !mundo && avatar.info.rodas ? criarVelocimetro(parent, avatar.info) : null;

    // Linhas de velocidade na tela, ligadas enquanto o turbo esta ativo.
    const linhas = document.createElement('div');
    linhas.className = `rua-linhas rua-linhas--${modo}`;
    linhas.setAttribute('aria-hidden', 'true');
    parent.appendChild(linhas);

    // Fumaca (veiculos) ou poeira (a pe e cadeiras) soltas no turbo.
    const particulas = [];
    const particulaGeo = new THREE.SphereGeometry(0.12, 8, 6);
    let proximaParticula = 0;
    let agoraSeg = 0;
    let distancia = 0;
    let turboAnterior = false;

    let etapaAtual = -1;
    let indice = 0;
    let escolhasNaEtapa = 0;
    // Modo ciclo: os portoes nao vem prontos, sao pedidos um a um (proximoPortao) e o progresso vem de fora.
    const dinamico = typeof opcoes.proximoPortao === 'function';
    let progressoExterno = null;
    let fracaoMapa = 0;
    let estado = 'parado'; // parado | correndo | concluida
    let velocidade = 0;
    let fase = 0;
    let faseDoUltimoPasso = 0;
    let portao = null;
    let alvoX = 0;
    let saltoRestante = 0;
    const faiscas = [];
    let ultimoQuadro = performance.now();
    let rodando = true;
    let quadroId = 0;

    // Mesmas cores e textos dos botoes embaixo do jogo (rua.css: --lado-esq e --lado-dir).
    const teclaDeLado = modo === '3d'
        ? { cima: { texto: '← ESQUERDA', cor: '#1f6fb8', direita: false }, baixo: { texto: 'DIREITA →', cor: '#c85f0f', direita: true } }
        : { cima: { texto: '↑ CIMA', cor: '#1f6fb8', direita: false }, baixo: { texto: '↓ BAIXO', cor: '#c85f0f', direita: true } };

    function atualizarHud() {
        hudEtapa.textContent = rotulosEtapas[etapaAtual] ?? `Etapa ${etapaAtual + 1}`;

        let total;
        let feitasNaEtapa;
        let percentual;
        let texto;

        if (progressoExterno) {
            ({ total, feitas: feitasNaEtapa, percentual, texto } = progressoExterno);
        } else {
            total = etapas[etapaAtual]?.length ?? 0;
            feitasNaEtapa = escolhasNaEtapa;

            // A barra mostra o teste inteiro (todas as etapas), nao so a etapa atual.
            const geral = etapas.reduce((soma, e) => soma + e.length, 0);
            const feitas = etapas.slice(0, Math.max(0, etapaAtual)).reduce((soma, e) => soma + e.length, 0) + escolhasNaEtapa;
            percentual = geral === 0 ? 0 : Math.round((feitas / geral) * 100);
            texto = `Escolhas ${escolhasNaEtapa}/${total} · ${percentual}%`;
        }

        hudBarraPreenchimento.style.width = `${percentual}%`;
        hudBarra.setAttribute('aria-valuenow', String(percentual));
        hudConta.textContent = texto;
        // No ciclo (24 escolhas por etapa) as bolinhas quebrariam em duas linhas: a barra e o contador bastam.
        hudBolas.innerHTML = progressoExterno ? '' : Array.from({ length: total }, (_, i) => {
            const classe = i < feitasNaEtapa ? 'feita' : (i === feitasNaEtapa ? 'atual' : '');

            return `<i class="${classe}"></i>`;
        }).join('');
    }

    // ----------------------------------------------------------------- minimapa
    // Pista estilizada (a rua e reta; o desenho so representa o trajeto da etapa): largada embaixo, chegada
    // no alto, e um ponto que anda conforme as escolhas.
    const TRACADO = 'M14 62 C14 44 34 40 46 50 S64 70 78 54 S86 22 106 14';
    const mapa = document.createElement('div');
    mapa.className = 'rua-mapa';
    mapa.setAttribute('aria-hidden', 'true');
    mapa.innerHTML = `<svg viewBox="0 0 120 76" focusable="false">
            <path class="rua-mapa-pista" d="${TRACADO}" fill="none"/>
            <path class="rua-mapa-feito" d="${TRACADO}" fill="none"/>
            <circle class="rua-mapa-largada" cx="14" cy="62" r="4.5"/>
            <g class="rua-mapa-chegada">
                <path d="M106 14 V1" fill="none"/>
                <rect x="106" y="1" width="5" height="5"/><rect x="111" y="6" width="5" height="5"/>
                <rect class="claro" x="111" y="1" width="5" height="5"/><rect class="claro" x="106" y="6" width="5" height="5"/>
            </g>
            <circle class="rua-mapa-ponto" cx="14" cy="62" r="5"/>
        </svg>
        <div class="rua-mapa-legenda"><span>Largada</span><span>Chegada</span></div>`;
    parent.appendChild(mapa);
    const mapaPista = mapa.querySelector('.rua-mapa-pista');
    const mapaFeito = mapa.querySelector('.rua-mapa-feito');
    const mapaPonto = mapa.querySelector('.rua-mapa-ponto');

    function fracaoAlvoDoMapa() {
        if (dinamico) {
            return progressoExterno && progressoExterno.total > 0 ? progressoExterno.feitas / progressoExterno.total : 0;
        }

        const total = etapas[etapaAtual]?.length ?? 0;

        return total > 0 ? (indice + (portao?.escolhido ? 1 : 0)) / total : 0;
    }

    function atualizarMapa(dt) {
        const alvo = Math.min(1, fracaoAlvoDoMapa());
        fracaoMapa += (alvo - fracaoMapa) * Math.min(1, dt * 3);

        const comprimento = mapaPista.getTotalLength();

        if (!comprimento) {
            return;
        }

        const ponto = mapaPista.getPointAtLength(comprimento * fracaoMapa);
        mapaPonto.setAttribute('cx', ponto.x.toFixed(2));
        mapaPonto.setAttribute('cy', ponto.y.toFixed(2));
        mapaFeito.style.strokeDasharray = `${(comprimento * fracaoMapa).toFixed(2)} ${comprimento.toFixed(2)}`;
    }

    // ----------------------------------------------------------------- portoes
    function criarPortao(dados) {
        const grupo = new THREE.Group();
        const placas = {};

        for (const lado of ['cima', 'baixo']) {
            const x = lado === 'cima' ? -PISTA_X : PISTA_X;
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 256;
            desenharPlaca(canvas, dados[lado].word, 'normal', teclaDeLado[lado]);
            const textura = new THREE.CanvasTexture(canvas);
            textura.colorSpace = THREE.SRGBColorSpace;
            textura.anisotropy = 4;

            const conjunto = new THREE.Group();
            const altura = lado === 'cima' ? cfg.alturaCima : cfg.alturaBaixo;
            const painel = new THREE.Mesh(new THREE.PlaneGeometry(cfg.placaL, cfg.placaA), new THREE.MeshBasicMaterial({ map: textura, transparent: true, fog: false }));
            painel.position.y = altura;
            painel.userData.lado = lado;
            const posteMaterial = new THREE.MeshLambertMaterial({ color: COR.azul });
            const postes = [-cfg.postes, cfg.postes].map((dx) => {
                const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, altura, 8), posteMaterial);
                poste.position.set(dx, altura / 2, -0.04);

                return poste;
            });
            conjunto.add(painel, ...postes);
            conjunto.position.x = x;

            if (modo === 'lateral') {
                conjunto.rotation.y = Math.PI / 2;
            }

            grupo.add(conjunto);
            placas[lado] = { canvas, textura, painel, posteMaterial, conjunto, palavra: dados[lado].word, escala: 1 };
        }

        // Faixa de pedestres sob o portao.
        const faixa = mundo ? mundo.basePortao() : new THREE.Group();

        for (let i = -4; !mundo && i <= 4; i++) {
            const risco = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 3.2), new THREE.MeshLambertMaterial({ color: 0xf6f1e0 }));
            risco.position.set(i * 0.95, 0.03, 0);
            faixa.add(risco);
        }

        grupo.add(faixa);
        grupo.position.z = PORTAO_Z_INICIAL;
        cena.add(grupo);
        curvarObjeto(grupo);

        return { grupo, placas, dados, escolhivel: false, escolhido: false, inicioMs: 0 };
    }

    function dadosDoPortao(i) {
        return dinamico ? opcoes.proximoPortao({ etapa: etapaAtual, indice: i }) : (etapas[etapaAtual]?.[i] ?? null);
    }

    /** Cria o portao seguinte; false quando a etapa acabou. */
    function gerarPortao() {
        const dados = dadosDoPortao(indice);

        if (!dados) {
            return false;
        }

        portao = criarPortao(dados);

        return true;
    }

    function liberarPortao() {
        portao.escolhivel = true;
        portao.inicioMs = performance.now();
        opcoes.aoPortao?.({
            etapa: etapaAtual,
            indice,
            total: dinamico ? (progressoExterno?.total ?? 0) : etapas[etapaAtual].length,
            cima: portao.dados.cima,
            baixo: portao.dados.baixo,
        });
    }

    function descartarPortao() {
        if (!portao) {
            return;
        }

        cena.remove(portao.grupo);

        for (const p of Object.values(portao.placas)) {
            p.textura.dispose();
            p.painel.material.dispose();
            p.painel.geometry.dispose();
        }

        portao = null;
    }

    // ------------------------------------------------------------------ escolha
    function soltarFaiscas() {
        if (reduzirMovimento) {
            return;
        }

        for (let i = 0; i < 16; i++) {
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? COR.laranja : COR.azulClaro, transparent: true }));
            m.position.copy(avatar.grupo.position).add(new THREE.Vector3(0, 1.6, -0.4));
            const angulo = (i / 16) * Math.PI * 2;
            faiscas.push({ m, vx: Math.cos(angulo) * 3.2, vy: 2 + Math.sin(angulo * 2) * 1.2, vz: Math.sin(angulo) * 3.2, vida: 0.7 });
            cena.add(m);
        }
    }

    /** Fumaca escura saindo do escape (veiculos a motor) ou poeira clara nos pes (os demais). */
    function soltarParticula() {
        const motor = somDoMeio === 'motor' && !mundo;
        const material = new THREE.MeshBasicMaterial({ color: motor ? 0x59616b : (mundo ? 0xeaf6ff : 0xe9dfcb), transparent: true, opacity: 0.55, depthWrite: false });
        const m = new THREE.Mesh(particulaGeo, material);
        const traseira = motor ? 1.9 : 0.55;
        m.position.set(avatar.grupo.position.x + (motor ? 0.2 : (Math.random() - 0.5) * 0.4), motor ? 0.4 : 0.12, traseira);
        cena.add(m);
        particulas.push({ m, vida: 0.7, vx: (Math.random() - 0.5) * 0.6, vy: motor ? 0.5 : 0.35, vz: 0.4 });
    }

    function atualizarParticulas(dt, dz) {
        for (let i = particulas.length - 1; i >= 0; i--) {
            const p = particulas[i];
            p.vida -= dt;
            p.m.position.x += p.vx * dt;
            p.m.position.y += p.vy * dt;
            p.m.position.z += dz + p.vz * dt; // fica para tras junto com a rua
            p.m.scale.multiplyScalar(1 + dt * 2.4);
            p.m.material.opacity = Math.max(0, (p.vida / 0.7) * 0.55);

            if (p.vida <= 0) {
                cena.remove(p.m);
                p.m.material.dispose();
                particulas.splice(i, 1);
            }
        }
    }

    function escolher(lado) {
        if (estado !== 'correndo' || !portao || !portao.escolhivel || portao.escolhido) {
            return false;
        }

        portao.escolhido = true;
        const outro = lado === 'cima' ? 'baixo' : 'cima';
        const tempoMs = Math.round(performance.now() - portao.inicioMs);

        desenharPlaca(portao.placas[lado].canvas, portao.placas[lado].palavra, 'escolhida', teclaDeLado[lado]);
        desenharPlaca(portao.placas[outro].canvas, portao.placas[outro].palavra, 'descartada', teclaDeLado[outro]);
        portao.placas[lado].textura.needsUpdate = true;
        portao.placas[outro].textura.needsUpdate = true;
        portao.placas[lado].posteMaterial.color.setHex(COR.laranja);
        portao.placas[outro].posteMaterial.color.setHex(0x9aa7b6);
        portao.placas[lado].escala = 1.12;

        escolhasNaEtapa++;
        alvoX = lado === 'cima' ? -PISTA_X : PISTA_X;
        saltoRestante = reduzirMovimento ? 0 : 0.34;
        atualizarHud();
        soltarFaiscas();

        opcoes.aoEscolher?.({
            etapa: etapaAtual,
            indice,
            lado,
            escolhida: portao.dados[lado],
            outra: portao.dados[outro],
            combinacao: portao.dados.combinacao,
            tempoMs,
        });

        return true;
    }

    // Teclado e toque.
    const teclas = modo === '3d'
        ? { ArrowLeft: 'cima', a: 'cima', A: 'cima', ArrowRight: 'baixo', d: 'baixo', D: 'baixo' }
        : { ArrowUp: 'cima', w: 'cima', W: 'cima', ArrowDown: 'baixo', s: 'baixo', S: 'baixo' };

    // Acelerar: segurar ↑ (ou W) na vista 3D; → (ou D) na lateral, onde ↑ e ↓ escolhem a pista.
    const teclasDeAceleracao = modo === '3d' ? ['ArrowUp', 'w', 'W'] : ['ArrowRight', 'd', 'D'];
    let acelerando = false;

    const aoTecla = (e) => {
        if (teclasDeAceleracao.includes(e.key)) {
            if (estado === 'correndo') {
                acelerando = true;
                e.preventDefault(); // nao deixa a pagina rolar
            }

            return;
        }

        const lado = teclas[e.key];

        if (lado && escolher(lado)) {
            e.preventDefault();
        }
    };

    const aoSoltar = (e) => {
        if (teclasDeAceleracao.includes(e.key)) {
            acelerando = false;
        }
    };

    const aoPerderFoco = () => {
        acelerando = false;
    };

    window.addEventListener('keydown', aoTecla);
    window.addEventListener('keyup', aoSoltar);
    window.addEventListener('blur', aoPerderFoco);

    const raio = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2();

    renderer.domElement.addEventListener('pointerdown', (e) => {
        if (!portao || !portao.escolhivel || portao.escolhido) {
            return;
        }

        const caixa = renderer.domElement.getBoundingClientRect();
        ponteiro.set(((e.clientX - caixa.left) / caixa.width) * 2 - 1, -((e.clientY - caixa.top) / caixa.height) * 2 + 1);
        raio.setFromCamera(ponteiro, camera);
        const alvos = Object.values(portao.placas).map((p) => p.painel);
        const acerto = raio.intersectObjects(alvos, false)[0];

        if (acerto) {
            escolher(acerto.object.userData.lado);
        }
    });

    // ------------------------------------------------------------- etapa e laco
    function iniciarEtapa(i) {
        descartarPortao();
        etapaAtual = i;
        indice = 0;
        escolhasNaEtapa = 0;
        estado = 'correndo';
        velocidade = 0;
        fracaoMapa = 0;
        gerarPortao();
        atualizarHud();
        hud.classList.add('visivel');
        mapa.classList.add('visivel');
    }

    function obterEstado() {
        return {
            estado,
            etapa: etapaAtual,
            indice,
            escolhas: escolhasNaEtapa,
            total: dinamico ? (progressoExterno?.total ?? 0) : (etapas[etapaAtual]?.length ?? 0),
            portaoEscolhivel: Boolean(portao?.escolhivel && !portao?.escolhido),
            modo,
            velocidade: Math.round(velocidade * 100) / 100,
            velocidadeBase,
            acelerando,
            clima: nomeClima,
            curva: Math.round(uCurva.value * 100000) / 100000,
            kmh: velocimetro?.valor() ?? null,
            avatarX: Math.round(avatar.grupo.position.x * 100) / 100,
        };
    }

    // Campo de visao vertical de referencia, feito para 16:9. Em telas mais altas (celular em pe) ele abre
    // um pouco, para as duas placas continuarem inteiras na tela sem distorcer demais.
    let fovBase = cfg.fov;

    function ajustarTamanho() {
        const w = parent.clientWidth || 960;
        const h = parent.clientHeight || 540;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;

        const compensacao = Math.max(1, (16 / 9) / camera.aspect) ** 0.6;
        fovBase = Math.min(78, (2 * Math.atan(Math.tan((cfg.fov * Math.PI) / 360) * compensacao) * 180) / Math.PI);
        camera.fov = fovBase;
        camera.updateProjectionMatrix();
    }

    const observador = new ResizeObserver(ajustarTamanho);
    observador.observe(parent);
    ajustarTamanho();

    function posicionarCamera(dt) {
        const x = avatar.grupo.position.x;

        // Sensacao de velocidade: o campo de visao abre um pouco enquanto acelera.
        const fovAlvo = fovBase + (acelerando && velocidade > velocidadeBase * 1.1 && !reduzirMovimento ? (modo === '3d' ? 8 : 3) : 0);

        if (Math.abs(camera.fov - fovAlvo) > 0.05) {
            camera.fov += (fovAlvo - camera.fov) * Math.min(1, dt * 5);
            camera.updateProjectionMatrix();
        }

        // Tremor leve da camera no turbo (nao acontece com "reduzir movimento").
        const tremor = acelerando && velocidade > velocidadeBase * 1.15 && !reduzirMovimento ? (avatar.info.rodas ? 0.035 : 0.022) : 0;

        if (modo === '3d') {
            const alvo = new THREE.Vector3(x * 0.45, 3.1, 6.0);
            camera.position.lerp(alvo, Math.min(1, dt * 4));
            camera.position.x += (Math.random() - 0.5) * tremor;
            camera.position.y += (Math.random() - 0.5) * tremor;
            camera.lookAt(x * 0.3, 1.7, -11);
        } else {
            camera.position.set(17.5 + (Math.random() - 0.5) * tremor, 5.6 + (Math.random() - 0.5) * tremor, 1.2);
            camera.lookAt(0, 1.9, -4.4);
        }
    }

    function quadro(agora) {
        if (!rodando) {
            return;
        }

        quadroId = requestAnimationFrame(quadro);
        const dt = Math.min(0.05, (agora - ultimoQuadro) / 1000);
        ultimoQuadro = agora;

        // Segurando a tecla de acelerar a corrida fica bem mais rapida; o avatar ainda para no portao.
        const turbo = acelerando ? (reduzirMovimento ? 1.5 : 1.9) : 1;
        let alvo = 0;

        if (estado === 'correndo' && portao) {
            alvo = portao.escolhido
                ? velocidadeBase * turbo
                : velocidadeBase * turbo * THREE.MathUtils.clamp((cfg.parada - portao.grupo.position.z) / 18, 0, 1);
        }

        velocidade += (alvo - velocidade) * Math.min(1, dt * 4.5);

        if (velocidade < 0.05) {
            velocidade = 0;
        }

        const dz = velocidade * dt;
        agoraSeg = agora / 1000;
        distancia += dz;

        for (const item of movel) {
            item.obj.position.z += dz;

            if (item.obj.position.z - item.comprimento / 2 > Z_TRAS) {
                item.obj.position.z -= PERIODO;
            }
        }

        for (const nuvem of nuvens) {
            nuvem.position.x += dt * climaAtual.nuvemVelocidade;

            if (nuvem.position.x > 110) {
                nuvem.position.x = -110;
            }
        }

        // Curvas: a rua serpenteia com a distancia percorrida. Enquanto a pessoa le o portao a rua
        // fica reta, para as placas ficarem exatamente onde se espera (e o toque acertar a placa).
        const lendo = Boolean(portao?.escolhivel && !portao?.escolhido);
        const curvaAlvo = lendo ? 0 : Math.sin(distancia / 85) * 0.0021;
        uCurva.value += (curvaAlvo - uCurva.value) * Math.min(1, dt * 2.2);

        atualizarClima(dt);
        moverParticulasDoClima(dt, dz);

        // Turbo: linhas de velocidade, fumaca/poeira e som.
        const ritmo = velocidadeBase > 0 ? velocidade / velocidadeBase : 0;
        const turboAtivo = acelerando && ritmo > 1.15 && estado === 'correndo';
        linhas.classList.toggle('ativa', turboAtivo && !reduzirMovimento);

        if (turboAtivo && !turboAnterior) {
            opcoes.aoTurbo?.({ som: somDoMeio });
        }

        turboAnterior = turboAtivo;
        continuos.motor.atualizar({ tipo: somDoMeio, ritmo, turbo: turboAtivo });

        if (turboAtivo && !reduzirMovimento) {
            proximaParticula -= dt;

            if (proximaParticula <= 0 && particulas.length < 36) {
                proximaParticula = 0.045;
                soltarParticula();
            }
        }

        velocimetro?.atualizar(ritmo);

        // Avatar: corrida, troca de pista e salto.
        fase += velocidade * dt * 1.05;
        // No barco ou no ar ninguem corre: o avatar fica sentado (ou pendurado) e quem se move e o veiculo.
        avatar.animar(fase, mundo && !infoMeio.nadando ? 0 : velocidade / velocidadeBase);
        barco?.atualizar(dt, velocidade / velocidadeBase);
        peixes?.atualizar(dt, dz);
        passaros?.atualizar(dt, dz);
        nevasca?.atualizar(dt, dz);
        espacoVivo?.atualizar(dt, dz);

        if (!mundo && velocidade / velocidadeBase > 0.3 && Math.floor(fase / Math.PI) !== faseDoUltimoPasso) {
            faseDoUltimoPasso = Math.floor(fase / Math.PI);
            opcoes.aoPasso?.();
        }

        // Depois de passar pelo portao o avatar volta para o meio da pista.
        if (portao?.escolhido && portao.grupo.position.z > 2.5) {
            alvoX = 0;
        }

        const desvio = alvoX - avatar.grupo.position.x;
        avatar.grupo.position.x += desvio * Math.min(1, dt * (alvoX === 0 ? 4 : 8));

        // Inclina e vira o corpo para o lado em que vai (mais nos veiculos sobre rodas).
        if (!reduzirMovimento) {
            avatar.grupo.rotation.z = -desvio * (avatar.info.rodas ? 0.14 : 0.07) + (mundo ? Math.sin(agoraSeg * 1.7) * 0.025 : 0);
            avatar.grupo.rotation.y = -desvio * 0.1;
        }

        // No rio o barco flutua e no ar a aeronave sobe e desce de leve (mais devagar e mais amplo).
        const alturaBase = mundo ? ALTURA_CONVES + (reduzirMovimento ? 0 : Math.sin(agoraSeg * (aereo || espacial ? 1.4 : 2.1)) * (aereo || espacial ? 0.07 : ((gelo || ferrovia) ? 0.008 : 0.035))) : 0;

        if (saltoRestante > 0) {
            saltoRestante = Math.max(0, saltoRestante - dt);
            avatar.grupo.position.y = alturaBase + Math.sin((1 - saltoRestante / 0.34) * Math.PI) * 0.55;
        } else {
            avatar.grupo.position.y = alturaBase;
        }

        // Portao.
        if (portao) {
            portao.grupo.position.z += dz;

            if (!portao.escolhivel && portao.grupo.position.z >= cfg.legivel) {
                liberarPortao();
            }

            for (const p of Object.values(portao.placas)) {
                const escala = p.painel.scale.x + (p.escala - p.painel.scale.x) * Math.min(1, dt * 10);
                p.painel.scale.setScalar(escala);
            }

            if (portao.grupo.position.z > PORTAO_Z_FIM) {
                descartarPortao();
                indice++;
                portoesPassados++;

                if (portoesPassados % PORTOES_POR_CLIMA === 0) {
                    proximoClima();
                }

                if (!gerarPortao()) {
                    estado = 'concluida';
                    opcoes.aoConcluirEtapa?.({ etapa: etapaAtual, escolhas: escolhasNaEtapa });
                }
            }
        }

        atualizarParticulas(dt, dz);

        // Faiscas.
        for (let i = faiscas.length - 1; i >= 0; i--) {
            const f = faiscas[i];
            f.vida -= dt;
            f.m.position.x += f.vx * dt;
            f.m.position.y += f.vy * dt;
            f.m.position.z += f.vz * dt;
            f.vy -= 6 * dt;
            f.m.material.opacity = Math.max(0, f.vida / 0.7);

            if (f.vida <= 0) {
                cena.remove(f.m);
                f.m.geometry.dispose();
                f.m.material.dispose();
                faiscas.splice(i, 1);
            }
        }

        atualizarMapa(dt);
        posicionarCamera(dt);
        renderer.render(cena, camera);
        painelDesempenho?.atualizar(dt);
    }

    posicionarCamera(1);
    quadroId = requestAnimationFrame(quadro);
    queueMicrotask(() => opcoes.aoPronto?.());

    return {
        iniciarEtapa,
        escolher,
        // Modo ciclo: {feitas, total, percentual, texto} da etapa; atualiza HUD e minimapa.
        definirProgresso(progresso) {
            progressoExterno = progresso;
            atualizarHud();
        },
        // Botao de acelerar da tela de toque (no teclado e a tecla ↑/W).
        acelerar(ativo) {
            acelerando = Boolean(ativo) && estado === 'correndo';
        },
        obterEstado,
        destruir() {
            rodando = false;
            cancelAnimationFrame(quadroId);
            window.removeEventListener('keydown', aoTecla);
            window.removeEventListener('keyup', aoSoltar);
            window.removeEventListener('blur', aoPerderFoco);
            observador.disconnect();
            continuos.motor.parar();
            continuos.clima.parar();
            particulas.forEach((p) => p.m.material.dispose());
            particulaGeo.dispose();
            chuvaGeo.dispose();
            folhasGeo.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            hud.remove();
            mapa.remove();
            velocimetro?.remover();
            linhas.remove();
        },
    };
}
