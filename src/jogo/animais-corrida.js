/**
 * Animais da corrida: a cada N palavras pegas um animal (lobo, gato, aguia ou tubarao, sorteado, sem ligacao com o
 * resultado) surge ao lado do avatar, fica nitido e some. Cada um e desenhado de perfil, no codigo, com pernas, asas e
 * cauda que se mexem; o desenho e atualizado a cada quadro numa textura de um unico "letreiro" (sprite) da cena.
 *
 * O desenho olha para a DIREITA (a vista lateral corre para a direita). Depois de `desenhar`, `habitat` diz como o
 * animal se move em cada cenario (corre, voa, nada, espirito...).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { modelosLigados } from './modelos.js';

export const LARGURA = 512;
export const ALTURA = 320;

const TAU = Math.PI * 2;

const CORES = { lobo: '#8b97b8', gato: '#2e9e6b', aguia: '#e0a21c', tubarao: '#3f86c9' };

// ------------------------------------------------------------------ apoio de desenho

function escurecer(hex, fator) {
    const n = parseInt(hex.slice(1), 16);
    const canal = (c) => Math.max(0, Math.min(255, Math.round(c * fator)));

    return `rgb(${canal((n >> 16) & 255)},${canal((n >> 8) & 255)},${canal(n & 255)})`;
}

/** Membro de dois segmentos (coxa e canela), do ponto de fixacao ate a pata. */
function perna(ctx, x, y, { coxa, canela, a1, a2, largura }) {
    const jx = x + Math.sin(a1) * coxa;
    const jy = y + Math.cos(a1) * coxa;
    const px = jx + Math.sin(a1 + a2) * canela;
    const py = jy + Math.cos(a1 + a2) * canela;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = largura;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(jx, jy);
    ctx.lineTo(px, py);
    ctx.stroke();
}

/** Angulos do galope de uma perna: `fase` em radianos, `desloc` defasa cada perna. */
function galope(fase, desloc, amplitude = 0.8) {
    const t = fase + desloc;

    return { a1: amplitude * Math.sin(t), a2: Math.max(0, 1.0 * Math.sin(t + 1.5)) + 0.1 };
}

// ------------------------------------------------------------------ lobo

function desenharLobo(ctx, fase, cor) {
    const escuro = escurecer(cor, 0.62);
    const corpoY = 150 + Math.sin(fase * 2) * 4;

    ctx.fillStyle = escuro;
    ctx.strokeStyle = escuro;

    // Pernas de tras do lado de la (mais escuras) e depois as do lado de ca.
    perna(ctx, 190, corpoY + 20, { coxa: 50, canela: 56, ...galope(fase, Math.PI * 0.6), largura: 20 });
    perna(ctx, 318, corpoY + 20, { coxa: 46, canela: 52, ...galope(fase, Math.PI * 1.1), largura: 18 });

    // Cauda volumosa, balancando.
    ctx.strokeStyle = cor;
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(140, corpoY - 6);
    ctx.quadraticCurveTo(80, corpoY - 40 + Math.sin(fase) * 14, 40, corpoY + 14 + Math.sin(fase + 1) * 18);
    ctx.stroke();

    // Corpo, peito e pescoco.
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(240, corpoY, 108, 46, -0.03, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(300, corpoY - 30);
    ctx.quadraticCurveTo(336, corpoY - 40, 366, corpoY - 56);
    ctx.lineTo(372, corpoY - 6);
    ctx.quadraticCurveTo(336, corpoY + 34, 296, corpoY + 40);
    ctx.closePath();
    ctx.fill();

    // Cabeca, focinho e orelhas.
    ctx.beginPath();
    ctx.ellipse(380, corpoY - 62, 34, 26, -0.1, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(396, corpoY - 80);
    ctx.lineTo(462, corpoY - 56);
    ctx.quadraticCurveTo(466, corpoY - 46, 452, corpoY - 42);
    ctx.lineTo(398, corpoY - 40);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(356, corpoY - 78);
    ctx.lineTo(364, corpoY - 112);
    ctx.lineTo(384, corpoY - 84);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(380, corpoY - 84);
    ctx.lineTo(394, corpoY - 114);
    ctx.lineTo(404, corpoY - 80);
    ctx.closePath();
    ctx.fill();

    // Olho e nariz.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(398, corpoY - 66, 4.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#10182c';
    ctx.beginPath();
    ctx.arc(460, corpoY - 54, 6, 0, TAU);
    ctx.fill();

    // Pernas da frente, do lado de ca.
    ctx.strokeStyle = cor;
    perna(ctx, 205, corpoY + 24, { coxa: 50, canela: 56, ...galope(fase, 0), largura: 22 });
    perna(ctx, 328, corpoY + 24, { coxa: 46, canela: 52, ...galope(fase, Math.PI * 0.5), largura: 20 });
}

// ------------------------------------------------------------------ gato

function desenharGato(ctx, fase, cor) {
    const escuro = escurecer(cor, 0.6);
    // O gato estica e encolhe o corpo no pulo.
    const esticar = Math.sin(fase) * 0.06;
    const corpoY = 168 + Math.sin(fase * 2) * 8;

    ctx.fillStyle = escuro;
    ctx.strokeStyle = escuro;
    perna(ctx, 180, corpoY + 14, { coxa: 52, canela: 56, ...galope(fase, Math.PI * 0.7, 1.0), largura: 14 });
    perna(ctx, 306, corpoY + 14, { coxa: 46, canela: 50, ...galope(fase, Math.PI * 1.2, 1.0), largura: 13 });

    // Cauda em S, levantada, balancando.
    ctx.strokeStyle = cor;
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(138, corpoY - 6);
    ctx.bezierCurveTo(70, corpoY - 24, 90 + Math.sin(fase) * 10, corpoY - 96, 40, corpoY - 118 + Math.sin(fase + 1) * 12);
    ctx.stroke();

    // Corpo alongado.
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(236, corpoY, 100 * (1 + esticar), 34, -0.05, 0, TAU);
    ctx.fill();

    // Cabeca redonda, orelhas pontudas e focinho.
    ctx.beginPath();
    ctx.arc(352, corpoY - 36, 31, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(328, corpoY - 56);
    ctx.lineTo(330, corpoY - 94);
    ctx.lineTo(356, corpoY - 64);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(350, corpoY - 64);
    ctx.lineTo(374, corpoY - 94);
    ctx.lineTo(378, corpoY - 56);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#10261c';
    ctx.beginPath();
    ctx.ellipse(366, corpoY - 40, 4.5, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f7d65a';
    ctx.beginPath();
    ctx.ellipse(366, corpoY - 40, 3, 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffb3b3';
    ctx.beginPath();
    ctx.arc(381, corpoY - 28, 3.5, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = cor;
    perna(ctx, 196, corpoY + 18, { coxa: 52, canela: 56, ...galope(fase, 0, 1.0), largura: 15 });
    perna(ctx, 322, corpoY + 18, { coxa: 46, canela: 50, ...galope(fase, Math.PI * 0.55, 1.0), largura: 14 });
}

// ------------------------------------------------------------------ aguia

function desenharAguia(ctx, fase, cor) {
    const escuro = escurecer(cor, 0.6);
    const bate = Math.sin(fase);
    const corpoY = 190 + Math.cos(fase) * 6;

    // Asa: uma peca so, desenhada apontando para cima e girada a partir do ombro (0 = reta para cima, positivo = varrida
    // para tras). A batida vai de quase vertical a quase estendida para tras.
    function asa(ombroX, ombroY, giro, corAsa) {
        ctx.save();
        ctx.translate(ombroX, ombroY);
        ctx.rotate(giro);
        ctx.fillStyle = corAsa;
        ctx.beginPath();
        ctx.moveTo(-24, 0);
        ctx.bezierCurveTo(-52, -60, -40, -128, -6, -156);
        ctx.bezierCurveTo(8, -120, 36, -70, 40, 0);
        ctx.closePath();
        ctx.fill();
        // Penas.
        ctx.strokeStyle = escurecer(cor, 0.45);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        for (let k = 0; k < 4; k++) {
            ctx.beginPath();
            ctx.moveTo(-14 + k * 12, -16);
            ctx.lineTo(-24 + k * 10, -110 + k * 14);
            ctx.stroke();
        }

        ctx.restore();
    }

    const giroAsa = -0.55 - 0.75 * bate;

    asa(236, corpoY - 14, giroAsa + 0.12, escuro);

    // Cauda em leque.
    ctx.fillStyle = escuro;
    ctx.beginPath();
    ctx.moveTo(190, corpoY + 4);
    ctx.lineTo(96, corpoY - 18 + bate * 6);
    ctx.lineTo(90, corpoY + 14 + bate * 6);
    ctx.lineTo(104, corpoY + 40 + bate * 6);
    ctx.lineTo(194, corpoY + 24);
    ctx.closePath();
    ctx.fill();

    // Corpo, peito claro, cabeca e bico.
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(262, corpoY + 4, 84, 34, -0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff4d6';
    ctx.beginPath();
    ctx.ellipse(298, corpoY + 18, 44, 18, -0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.arc(342, corpoY - 18, 25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f0b429';
    ctx.beginPath();
    ctx.moveTo(360, corpoY - 24);
    ctx.quadraticCurveTo(396, corpoY - 18, 392, corpoY + 4);
    ctx.quadraticCurveTo(376, corpoY - 6, 358, corpoY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    ctx.arc(348, corpoY - 24, 4.5, 0, TAU);
    ctx.fill();

    // Garras recolhidas.
    ctx.strokeStyle = '#f0b429';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(268, corpoY + 34);
    ctx.lineTo(284, corpoY + 52);
    ctx.moveTo(290, corpoY + 34);
    ctx.lineTo(304, corpoY + 50);
    ctx.stroke();

    // Asa de ca (mais clara), na frente.
    asa(256, corpoY - 10, giroAsa, cor);
}

// ------------------------------------------------------------------ tubarao

function desenharTubarao(ctx, fase, cor) {
    const escuro = escurecer(cor, 0.62);
    const comprimento = 360;
    const x0 = 70; // cauda
    const meioY = 168;
    const passos = 28;
    const topo = [];
    const base = [];

    // O corpo ondula: a espinha desvia mais perto da cauda.
    for (let i = 0; i <= passos; i++) {
        const t = i / passos; // 0 cauda -> 1 focinho
        const espessura = 46 * Math.sin(Math.PI * Math.pow(t, 0.8)) * (0.35 + 0.65 * t) + 4;
        const desvio = Math.sin(fase - t * 4.2) * 20 * Math.pow(1 - t, 1.4);
        const x = x0 + comprimento * t;

        topo.push([x, meioY + desvio - espessura]);
        base.push([x, meioY + desvio + espessura * 0.78]);
    }

    const caudaY = meioY + Math.sin(fase) * 20;

    // Nadadeira da cauda.
    ctx.fillStyle = escuro;
    ctx.beginPath();
    ctx.moveTo(x0 + 8, caudaY);
    ctx.quadraticCurveTo(x0 - 14, caudaY - 38, x0 - 46, caudaY - 62 + Math.sin(fase) * 10);
    ctx.quadraticCurveTo(x0 - 24, caudaY - 8, x0 - 30, caudaY + 8);
    ctx.quadraticCurveTo(x0 - 22, caudaY + 34, x0 - 38, caudaY + 52 + Math.sin(fase) * 10);
    ctx.quadraticCurveTo(x0 - 6, caudaY + 30, x0 + 8, caudaY);
    ctx.closePath();
    ctx.fill();

    // Corpo.
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(...topo[0]);

    for (const p of topo) {
        ctx.lineTo(...p);
    }

    for (let i = base.length - 1; i >= 0; i--) {
        ctx.lineTo(...base[i]);
    }

    ctx.closePath();
    ctx.fill();

    // Barriga clara.
    ctx.fillStyle = '#e8f1fa';
    ctx.beginPath();
    ctx.moveTo(...base[Math.floor(passos * 0.35)]);

    for (let i = Math.floor(passos * 0.35); i <= passos - 2; i++) {
        ctx.lineTo(base[i][0], base[i][1] - 7 - (i / passos) * 5);
    }

    for (let i = passos - 2; i >= Math.floor(passos * 0.35); i--) {
        ctx.lineTo(...base[i]);
    }

    ctx.closePath();
    ctx.fill();

    // Nadadeira dorsal e peitoral.
    const dorsal = topo[Math.floor(passos * 0.55)];

    ctx.fillStyle = escuro;
    ctx.beginPath();
    ctx.moveTo(dorsal[0] - 34, dorsal[1] + 6);
    ctx.quadraticCurveTo(dorsal[0] - 8, dorsal[1] - 20, dorsal[0] - 14, dorsal[1] - 64);
    ctx.quadraticCurveTo(dorsal[0] + 30, dorsal[1] - 20, dorsal[0] + 40, dorsal[1] + 8);
    ctx.closePath();
    ctx.fill();

    const peitoral = base[Math.floor(passos * 0.62)];
    const balanco = Math.sin(fase + 1) * 8;

    ctx.beginPath();
    ctx.moveTo(peitoral[0] - 6, peitoral[1] - 8);
    ctx.quadraticCurveTo(peitoral[0] - 20, peitoral[1] + 26 + balanco, peitoral[0] - 54, peitoral[1] + 46 + balanco);
    ctx.quadraticCurveTo(peitoral[0] - 20, peitoral[1] + 8, peitoral[0] + 26, peitoral[1] - 8);
    ctx.closePath();
    ctx.fill();

    // Olho, guelras e sorriso.
    const focinho = topo[passos];
    const olhoX = x0 + comprimento * 0.86;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(olhoX, topo[Math.floor(passos * 0.86)][1] + 20, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#10182c';
    ctx.beginPath();
    ctx.arc(olhoX + 1.5, topo[Math.floor(passos * 0.86)][1] + 20, 3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = escuro;
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let i = 0; i < 3; i++) {
        const gx = x0 + comprimento * (0.7 + i * 0.03);
        ctx.moveTo(gx, topo[Math.floor(passos * 0.7)][1] + 16);
        ctx.lineTo(gx - 4, topo[Math.floor(passos * 0.7)][1] + 38);
    }

    ctx.moveTo(focinho[0] - 52, base[passos][1] - 14);
    ctx.quadraticCurveTo(focinho[0] - 28, base[passos][1] - 4, focinho[0] - 4, base[passos][1] - 20);
    ctx.stroke();
}

// ------------------------------------------------------------------ publico

export const TIPOS = ['lobo', 'gato', 'aguia', 'tubarao'];

const DESENHOS = { lobo: desenharLobo, gato: desenharGato, aguia: desenharAguia, tubarao: desenharTubarao };

/** Desenha o animal (de perfil, olhando para a direita) no contexto 2D de LARGURA x ALTURA. `fase` anima o movimento. */
export function desenhar(ctx, tipo, fase, { agua = false, constelacao = false } = {}) {
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    ctx.save();

    if (constelacao) {
        // No espaco o animal e uma constelacao: o desenho vira so estrelas (um campo de pontos recortado pela silhueta),
        // com um brilho fraco da silhueta por tras.
        DESENHOS[tipo](ctx, fase, CORES[tipo]);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(campoDeEstrelas(), 0, 0);
        ctx.globalCompositeOperation = 'destination-over';
        ctx.globalAlpha = 0.2;
        ctx.shadowColor = '#9cc8ff';
        ctx.shadowBlur = 22;
        DESENHOS[tipo](ctx, fase, '#bcd6ff');
        ctx.restore();

        return;
    }

    if (agua) {
        // Nadando: so o dorso e a barbatana aparecem; o resto fica como sombra submersa, com marolas na linha da agua.
        ctx.globalAlpha = 0.26;
        DESENHOS[tipo](ctx, fase, CORES[tipo]);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.rect(0, 0, LARGURA, LINHA_DAGUA);
        ctx.clip();
        DESENHOS[tipo](ctx, fase, CORES[tipo]);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 4;

        for (let k = 0; k < 3; k++) {
            const passo = (fase * 0.35 + k / 3) % 1;

            ctx.globalAlpha = (1 - passo) * 0.8;
            ctx.beginPath();
            ctx.ellipse(250, LINHA_DAGUA + 2, 90 + passo * 150, 8 + passo * 14, 0, 0, TAU);
            ctx.stroke();
        }

        ctx.restore();

        return;
    }

    // Contorno suave, para o animal destacar do fundo sem virar uma mancha.
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10;
    DESENHOS[tipo](ctx, fase, CORES[tipo]);
    ctx.restore();
}

let estrelas = null;

/** Campo de pontos brilhantes (criado uma vez) que preenche a silhueta da constelacao. */
function campoDeEstrelas() {
    if (!estrelas) {
        estrelas = document.createElement('canvas');
        estrelas.width = LARGURA;
        estrelas.height = ALTURA;
        const c = estrelas.getContext('2d');
        // Sequencia fixa (sem Math.random), para as estrelas nao "pularem" de uma execucao para outra.
        let semente = 7;
        const sorteio = () => {
            semente = (semente * 16807) % 2147483647;

            return semente / 2147483647;
        };

        for (let i = 0; i < 1500; i++) {
            const raio = sorteio() < 0.12 ? 3.4 + sorteio() * 1.8 : 1.4 + sorteio() * 1.4;

            c.fillStyle = ['#ffffff', '#cfe3ff', '#ffe9b8'][i % 3];
            c.shadowColor = '#bcd6ff';
            c.shadowBlur = raio > 3 ? 10 : 4;
            c.beginPath();
            c.arc(sorteio() * LARGURA, sorteio() * ALTURA, raio, 0, TAU);
            c.fill();
        }
    }

    return estrelas;
}

/** Linha da agua no desenho do tubarao (altura no canvas, em pixels). */
const LINHA_DAGUA = 178;

// ------------------------------------------------------------------ controlador

/** Cenarios ja liberados para os animais (os demais entram um a um). */
const CENARIOS_LIBERADOS = ['rua', 'rio', 'ar', 'neve', 'trilhos', 'espaco'];

/**
 * Como cada animal se move em cada cenario: `corre` (no chao), `voa` (no ar) ou `espirito` (silhueta translucida que
 * desliza, para quem nao tem o seu habitat ali).
 */
const HABITATS = {
    rua: { lobo: 'corre', gato: 'corre', aguia: 'voa', tubarao: 'espirito' },
    rio: { lobo: 'margem', gato: 'margem', aguia: 'voa', tubarao: 'nada' },
    // No ceu so a aguia voa de verdade; os outros planam como espiritos entre as nuvens.
    ar: { lobo: 'espirito', gato: 'espirito', aguia: 'voa', tubarao: 'espirito' },
    // Na neve o lobo e o gato correm ao lado do avatar; o tubarao nao tem habitat ali.
    neve: { lobo: 'corre', gato: 'corre', aguia: 'voa', tubarao: 'espirito' },
    // Nos trilhos os animais correm na brita, ao lado da ferrovia.
    trilhos: { lobo: 'corre', gato: 'corre', aguia: 'voa', tubarao: 'espirito' },
    // No espaco todos viram constelacoes que cruzam o ceu ao lado do avatar.
    espaco: { lobo: 'constelacao', gato: 'constelacao', aguia: 'constelacao', tubarao: 'constelacao' },
};

/** Altura do chao onde o animal pisa (a areia da margem do rio fica um pouco acima da agua). */
const CHAO = { rua: 0, rio: 0.2, neve: 0, trilhos: 0.05 };

/** Distancia do centro do rio ate a areia, onde lobo e gato correm. */
const X_MARGEM = 7.4;

/** Ritmo do movimento (radianos por segundo) e altura do centro do desenho, por tipo de movimento. */
const MOVIMENTOS = {
    corre: { ritmo: 12, altura: null, opacidade: 1 }, // altura: os pes (a 83% do desenho) pousam no chao
    margem: { ritmo: 12, altura: null, opacidade: 1 },
    constelacao: { ritmo: 7, altura: 1.6, opacidade: 1 },
    nada: { ritmo: 6, altura: 0.16, opacidade: 1 }, // o centro do desenho fica logo acima da linha da agua
    voa: { ritmo: 9, altura: 2.5, opacidade: 1 },
    espirito: { ritmo: 6, altura: 1.5, opacidade: 0.55 },
};

/**
 * Modelos 3D prontos (glTF, CC0, Quaternius) para os animais que os tem. Eles correm ou nadam PARA A FRENTE, na mesma
 * direcao do avatar. Entram no lugar do desenho 2D quando o modelo ja carregou e o animal esta correndo, nadando ou
 * deslizando (nao na constelacao do espaco nem voando).
 */
const MODELOS_3D = {
    lobo: { arquivo: '/modelos/animais/lobo.glb', comprimento: 2.6, clip: /gallop/i },
    tubarao: { arquivo: '/modelos/animais/tubarao.glb', comprimento: 3.4, clip: /swim/i },
};
const MOVIMENTOS_3D = ['corre', 'margem', 'nada', 'espirito'];

const DURACAO = 3.6;
const ENTRADA = 0.7;
const SAIDA = 0.9;
const suave = (x) => {
    const t = Math.min(1, Math.max(0, x));

    return t * t * (3 - 2 * t);
};

/**
 * @param {{cena: THREE.Scene, modo: '3d'|'lateral', cenario: string, reduzirMovimento: boolean, aCada: number}} opcoes
 * @returns {null | {pegou: (total: number) => void, reiniciarEtapa: () => void, atualizar: (dt: number, avatarX: number) => void, destruir: () => void}}
 *   `null` quando o cenario ainda nao tem animais.
 */
export function criarAnimaisCorrida({ cena, modo, cenario, reduzirMovimento, aCada = 4 }) {
    if (!CENARIOS_LIBERADOS.includes(cenario) || !(aCada >= 1)) {
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = LARGURA;
    canvas.height = ALTURA;
    const ctx = canvas.getContext('2d');
    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: textura, transparent: true, opacity: 0, depthWrite: false, fog: false });

    // As constelacoes brilham: somam luz ao fundo escuro do espaco.
    if (cenario === 'espaco') {
        material.blending = THREE.AdditiveBlending;
    }

    const sprite = new THREE.Sprite(material);
    const largura = modo === '3d' ? 4.4 : 3.6;
    const alturaDoSprite = (largura * ALTURA) / LARGURA;
    sprite.scale.set(largura, (largura * ALTURA) / LARGURA, 1);
    sprite.visible = false;
    cena.add(sprite);

    // Modelos 3D (baixados em segundo plano; ate chegarem, e se falharem, vale o desenho 2D).
    const prontos = {};
    const ondas = new THREE.Group();
    const ondaGeo = new THREE.RingGeometry(0.62, 0.78, 40);

    for (let i = 0; i < 2; i++) {
        const onda = new THREE.Mesh(ondaGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
        onda.rotation.x = -Math.PI / 2;
        ondas.add(onda);
    }

    ondas.visible = false;
    cena.add(ondas);

    if (modelosLigados()) {
        for (const [tipo, cfg] of Object.entries(MODELOS_3D)) {
            new GLTFLoader().loadAsync(cfg.arquivo).then((gltf) => {
                const interno = gltf.scene;
                // Os modelos olham para +z; o jogo anda para -z (para longe da camera e, na vista lateral, para a direita).
                interno.rotation.y = Math.PI;
                const raiz = new THREE.Group();
                raiz.add(interno);
                raiz.visible = false;
                raiz.updateMatrixWorld(true);
                const caixa = new THREE.Box3().setFromObject(raiz);
                const tamanho = caixa.getSize(new THREE.Vector3());
                const materiais = new Set();

                interno.traverse((o) => {
                    if (o.isMesh) {
                        o.frustumCulled = false; // a malha esqueletica muda de forma: a caixa da pose inicial nao vale
                        [].concat(o.material).forEach((m) => {
                            m.transparent = true;
                            materiais.add(m);
                        });
                    }
                });

                const mixer = new THREE.AnimationMixer(interno);
                const clip = gltf.animations.find((a) => cfg.clip.test(a.name)) ?? gltf.animations[0];

                if (clip) {
                    mixer.clipAction(clip).play();
                }

                cena.add(raiz);
                prontos[tipo] = {
                    raiz,
                    mixer,
                    materiais: [...materiais],
                    escala: cfg.comprimento / Math.max(tamanho.x, tamanho.z, 0.001),
                    pesY: caixa.min.y,
                    centroY: (caixa.min.y + caixa.max.y) / 2,
                };
            }).catch((erro) => console.warn(`modelo ${cfg.arquivo} indisponivel, usando o desenho 2D`, erro));
        }
    }

    function esconder() {
        sprite.visible = false;
        material.opacity = 0;
        ondas.visible = false;

        for (const m of Object.values(prontos)) {
            m.raiz.visible = false;
        }
    }

    let pegas = 0;
    let baralho = [];
    let ultimo = null;
    let ativo = null; // { tipo, movimento, t, fase, lado }

    function sortear() {
        // `?animal=lobo` (ou gato, aguia, tubarao) fixa o animal, para testar o desenho de cada um.
        const fixo = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('animal');

        if (TIPOS.includes(fixo)) {
            return fixo;
        }

        if (baralho.length === 0) {
            baralho = [...TIPOS].sort(() => Math.random() - 0.5);

            // Nao repete o ultimo animal na virada do baralho.
            if (baralho[baralho.length - 1] === ultimo) {
                baralho.unshift(baralho.pop());
            }
        }

        ultimo = baralho.pop();

        return ultimo;
    }

    function soltar(ladoDoAvatar) {
        const tipo = sortear();
        const movimento = HABITATS[cenario]?.[tipo] ?? 'espirito';

        const usa3d = Boolean(prontos[tipo]) && MOVIMENTOS_3D.includes(movimento);

        ativo = { tipo, movimento, t: 0, fase: Math.random() * TAU, lado: ladoDoAvatar > 0 ? -1 : 1, usa3d };

        if (usa3d) {
            // Com "reduzir movimento" o modelo fica parado numa pose de corrida ou nado.
            prontos[tipo].mixer.setTime(reduzirMovimento ? 0.15 : 0);
            prontos[tipo].raiz.visible = true;
        } else {
            sprite.visible = true;
        }
    }

    /** Atualiza o animal quando e um modelo 3D: mesmo posicionamento do desenho 2D, mas com o corpo de verdade, de frente. */
    function atualizar3d(dt, avatarX, aparece) {
        const { movimento, tipo } = ativo;
        const m = prontos[tipo];
        const margem = movimento === 'margem';
        const ampliar = margem && modo === '3d' ? 1.8 : 1;
        const escala = m.escala * ampliar * (0.92 + 0.08 * aparece);
        const balanco = reduzirMovimento ? 0 : Math.sin(ativo.t * 4.5) * (movimento === 'espirito' ? 0.18 : 0);

        if (!reduzirMovimento) {
            m.mixer.update(dt);
        }

        for (const mat of m.materiais) {
            mat.opacity = aparece * (movimento === 'espirito' ? 0.55 : 1);
        }

        m.raiz.scale.setScalar(escala);

        let y;

        if (movimento === 'nada') {
            y = 0.14 - m.centroY * escala; // o centro fica um pouco acima da linha da agua: dorso e barbatana de fora
        } else if (movimento === 'espirito') {
            y = 1.5 + balanco - m.centroY * escala;
        } else {
            y = (CHAO[cenario] ?? 0) - m.pesY * escala; // os pes pousam no chao
        }

        let x;
        let z;

        if (margem) {
            x = (modo === '3d' ? ativo.lado : -1) * X_MARGEM;
            z = modo === '3d' ? -8.5 - ativo.t * 0.3 : -0.4 + Math.sin(ativo.t * 1.4) * 0.5;
        } else if (modo === '3d') {
            x = avatarX + ativo.lado * 3.2;
            z = -0.6 - ativo.t * 0.2;
        } else {
            x = avatarX - 2.6;
            z = -0.4 + Math.sin(ativo.t * 1.4) * 0.5;
        }

        m.raiz.position.set(x, y, z);

        // Marolas ao redor do tubarao que nada.
        ondas.visible = movimento === 'nada';

        if (movimento === 'nada') {
            ondas.position.set(x, 0.04, z);
            ondas.children.forEach((onda, i) => {
                const passo = (ativo.t * 0.6 + i * 0.5) % 1;

                onda.scale.setScalar(1.2 + passo * 3.2);
                onda.material.opacity = (1 - passo) * 0.6 * aparece;
            });
        }
    }

    return {
        /** Chamar a cada palavra pega; `total` e quantas a etapa tem (a ultima palavra nao dispara o animal) e `ladoDoAvatar`
         *  (-1 ou 1) a pista para onde o avatar vai: o animal surge do lado oposto. */
        pegou(total, ladoDoAvatar = 0) {
            pegas++;

            if (pegas % aCada === 0 && !ativo && (!(total > 0) || pegas < total)) {
                soltar(ladoDoAvatar);
            }
        },
        reiniciarEtapa() {
            pegas = 0;
        },
        atualizar(dt, avatarX) {
            if (!ativo) {
                return;
            }

            ativo.t += dt;

            if (ativo.t >= DURACAO) {
                ativo = null;
                esconder();

                return;
            }

            const { movimento, tipo } = ativo;
            const parametros = MOVIMENTOS[movimento];
            const aparece = suave(ativo.t / ENTRADA) * (1 - suave((ativo.t - (DURACAO - SAIDA)) / SAIDA));

            if (ativo.usa3d) {
                atualizar3d(dt, avatarX, aparece);

                return;
            }

            // Com "reduzir movimento" o animal so surge e some, parado, sem galope nem balanco.
            ativo.fase += reduzirMovimento ? 0 : dt * parametros.ritmo;
            const fase = reduzirMovimento ? 0.6 : ativo.fase;
            const balanco = reduzirMovimento ? 0 : Math.sin(ativo.t * 4.5) * (movimento === 'espirito' || movimento === 'constelacao' ? 0.18 : 0.05);

            desenhar(ctx, tipo, fase, { agua: movimento === 'nada', constelacao: movimento === 'constelacao' });
            textura.needsUpdate = true;
            material.opacity = aparece * parametros.opacidade;
            // Na margem (3D) o animal corre mais longe da camera, para caber na tela: fica maior para compensar.
            const ampliar = movimento === 'margem' && modo === '3d' ? 1.8 : 1;

            sprite.scale.set(largura * ampliar * (0.9 + 0.1 * aparece), alturaDoSprite * ampliar * (0.9 + 0.1 * aparece), 1);

            const centro = parametros.altura ?? (CHAO[cenario] ?? 0) + alturaDoSprite * ampliar * 0.34;
            const sobe = movimento === 'voa' ? Math.sin(ativo.t * 2.4) * 0.25 : 0;

            if (movimento === 'margem') {
                // Corre na areia da margem, no lado oposto ao avatar (na vista lateral, na margem de la).
                const lado = modo === '3d' ? ativo.lado : -1;

                sprite.position.set(lado * X_MARGEM, centro + balanco, modo === '3d' ? -8.5 - ativo.t * 0.3 : -0.4 + Math.sin(ativo.t * 1.4) * 0.5);

                return;
            }

            if (modo === '3d') {
                // De tras do avatar o desenho de perfil "desliza" ao lado dele: fica no lado livre, um pouco a frente.
                sprite.position.set(avatarX + ativo.lado * 3.2, centro + sobe + balanco, -0.6 - ativo.t * 0.2);
            } else {
                // Na vista lateral o animal corre atras do avatar (do lado oposto a camera) e emparelha com ele.
                sprite.position.set(avatarX - 2.6, centro + sobe + balanco, -0.4 + Math.sin(ativo.t * 1.4) * 0.5);
            }
        },
        destruir() {
            cena.remove(sprite);
            textura.dispose();
            material.dispose();
            cena.remove(ondas);
            ondaGeo.dispose();
            ondas.children.forEach((o) => o.material.dispose());

            for (const m of Object.values(prontos)) {
                cena.remove(m.raiz);
                m.mixer.stopAllAction();
                m.raiz.traverse((o) => {
                    if (o.isMesh) {
                        o.geometry.dispose();
                    }
                });
                m.materiais.forEach((mat) => mat.dispose());
            }
        },
    };
}
