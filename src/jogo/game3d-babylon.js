/**
 * Motor do jogo em Babylon.js: e o padrao na rua (vista 3D) com avatar de modelo 3D. `?motor=three` na URL volta ao
 * three.js (game3d.js), que tambem assume sozinho se o Babylon nao carregar.
 *
 * Cobre a rua na vista 3D com todos os avatares (modelos 3D em glTF e os de formas simples, espelhados do three.js): portoes, escolha, turbo, clima, reacoes do avatar
 * (salto, giro, confete, vibracao), animais da corrida (lobo, gato, aguia e tubarao), HUD, minimapa, som e o mesmo fluxo da entrada.js (treino, etapas, ciclo, gravacao).
 * Rio, ar, neve, trilhos e espaco: o mundo e o veiculo vem do three.js, espelhados (mundo-babylon.js). Fora disso (vista lateral) a entrada.js continua usando o motor three.js (game3d.js): ver `babylonElegivel`.
 *
 * Mesma interface de criarJogo3D, com um detalhe: o Babylon vem do CDN (jsdelivr) sob demanda, entao o objeto devolvido
 * e usavel na hora e guarda as chamadas ate a cena ficar pronta.
 *
 * Coordenadas: o Babylon e "mao esquerda" e a camera olha para +z; o avatar fica em z = 0, os portoes vem de +z e
 * andam para -z. Direita da tela = +x.
 */
import { continuos, sons } from './audio.js';
import { criarAvatar3D, infoMobilidade } from './avatars.js';
import { espelharObjeto3D } from './espelho-babylon.js';
import { criarVelocimetro } from './game3d.js';
import { CENARIOS_DO_MUNDO, criarMundoEspelhado } from './mundo-babylon.js';

// De onde vem o Babylon: primeiro do proprio site (copiado de node_modules por scripts/copiar-babylon.mjs, funciona em
// redes que bloqueiam CDN) e, se faltar, do CDN. Se nenhum carregar, o jogo segue no three.js.
const FONTES_BABYLON = [
    ['/vendor/babylon/babylon.js?v=9.35.0', '/vendor/babylon/babylonjs.loaders.min.js?v=9.35.0'],
    ['https://cdn.jsdelivr.net/npm/babylonjs@9.35.0/babylon.js', 'https://cdn.jsdelivr.net/npm/babylonjs-loaders@9.35.0/babylonjs.loaders.min.js'],
];

const PISTA_X = 2.3;
const LARGURA_ESTRADA = 9;
const PERIODO = 175; // comprimento do ciclo de reciclagem do cenario
const Z_TRAS = 20; // ate onde a rua continua atras da camera
const PORTAO_Z_INICIAL = 74;
const PORTAO_Z_FIM = -9;
const CFG = { legivel: 34, parada: 8.5, placaL: 4.5, placaA: 2.25, altura: 3.0, postes: 2.0, fov: 52 };
const NEVOA_BASE = { perto: 36, longe: 125 };
const VELOCIDADE = { normal: 11, reduzida: 6.5 };
const PORTOES_POR_CLIMA = 4;
const ALTURA_HUMANO = 1.78;
const COMEMORAR_DURACAO = 0.7;
const COR = { azul: '#1f6fb8', laranja: '#f08a3c' };
const PREDIOS = ['#1f6fb8', '#0d2b4e', '#f08a3c', '#6fa8e0', '#2f5f94', '#c9d8ea', '#e9b27a'];

const CLIMAS = {
    sol: { nome: 'Ensolarado', ceuTopo: '#9cc8f0', ceuBase: '#f4f9ff', nevoa: '#dcebf9', alcance: 1, luz: 1.5, direta: 1.35, sol: 1, nuvem: 0.85, nuvemCor: '#ffffff', chuva: 0, vento: 0, asfalto: '#3b4a5c', agua: '#2f86b8', solo: '#5aa25c', neve: '#f4f8fc', nuvemVelocidade: 0.6 },
    nublado: { nome: 'Nublado', ceuTopo: '#8f9cab', ceuBase: '#d8dde4', nevoa: '#c9d0d8', alcance: 0.85, luz: 1.25, direta: 0.4, sol: 0, nuvem: 1, nuvemCor: '#b4bcc7', chuva: 0, vento: 0, asfalto: '#36424f', agua: '#4f7288', solo: '#4f8a58', neve: '#dfe6ee', nuvemVelocidade: 0.9 },
    chuva: { nome: 'Chuvoso', ceuTopo: '#566476', ceuBase: '#a7b2be', nevoa: '#97a3b0', alcance: 0.62, luz: 0.98, direta: 0.18, sol: 0, nuvem: 1, nuvemCor: '#7d8896', chuva: 1, vento: 0.15, asfalto: '#27313d', agua: '#3d5a6e', solo: '#3f6e4c', neve: '#cfd8e2', nuvemVelocidade: 1.2 },
    // Espaco: nao ha tempo (sol, chuva, vento): o ceu e preto e o clima nunca muda.
    espaco: { nome: 'Espaço', ceuTopo: '#01020a', ceuBase: '#0a1233', nevoa: '#050a22', alcance: 2.6, luz: 1.05, direta: 1.25, sol: 0, nuvem: 0, nuvemCor: '#000000', chuva: 0, vento: 0, asfalto: '#01020a', agua: '#01020a', solo: '#01020a', neve: '#01020a', nuvemVelocidade: 0 },
    vento: { nome: 'Ventania', ceuTopo: '#86bde8', ceuBase: '#e6f0fa', nevoa: '#d3e5f4', alcance: 1, luz: 1.45, direta: 1.15, sol: 0.85, nuvem: 0.9, nuvemCor: '#f2f6fb', chuva: 0, vento: 1, asfalto: '#3b4a5c', agua: '#3a8bbd', solo: '#5aa25c', neve: '#eef3f9', nuvemVelocidade: 7 },
};

const ICONES_CLIMA = {
    espaco: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17v4M17 19h4"/></svg>',
    sol: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    nublado: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 1 1 .6-7.95A5.5 5.5 0 0 1 18 11a3.5 3.5 0 0 1-.5 7z"/></svg>',
    chuva: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15a4 4 0 1 1 .6-7.95A5.5 5.5 0 0 1 18 8a3.5 3.5 0 0 1-.5 7"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>',
    vento: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/></svg>',
};

// ------------------------------------------------------------------ carga e elegibilidade
let promessaBabylon = null;

function carregarScript(src) {
    return new Promise((resolve, reject) => {
        const el = document.createElement('script');
        const limite = setTimeout(() => reject(new Error(`Tempo esgotado ao carregar ${src}`)), 12000);
        el.src = src;
        el.async = false;
        el.onload = () => {
            clearTimeout(limite);
            resolve();
        };
        el.onerror = () => {
            clearTimeout(limite);
            el.remove();
            reject(new Error(`Falha ao carregar ${src}`));
        };
        document.head.appendChild(el);
    });
}

/** Baixa o Babylon.js (e o leitor de glTF) uma unica vez. */
export function carregarBabylon() {
    if (!promessaBabylon) {
        promessaBabylon = window.BABYLON?.SceneLoader
            ? Promise.resolve(window.BABYLON)
            : FONTES_BABYLON.reduce(
                (anterior, [motor, leitores]) => anterior.catch(() => carregarScript(motor).then(() => carregarScript(leitores))),
                Promise.reject(new Error('sem fonte')),
            ).then(() => window.BABYLON);
        promessaBabylon.catch(() => { promessaBabylon = null; });
    }

    return promessaBabylon;
}

/** O Babylon e o padrao; `?motor=three` na URL o desliga (para comparar ou se algo der errado). */
export function babylonPedido() {
    return typeof location === 'undefined' || new URLSearchParams(location.search).get('motor') !== 'three';
}

/** O que este motor sabe desenhar; o resto fica com o three.js. */
export function babylonElegivel(opcoes) {
    return opcoes.modo !== 'lateral' && ['rua', ...CENARIOS_DO_MUNDO].includes(opcoes.cenario ?? 'rua');
}

// ------------------------------------------------------------------ desenho 2D
/** Desenha uma placa de palavra no canvas (estado: normal, escolhida, descartada). Igual ao game3d.js. */
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

const TECLA_DE_LADO = {
    cima: { texto: '← ESQUERDA', cor: '#1f6fb8', direita: false },
    baixo: { texto: 'DIREITA →', cor: '#c85f0f', direita: true },
};


// ------------------------------------------------------------------ animais da corrida
const TIPOS_ANIMAL = ['lobo', 'gato', 'aguia', 'tubarao'];
const MODELOS_ANIMAL = {
    lobo: { arquivo: '/modelos/animais/lobo.glb', comprimento: 2.6, clip: /gallop/i },
    gato: { arquivo: '/modelos/animais/gato.glb', comprimento: 2.0, clip: /run/i },
    aguia: { arquivo: '/modelos/animais/aguia.glb', comprimento: 3.0, clip: /fly/i },
    tubarao: { arquivo: '/modelos/animais/tubarao.glb', comprimento: 3.4, clip: /swim/i },
};
// Como cada animal se move em cada cenario (igual ao animais-corrida.js): corre no chao, margem do rio, nada, voa,
// espirito (silhueta translucida, para quem nao tem habitat ali) ou constelacao (linhas de luz no espaco).
const HABITATS = {
    rua: { lobo: 'corre', gato: 'corre', aguia: 'voa', tubarao: 'espirito' },
    rio: { lobo: 'margem', gato: 'margem', aguia: 'voa', tubarao: 'nada' },
    ar: { lobo: 'espirito', gato: 'espirito', aguia: 'voa', tubarao: 'espirito' },
    neve: { lobo: 'corre', gato: 'corre', aguia: 'voa', tubarao: 'espirito' },
    trilhos: { lobo: 'corre', gato: 'corre', aguia: 'voa', tubarao: 'espirito' },
    espaco: { lobo: 'constelacao', gato: 'constelacao', aguia: 'constelacao', tubarao: 'constelacao' },
};
const CHAO_ANIMAL = { rua: 0, rio: 0.2, neve: 0, trilhos: 0.05 }; // altura do chao onde o animal pisa
const X_MARGEM = 7.4; // distancia do centro do rio ate a areia, onde lobo e gato correm
const INTERVALO_SOM = { lobo: 3.2, gato: 2.2, aguia: 1.4, tubarao: 2.0 };
const suave = (x) => {
    const t = Math.min(1, Math.max(0, x));

    return t * t * (3 - 2 * t);
};

/**
 * A cada N palavras pegas um animal (sorteado, sem ligacao com o resultado) surge ao lado do avatar, fica nitido e
 * some. Na rua: lobo e gato correm, a aguia voa e o tubarao desliza como espirito. Os modelos entram em segundo plano.
 */
function criarAnimaisBabylon(B, cena, { cenario = 'rua', aCada = 4, duracao = 3.6, reduzirMovimento = false, somAnimal = null }) {
    const tempoTotal = Number.isFinite(duracao) ? Math.min(8, Math.max(1, duracao)) : 3.6;
    const tempoEntrada = tempoTotal * 0.2;
    const tempoSaida = tempoTotal * 0.25;
    const prontos = {};
    const fixo = new URLSearchParams(location.search).get('animal');

    for (const [tipo, cfg] of Object.entries(MODELOS_ANIMAL)) {
        const url = cfg.arquivo;
        B.SceneLoader.ImportMeshAsync('', url.slice(0, url.lastIndexOf('/') + 1), url.slice(url.lastIndexOf('/') + 1), cena).then((r) => {
            const no = new B.TransformNode(`animal-${tipo}`, cena);
            const raiz = r.meshes[0];
            raiz.parent = no;
            raiz.rotationQuaternion = null;
            raiz.rotation.y = Math.PI; // o jogo anda para longe da camera: o animal corre na mesma direcao do avatar
            const caixa = raiz.getHierarchyBoundingVectors(true);
            const tamanho = caixa.max.subtract(caixa.min);

            r.animationGroups.forEach((g) => g.stop());
            const clipe = r.animationGroups.find((g) => cfg.clip.test(g.name)) ?? r.animationGroups[0] ?? null;

            for (const m of r.meshes) {
                m.alwaysSelectAsActiveMesh = true;
                m.isPickable = false;

                // Constelacao (espaco): o corpo vira uma malha de linhas luminosas, que soma luz ao fundo escuro.
                if (HABITATS[cenario]?.[tipo] === 'constelacao' && m.material) {
                    m.material.wireframe = true;
                    m.material.alphaMode = B.Engine.ALPHA_ADD;
                    m.material.disableDepthWrite = true;
                    m.material.fogEnabled = false;

                    if ('albedoColor' in m.material) {
                        m.material.albedoColor = new B.Color3(0.74, 0.84, 1).toLinearSpace();
                        m.material.emissiveColor = new B.Color3(0.42, 0.61, 1);
                    }
                }
            }

            no.setEnabled(false);
            prontos[tipo] = {
                no,
                malhas: r.meshes,
                clipe,
                escala: cfg.comprimento / Math.max(tamanho.x, tamanho.z, 0.001),
                pesY: caixa.min.y,
                centroY: (caixa.min.y + caixa.max.y) / 2,
            };
        }).catch((erro) => console.warn(`modelo ${url} indisponivel`, erro));
    }

    let pegas = 0;
    let baralho = [];
    let ultimo = null;
    let ativo = null;

    function sortear() {
        if (TIPOS_ANIMAL.includes(fixo)) {
            return fixo;
        }

        if (baralho.length === 0) {
            baralho = [...TIPOS_ANIMAL].sort(() => Math.random() - 0.5);

            if (baralho[baralho.length - 1] === ultimo) {
                baralho.unshift(baralho.pop());
            }
        }

        ultimo = baralho.pop();

        return ultimo;
    }

    function esconder() {
        for (const m of Object.values(prontos)) {
            m.clipe?.stop(); // parar (e nao pausar): um grupo pausado ainda conta como iniciado e o start() seguinte nao faria nada
            m.no.setEnabled(false);
        }
    }

    function soltar(ladoDoAvatar) {
        const tipo = sortear();
        const m = prontos[tipo];

        if (!m) {
            return; // o modelo ainda nao chegou: nesta vez o animal nao aparece
        }

        ativo = { tipo, movimento: HABITATS[cenario]?.[tipo] ?? 'espirito', t: 0, lado: ladoDoAvatar > 0 ? -1 : 1, proximoSom: 0 };
        m.no.setEnabled(true);

        if (m.clipe) {
            m.clipe.start(!reduzirMovimento, 1);

            if (reduzirMovimento) {
                m.clipe.goToFrame(m.clipe.from + (m.clipe.to - m.clipe.from) * 0.15);
                m.clipe.pause();
            }
        }
    }

    return {
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

            if (somAnimal && ativo.t >= ativo.proximoSom && tempoTotal - ativo.t > 0.4) {
                somAnimal(ativo.tipo);
                ativo.proximoSom += INTERVALO_SOM[ativo.tipo] ?? 2;
            }

            ativo.t += dt;

            if (ativo.t >= tempoTotal) {
                ativo = null;
                esconder();

                return;
            }

            const { movimento, tipo } = ativo;
            const m = prontos[tipo];
            const aparece = suave(ativo.t / tempoEntrada) * (1 - suave((ativo.t - (tempoTotal - tempoSaida)) / tempoSaida));
            const ampliar = movimento === 'margem' ? 1.8 : 1; // na margem o animal corre longe da camera: fica maior para caber
            const escala = m.escala * ampliar * (0.92 + 0.08 * aparece);
            const opacidade = aparece * (movimento === 'espirito' ? 0.55 : 1);

            for (const malha of m.malhas) {
                malha.visibility = opacidade;
            }

            m.no.scaling.setAll(escala);
            let y;

            if (movimento === 'nada') {
                y = 0.14 - m.centroY * escala; // o centro fica um pouco acima da linha da agua: dorso e barbatana de fora
            } else if (movimento === 'espirito' || movimento === 'constelacao') {
                y = (movimento === 'constelacao' ? 1.6 : 1.5) + (reduzirMovimento ? 0 : Math.sin(ativo.t * 4.5) * 0.18) - m.centroY * escala;
            } else if (movimento === 'voa') {
                y = 1.3 + (reduzirMovimento ? 0 : Math.sin(ativo.t * 2.4) * 0.2) - m.centroY * escala;
            } else {
                y = (CHAO_ANIMAL[cenario] ?? 0) - m.pesY * escala; // os pes pousam no chao
            }

            if (movimento === 'margem') {
                m.no.position.set(ativo.lado * X_MARGEM, y, 8.5 + ativo.t * 0.3); // na areia da margem, do lado oposto ao avatar
            } else {
                m.no.position.set(avatarX + ativo.lado * 3.2, y, 0.6 + ativo.t * 0.2);
            }
        },
        destruir() {
            esconder();

            for (const m of Object.values(prontos)) {
                m.clipe?.stop();
                m.malhas.forEach((x) => x.dispose());
                m.no.dispose();
            }
        },
    };
}

// ------------------------------------------------------------------ jogo
/**
 * Mesmas opcoes e retorno de criarJogo3D (ver game3d.js). O Babylon e carregado de forma assincrona: chamadas feitas
 * antes da cena ficar pronta (iniciarEtapa, definirProgresso, acelerar) ficam guardadas e rodam ao ficar pronta.
 */
export function criarJogoBabylon(opcoes) {
    let real = null;
    let destruido = false;
    const fila = [];
    const agora = (fn) => (real ? fn(real) : fila.push(fn));
    const jaExistiam = new Set(opcoes.parent.children);

    carregarBabylon()
        .then((B) => construir(B, opcoes))
        .then((jogo) => {
            if (destruido) {
                jogo.destruir();

                return;
            }

            real = jogo;
            fila.splice(0).forEach((fn) => fn(jogo));
        })
        .catch((erro) => {
            // Sem Babylon (rede bloqueada, CDN fora do ar, modelo ausente): limpa o que ficou na tela e segue com o three.js.
            console.warn('Babylon.js indisponivel; seguindo com o three.js', erro);

            for (const filho of [...opcoes.parent.children]) {
                if (!jaExistiam.has(filho)) {
                    filho.remove();
                }
            }

            if (destruido || !opcoes.alternativo) {
                return;
            }

            real = opcoes.alternativo(opcoes);
            fila.splice(0).forEach((fn) => fn(real));
        });

    return {
        iniciarEtapa: (i) => agora((j) => j.iniciarEtapa(i)),
        escolher: (lado) => (real ? real.escolher(lado) : false),
        definirProgresso: (p) => agora((j) => j.definirProgresso(p)),
        acelerar: (ativo) => agora((j) => j.acelerar(ativo)),
        obterEstado: () => (real ? real.obterEstado() : { estado: 'carregando', motor: 'babylon' }),
        passo: (dt) => real?.passo?.(dt),
        destruir() {
            destruido = true;
            real?.destruir();
        },
    };
}

async function construir(B, opcoes) {
    const { parent, etapas = [], rotulosEtapas = [], reduzirMovimento = false } = opcoes;
    const params = new URLSearchParams(location.search);
    const modoTeste = params.get('teste') === '1'; // relogio controlado (passo), para capturas exatas
    const velocidadeBase = reduzirMovimento ? VELOCIDADE.reduzida : VELOCIDADE.normal;
    const turboForca = Math.min(3, Math.max(1, Number(params.get('turbo')) || opcoes.turboForca || 1.9));
    const reacoes = opcoes.reacoes !== false && !reduzirMovimento;
    const spec = opcoes.avatar;
    const dinamico = typeof opcoes.proximoPortao === 'function';
    const cenario = CENARIOS_DO_MUNDO.includes(opcoes.cenario) ? opcoes.cenario : 'rua';
    const rua = cenario === 'rua';

    // ------------------------------------------------------------ motor e cena
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation;outline:none';
    parent.appendChild(canvas);

    const motor = new B.Engine(canvas, true, { preserveDrawingBuffer: modoTeste, stencil: true, antialias: true });
    let ratioAtual = Math.min(window.devicePixelRatio || 1, 2);
    motor.setHardwareScalingLevel(1 / ratioAtual);

    const cena = new B.Scene(motor);
    cena.skipPointerMovePicking = true;
    cena.fogMode = B.Scene.FOGMODE_LINEAR;

    if (modoTeste) {
        cena.useConstantAnimationDeltaTime = true;
        cena.constantAnimationDeltaTime = 16;
    }

    const cor3 = (hex) => B.Color3.FromHexString(hex);
    const camera = new B.FreeCamera('camera', new B.Vector3(0, 3.1, -6), cena);
    camera.minZ = 0.1;
    camera.maxZ = 320;
    camera.fov = (CFG.fov * Math.PI) / 180;
    camera.setTarget(new B.Vector3(0, 1.7, 11));

    // ------------------------------------------------------------ curvas
    // A rua faz curvas suaves: no vertex shader, tudo que esta longe sai um pouco para o lado em proporcao ao quadrado
    // da distancia (a tecnica do "mundo curvo", a mesma do game3d.js). So o desenho muda; portoes, placas e logica ficam
    // retos. Ceu, sol, nuvens, estrelas e sprites nao curvam (marcados com metadata.semCurva). Desligado com "reduzir movimento".
    const curvasAtivas = !reduzirMovimento && params.get('curvas') !== '0' && Boolean(B.MaterialPluginBase); // ?curvas=0 desliga
    const curva = { valor: 0 };

    if (curvasAtivas) {
        class PluginCurva extends B.MaterialPluginBase {
            constructor(material) {
                super(material, 'Curva', 250, { CURVA: false }, true, true);
            }

            getClassName() {
                return 'PluginCurva';
            }

            prepareDefines(defines) {
                defines.CURVA = !this._material.metadata?.semCurva && !this._material.pointsCloud;
            }

            getUniforms() {
                return {
                    ubo: [{ name: 'uCurva', size: 2, type: 'vec2' }],
                    vertex: `#ifdef CURVA
uniform vec2 uCurva;
#endif`,
                };
            }

            bindForSubMesh(uniformBuffer) {
                uniformBuffer.updateFloat2('uCurva', curva.valor, cena.activeCamera ? cena.activeCamera.globalPosition.z : -6);
            }

            getCustomCode(tipo) {
                if (tipo !== 'vertex') {
                    return null;
                }

                return {
                    CUSTOM_VERTEX_UPDATE_WORLDPOS: `#ifdef CURVA
float dzCurva = worldPos.z - uCurva.y;
worldPos.x += uCurva.x * dzCurva * dzCurva;
#endif`,
                };
            }
        }

        const curvar = (m) => {
            if (!m.__curva && (m instanceof B.StandardMaterial || (B.PBRBaseMaterial && m instanceof B.PBRBaseMaterial))) {
                m.__curva = new PluginCurva(m);
            }
        };

        cena.materials.forEach(curvar);
        cena.onNewMaterialAddedObservable.add(curvar);
    }

    const luzCeu = new B.HemisphericLight('ceu', new B.Vector3(0, 1, 0), cena);
    const luzSol = new B.DirectionalLight('sol', new B.Vector3(0.4, -1, -0.45), cena);
    const brilho = new B.GlowLayer('brilho', cena, { blurKernelSize: 24 });
    brilho.intensity = 0.7;
    const semBrilho = B.MeshBuilder.CreateBox('semBrilho', { size: 0.01 }, cena);
    semBrilho.isVisible = false;
    brilho.addIncludedOnlyMesh(semBrilho); // o brilho so vale para a moldura da placa escolhida

    let s = 20261028;
    const sorteio = () => {
        s = (s * 1664525 + 1013904223) >>> 0;

        return s / 4294967296;
    };

    const material = (cor, extra = {}) => {
        const m = new B.StandardMaterial('m', cena);
        m.diffuseColor = cor3(cor);
        m.specularColor = new B.Color3(0.04, 0.04, 0.04);
        Object.assign(m, extra);

        return m;
    };

    /** Textura desenhada em canvas (o Babylon cuida do envio para a GPU). */
    function texturaDeCanvas(largura, altura, desenhar, { alfa = false } = {}) {
        const t = new B.DynamicTexture('tex', { width: largura, height: altura }, cena, true);
        const c = t.getContext();
        desenhar(c, largura, altura);
        t.hasAlpha = alfa;
        t.update();

        return t;
    }

    // ------------------------------------------------------------ ceu, sol e nuvens
    const ceuTextura = new B.DynamicTexture('ceu', { width: 2, height: 256 }, cena, false);
    const ceuMaterial = new B.StandardMaterial('ceu', cena);
    ceuMaterial.disableLighting = true;
    ceuMaterial.emissiveTexture = ceuTextura;
    ceuMaterial.diffuseColor = new B.Color3(0, 0, 0);
    ceuMaterial.specularColor = new B.Color3(0, 0, 0);
    ceuMaterial.fogEnabled = false;
    ceuMaterial.backFaceCulling = false;
    ceuMaterial.metadata = { semCurva: true };
    const ceu = B.MeshBuilder.CreatePlane('ceu', { width: 700, height: 220 }, cena);
    ceu.material = ceuMaterial;
    ceu.position.set(0, 60, 230);
    ceu.isPickable = false;

    function desenharCeu(topo, base) {
        const c = ceuTextura.getContext();
        const g = c.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, topo);
        g.addColorStop(0.55, base);
        g.addColorStop(1, base);
        c.fillStyle = g;
        c.fillRect(0, 0, 2, 256);
        ceuTextura.update();
    }

    const elementoCeu = (largura, altura, textura, x, y, z) => {
        const plano = B.MeshBuilder.CreatePlane('ceu-el', { width: largura, height: altura }, cena);
        const m = new B.StandardMaterial('ceu-el', cena);
        m.disableLighting = true;
        m.emissiveColor = new B.Color3(1, 1, 1);
        m.diffuseTexture = textura;
        m.useAlphaFromDiffuseTexture = true;
        m.fogEnabled = false;
        m.backFaceCulling = false;
        m.metadata = { semCurva: true };
        plano.material = m;
        plano.position.set(x, y, z);
        plano.isPickable = false;

        return { plano, m };
    };

    const solTextura = texturaDeCanvas(128, 128, (c) => {
        const g = c.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,214,150,1)');
        g.addColorStop(0.35, 'rgba(255,196,120,0.75)');
        g.addColorStop(1, 'rgba(255,196,120,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, 128, 128);
    }, { alfa: true });
    const solCeu = elementoCeu(46, 46, solTextura, 26, 30, 195);

    const nuvemTextura = texturaDeCanvas(256, 96, (c) => {
        c.fillStyle = 'rgba(255,255,255,0.92)';

        for (const [x, y, r] of [[70, 56, 34], [110, 44, 42], [158, 52, 36], [196, 60, 28], [130, 66, 32]]) {
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
            c.fill();
        }
    }, { alfa: true });
    const nuvens = Array.from({ length: 7 }, (_, i) => {
        const l = 34 + sorteio() * 22;
        const nuvem = elementoCeu(l, 13 + sorteio() * 8, nuvemTextura, -80 + i * 28 + sorteio() * 10, 26 + sorteio() * 18, 170 + sorteio() * 40);
        nuvem.m.diffuseColor = new B.Color3(0, 0, 0);

        return nuvem;
    });

    // ------------------------------------------------------------ rua
    // Rio, ceu, neve, trilhos e espaco montam o proprio mundo (mundo-babylon.js); a rua so existe no cenario 'rua'.
    const asfalto = material('#3b4a5c');
    // Itens que andam com a rua (z logico cresce para tras, como no three.js; aqui o mundo anda para -z).
    const movel = [];
    const arvores = [];

    function adicionarMovel(obj, comprimento, zInicial) {
        obj.position.z = -zInicial;
        movel.push({ obj, comprimento });
    }

    if (rua) {
        // Chao, calcadas e meios-fios em pedacos de 15 m (instancias de uma caixa so): as curvas deslocam os vertices, e uma
        // caixa de 420 m so tem os das pontas (o three.js usa 140 segmentos na mesma caixa).
        const PEDACO = 15;
        const PEDACOS = 28; // 28 x 15 m = 420 m, de z = -40 a z = 380
        const faixaLonga = (nome, largura, altura, x, y, mat) => {
            const modelo = B.MeshBuilder.CreateBox(nome, { width: largura, height: altura, depth: PEDACO }, cena);
            modelo.material = mat;
            modelo.isVisible = false;

            for (let i = 0; i < PEDACOS; i++) {
                const parte = modelo.createInstance(`${nome}${i}`);
                parte.position.set(x, y, -40 + PEDACO / 2 + i * PEDACO);
                parte.isPickable = false;
            }
        };

        faixaLonga('rua', LARGURA_ESTRADA, 0.1, 0, -0.05, asfalto);

        for (const lado of [-1, 1]) {
            faixaLonga('calcada', 4.2, 0.2, lado * (LARGURA_ESTRADA / 2 + 2.1), 0, material('#97a3b2'));
            faixaLonga('meio-fio', 0.25, 0.22, lado * (LARGURA_ESTRADA / 2 + 0.1), 0.01, material('#7d8999'));
        }

        const tracoBase = B.MeshBuilder.CreateBox('traco', { width: 0.18, height: 0.03, depth: 1.8 }, cena);
        tracoBase.material = material('#f6f1e0');
        tracoBase.isVisible = false;

        for (let i = 0; i < PERIODO / 5; i++) {
            const traco = tracoBase.createInstance(`traco${i}`);
            traco.position.y = 0.06;
            adicionarMovel(traco, 0, Z_TRAS - i * 5 - 2.5);
        }

        const texturasPredio = PREDIOS.map((cor) => texturaDeCanvas(128, 256, (c) => {
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
        }));
        const materiaisPredio = texturasPredio.map((t) => {
            const m = new B.StandardMaterial('predio', cena);
            m.diffuseTexture = t;
            m.specularColor = new B.Color3(0, 0, 0);

            return m;
        });

        const posteBase = B.MeshBuilder.CreateCylinder('poste', { diameterTop: 0.14, diameterBottom: 0.18, height: 4.4, tessellation: 8 }, cena);
        posteBase.material = material('#4a5668');
        posteBase.isVisible = false;
        const lampadaBase = B.MeshBuilder.CreateSphere('lampada', { diameter: 0.44, segments: 8 }, cena);
        lampadaBase.material = material('#ffe9b8', { emissiveColor: cor3('#ffe9b8'), disableLighting: true });
        lampadaBase.isVisible = false;
        const troncoBase = B.MeshBuilder.CreateCylinder('tronco', { diameterTop: 0.24, diameterBottom: 0.32, height: 1.5, tessellation: 8 }, cena);
        troncoBase.material = material('#6b4a2e');
        troncoBase.isVisible = false;
        const copaBase = [0, 1].map((k) => {
            const copa = B.MeshBuilder.CreateSphere('copa', { diameter: 2.2, segments: 10 }, cena);
            copa.material = material(k ? '#3f9b5f' : '#2e8350');
            copa.isVisible = false;

            return copa;
        });

        for (const lado of [-1, 1]) {
            const brutos = Array.from({ length: 14 }, () => 0.7 + sorteio() * 0.7);
            const soma = brutos.reduce((a, b) => a + b, 0);
            let percorrido = 0;

            brutos.forEach((bruto, i) => {
                const comprimento = (bruto / soma) * PERIODO;
                const altura = 9 + sorteio() * 15;
                const largura = 5 + sorteio() * 3;
                const predio = B.MeshBuilder.CreateBox('predio', { width: largura, height: altura, depth: comprimento - 1 }, cena);
                predio.material = materiaisPredio[(i + (lado > 0 ? 3 : 0)) % materiaisPredio.length];
                predio.position.x = lado * (LARGURA_ESTRADA / 2 + 4.4 + largura / 2);
                predio.position.y = altura / 2;
                predio.isPickable = false;
                adicionarMovel(predio, comprimento, Z_TRAS - percorrido - comprimento / 2);
                percorrido += comprimento;
            });

            for (let i = 0; i < PERIODO / 17.5; i++) {
                const poste = posteBase.createInstance(`poste${lado}-${i}`);
                poste.position.set(lado * (LARGURA_ESTRADA / 2 + 0.9), 2.2, 0);
                adicionarMovel(poste, 0, Z_TRAS - i * 17.5 - 4);
                const lampada = lampadaBase.createInstance(`lampada${lado}-${i}`);
                lampada.position.set(lado * (LARGURA_ESTRADA / 2 + 0.9) - lado * 0.35, 4.5, 0);
                adicionarMovel(lampada, 0, Z_TRAS - i * 17.5 - 4);

                const tronco = troncoBase.createInstance(`tronco${lado}-${i}`);
                tronco.position.set(lado * (LARGURA_ESTRADA / 2 + 3.2), 0.75, 0);
                adicionarMovel(tronco, 0, Z_TRAS - i * 17.5 - 13);
                const copa = copaBase[i % 2].createInstance(`copa${lado}-${i}`);
                copa.position.set(lado * (LARGURA_ESTRADA / 2 + 3.2), 2.2, 0);
                adicionarMovel(copa, 0, Z_TRAS - i * 17.5 - 13);
                arvores.push(copa);
            }
        }
    }

    // Sombra "de mancha" sob o avatar (mais barata que sombras em tempo real).
    const sombraAvatar = B.MeshBuilder.CreateGround('sombra', { width: 1.5, height: 1.5 }, cena);
    sombraAvatar.position.y = 0.04;
    sombraAvatar.setEnabled(rua);
    sombraAvatar.isPickable = false;
    sombraAvatar.material = material('#000000', {
        diffuseTexture: texturaDeCanvas(64, 64, (c) => {
            const g = c.createRadialGradient(32, 32, 2, 32, 32, 30);
            g.addColorStop(0, 'rgba(0,0,0,0.5)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g;
            c.fillRect(0, 0, 64, 64);
        }, { alfa: true }),
        useAlphaFromDiffuseTexture: true,
        disableLighting: true,
        emissiveColor: new B.Color3(0, 0, 0),
    });
    sombraAvatar.material.diffuseColor = new B.Color3(0, 0, 0);

    // ------------------------------------------------------------ avatar
    // Pessoa com modelo 3D (glTF com esqueleto) quando ha `modelo` e o jogo a pe ou de cadeira o aceita; nos demais casos
    // (e com `?modelos=0`) vale o avatar de formas simples, montado pelo three.js e espelhado aqui (espelho-babylon.js).
    const avatarNo = new B.TransformNode('avatar', cena);
    // Fora da rua o avatar vai num veiculo (barco, aviao, treno, locomotiva, nave...) e o mundo vem do three.js, espelhado.
    const mundo = rua ? null : criarMundoEspelhado(B, cena, { cenario, meio: opcoes.meio, avatar: spec, avatarNo, reduzirMovimento, sorteio, pixelRatio: ratioAtual });
    const info = mundo ? mundo.info : infoMobilidade(spec);
    const semModelos = params.get('modelos') === '0';
    const usaModelo = rua && Boolean(spec.modelo) && !semModelos && ['anda', 'cadeira', 'bengala'].includes(spec.mobilidade ?? 'anda');
    const dirDe = (url) => [url.slice(0, url.lastIndexOf('/') + 1), url.slice(url.lastIndexOf('/') + 1)];
    let clipe = null;
    let avatar3d = null;
    let espelho = null;

    if (usaModelo) {
        const dentro = await B.SceneLoader.ImportMeshAsync('', ...dirDe(spec.modelo), cena);
        const raiz = dentro.meshes[0];
        raiz.parent = avatarNo;
        const caixa = raiz.getHierarchyBoundingVectors(true);
        const escalaModelo = ((spec.alturaModelo ?? ALTURA_HUMANO) * (spec.altura ?? 1)) / (caixa.max.y - caixa.min.y);
        raiz.scaling.scaleInPlace(escalaModelo);
        raiz.position.y = -caixa.min.y * escalaModelo;
        raiz.rotationQuaternion = null;
        raiz.rotation.y = Math.PI; // o jogo anda para longe da camera: o avatar mostra as costas

        for (const m of dentro.meshes) {
            m.alwaysSelectAsActiveMesh = true; // a malha esqueletica muda de forma: a caixa da pose inicial nao vale
            m.isPickable = false;

            for (const mat of [m.material].filter(Boolean)) {
                const cor = mat.name === 'camiseta' ? spec.roupa : (mat.name === 'calca' ? spec.calca : null);

                if (cor && mat.albedoColor) {
                    mat.albedoColor = cor3(cor).toLinearSpace();
                }
            }
        }

        dentro.animationGroups.forEach((g) => g.stop());
        clipe = dentro.animationGroups.find((g) => g.name.toLowerCase() === (spec.clip ?? 'walk'))
            ?? dentro.animationGroups.find((g) => /walk/i.test(g.name))
            ?? dentro.animationGroups[0] ?? null;
        clipe?.start(true, 1);

        // Acessorios (cadeira de rodas...): ja vem alinhados com o personagem; ganham a mesma posicao, escala e giro dele.
        for (const item of spec.acessorios ?? []) {
            const arquivo = typeof item === 'string' ? item : item.arquivo;

            try {
                const extra = await B.SceneLoader.ImportMeshAsync('', ...dirDe(arquivo), cena);
                const peca = extra.meshes[0];
                peca.parent = avatarNo;
                peca.rotationQuaternion = null;
                peca.scaling.copyFrom(raiz.scaling);
                peca.position.copyFrom(raiz.position);
                peca.rotation.copyFrom(raiz.rotation);
                extra.meshes.forEach((m) => { m.isPickable = false; });
            } catch (erro) {
                console.warn(`acessorio ${arquivo} indisponivel`, erro);
            }
        }
    } else if (!mundo) {
        avatar3d = criarAvatar3D({ ...spec, semModelo: true });
        espelho = espelharObjeto3D(B, cena, avatar3d.grupo, avatarNo);
    }

    // Som e visual do meio: motor (moto, taxi) solta fumaca escura pelo escape; os demais, poeira clara nos pes.
    const somDoMeio = mundo ? mundo.somDoMeio : (info.som ?? 'passos');
    const fumaca = !mundo && somDoMeio === 'motor';

    // Animais da corrida (opcao do painel; `?animais=N` na URL liga para teste, com um animal a cada N palavras).
    const animaisUrl = params.get('animais');
    const animaisConfig = animaisUrl !== null
        ? { aCada: Math.max(1, Number(animaisUrl) || 4), duracao: Number(params.get('duracao')) || undefined }
        : opcoes.animaisNaCorrida;
    const animais = animaisConfig
        ? criarAnimaisBabylon(B, cena, { cenario, aCada: animaisConfig.aCada, duracao: animaisConfig.duracao, reduzirMovimento, somAnimal: (tipo) => sons[tipo]?.() })
        : null;

    // ------------------------------------------------------------ clima
    // Fora da rua (cenarios espelhados do three.js) mais luz ambiente e menos sol: o three.js ilumina por cima com bem mais brilho.
    const luzBase = mundo ? { hemi: 0.72, sol: 0.55 } : { hemi: 0.55, sol: 0.75 };
    const climaInicial = CLIMAS[cenario === 'espaco' ? 'espaco' : 'sol'];
    const climaAlvo = { ...climaInicial };
    const climaAtual = {
        ...climaInicial,
        ceuTopo: cor3(climaInicial.ceuTopo),
        ceuBase: cor3(climaInicial.ceuBase),
        nevoa: cor3(climaInicial.nevoa),
        nuvemCor: cor3(climaInicial.nuvemCor),
        asfalto: cor3(climaInicial.asfalto),
        agua: cor3(climaInicial.agua),
        solo: cor3(climaInicial.solo),
        neve: cor3(climaInicial.neve),
    };
    let nomeClima = cenario === 'espaco' ? 'espaco' : 'sol';
    let portoesPassados = 0;
    let ultimoCeu = '';

    const texturaChuva = texturaDeCanvas(8, 64, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, 'rgba(214,232,248,0)');
        g.addColorStop(1, 'rgba(214,232,248,1)');
        c.fillStyle = g;
        c.fillRect(3, 0, 2, 64);
    }, { alfa: true });
    const chuva = new B.ParticleSystem('chuva', 800, cena);
    chuva.particleTexture = texturaChuva;
    chuva.emitter = new B.Vector3(0, 15, 30);
    chuva.minEmitBox = new B.Vector3(-16, 0, -32);
    chuva.maxEmitBox = new B.Vector3(16, 2, 45);
    chuva.direction1 = chuva.direction2 = new B.Vector3(0, -26, 0);
    chuva.minLifeTime = 0.62;
    chuva.maxLifeTime = 0.72;
    chuva.minSize = 0.35;
    chuva.maxSize = 0.6;
    chuva.minScaleX = 0.12;
    chuva.maxScaleX = 0.16;
    chuva.billboardMode = B.ParticleSystem.BILLBOARDMODE_STRETCHED;
    chuva.emitRate = 0;
    chuva.color1 = chuva.color2 = new B.Color4(1, 1, 1, 0.55);
    chuva.colorDead = new B.Color4(1, 1, 1, 0.55);
    chuva.start();

    const pontoBranco = texturaDeCanvas(32, 32, (c) => {
        const g = c.createRadialGradient(16, 16, 1, 16, 16, 15);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, 32, 32);
    }, { alfa: true });
    const folhas = new B.ParticleSystem('folhas', 200, cena);
    folhas.particleTexture = pontoBranco;
    folhas.emitter = new B.Vector3(-22, 3, 25);
    folhas.minEmitBox = new B.Vector3(0, -3, -30);
    folhas.maxEmitBox = new B.Vector3(0, 4, 45);
    folhas.direction1 = new B.Vector3(14, -0.4, 0);
    folhas.direction2 = new B.Vector3(18, 0.8, 0);
    folhas.minLifeTime = 2.4;
    folhas.maxLifeTime = 3.2;
    folhas.minSize = 0.12;
    folhas.maxSize = 0.24;
    folhas.emitRate = 0;
    folhas.color1 = folhas.color2 = new B.Color4(0.92, 0.95, 1, 0.8);
    folhas.colorDead = new B.Color4(0.92, 0.95, 1, 0);
    folhas.start();

    const hudClimaEl = document.createElement('span');

    function escolherClima(nome) {
        nomeClima = nome;
        Object.assign(climaAlvo, CLIMAS[nome]);
        hudClimaEl.innerHTML = `${ICONES_CLIMA[nome]}<span>${CLIMAS[nome].nome}</span>`;
        hudClimaEl.setAttribute('aria-label', `Clima: ${CLIMAS[nome].nome}`);
    }

    function proximoClima() {
        if (cenario === 'espaco') {
            return; // no espaco o clima nunca muda
        }

        const outros = Object.keys(CLIMAS).filter((c) => c !== nomeClima);
        escolherClima(outros[Math.floor(sorteio() * outros.length)]);
    }

    function atualizarClima(dt, velocidadeMundo) {
        const k = Math.min(1, dt * 0.9);

        for (const chave of ['alcance', 'luz', 'direta', 'sol', 'nuvem', 'chuva', 'vento', 'nuvemVelocidade']) {
            climaAtual[chave] += (climaAlvo[chave] - climaAtual[chave]) * k;
        }

        for (const chave of ['ceuTopo', 'ceuBase', 'nevoa', 'nuvemCor', 'asfalto', 'agua', 'solo', 'neve']) {
            climaAtual[chave] = B.Color3.Lerp(climaAtual[chave], cor3(climaAlvo[chave]), k);
        }

        const assinatura = `${climaAtual.ceuTopo.toHexString()}${climaAtual.ceuBase.toHexString()}`;

        if (assinatura !== ultimoCeu) {
            ultimoCeu = assinatura;
            desenharCeu(climaAtual.ceuTopo.toHexString(), climaAtual.ceuBase.toHexString());
        }

        cena.clearColor = new B.Color4(climaAtual.ceuBase.r, climaAtual.ceuBase.g, climaAtual.ceuBase.b, 1);
        cena.fogColor = climaAtual.nevoa;
        cena.fogStart = NEVOA_BASE.perto * climaAtual.alcance;
        cena.fogEnd = NEVOA_BASE.longe * climaAtual.alcance;
        luzCeu.intensity = luzBase.hemi * (climaAtual.luz / 1.5);
        luzCeu.groundColor = new B.Color3(0.55, 0.62, 0.72);
        luzSol.intensity = luzBase.sol * (climaAtual.direta / 1.35);
        asfalto.diffuseColor = climaAtual.asfalto;
        mundo?.aplicarClima(climaAtual);
        solCeu.m.emissiveColor = new B.Color3(climaAtual.sol, climaAtual.sol, climaAtual.sol);
        solCeu.plano.isVisible = climaAtual.sol > 0.02;

        for (const nuvem of nuvens) {
            nuvem.m.emissiveColor = climaAtual.nuvemCor.scale(climaAtual.nuvem);
            nuvem.plano.visibility = climaAtual.nuvem;
        }

        // Chuva e folhas ao vento: as particulas "andam para tras" junto com a rua.
        chuva.emitRate = reduzirMovimento || cenario === 'neve' ? 0 : 520 * climaAtual.chuva; // na neve cai neve, nao chuva
        chuva.direction1 = chuva.direction2 = new B.Vector3(0, -26, -velocidadeMundo);
        folhas.emitRate = reduzirMovimento || climaAtual.vento < 0.08 ? 0 : 55 * climaAtual.vento;
        folhas.direction1 = new B.Vector3(14 * climaAtual.vento, -0.4, -velocidadeMundo);
        folhas.direction2 = new B.Vector3(18 * climaAtual.vento, 0.8, -velocidadeMundo);

        continuos.clima.definir({ chuva: climaAtual.chuva, vento: climaAtual.vento });
    }

    // ------------------------------------------------------------ HUD, minimapa e linhas de velocidade
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
    escolherClima(nomeClima);

    const linhas = document.createElement('div');
    linhas.className = 'rua-linhas rua-linhas--3d';
    linhas.setAttribute('aria-hidden', 'true');
    parent.appendChild(linhas);

    // Velocimetro: so para quem se desloca sobre rodas (moto, taxi, cadeiras).
    const velocimetro = rua && info.rodas ? criarVelocimetro(parent, info) : null;

    // Selo discreto, para quem testa saber qual motor esta desenhando.
    const selo = document.createElement('div');
    selo.setAttribute('aria-hidden', 'true');
    selo.textContent = `Babylon.js ${B.Engine.Version}`;
    selo.style.cssText = 'position:absolute;right:8px;bottom:8px;z-index:30;padding:3px 8px;border-radius:999px;background:rgba(13,43,78,.7);color:#fff;font:600 11px system-ui,sans-serif;pointer-events:none';
    parent.appendChild(selo);

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

    // ------------------------------------------------------------ estado
    let etapaAtual = -1;
    let indice = 0;
    let escolhasNaEtapa = 0;
    let progressoExterno = null;
    let fracaoMapa = 0;
    let estado = 'parado'; // parado | correndo | concluida
    let velocidade = 0;
    let portao = null;
    let alvoX = 0;
    let saltoRestante = 0;
    let comemoracao = 0;
    let acelerando = false;
    let faseDoUltimoPasso = 0;
    let fase = 0;
    let turboAnterior = false;
    let agoraSeg = 0;
    let distancia = 0;
    let pulsoFov = 0;
    let tempoCamera = 0;
    let rodando = true;
    let fovBase = camera.fov;
    let aquecimento = 3;
    let janelaDt = 0;
    let janelaQuadros = 0;
    let janelasLentas = 0;
    let ultimoQuadro = performance.now();
    const ruidoSuave = (t, f) => (Math.sin(t * 41 + f) + Math.sin(t * 27 + f * 1.7) * 0.6) / 1.6;

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
            const geral = etapas.reduce((soma, e) => soma + e.length, 0);
            const feitas = etapas.slice(0, Math.max(0, etapaAtual)).reduce((soma, e) => soma + e.length, 0) + escolhasNaEtapa;
            percentual = geral === 0 ? 0 : Math.round((feitas / geral) * 100);
            texto = `Escolhas ${escolhasNaEtapa}/${total} · ${percentual}%`;
        }

        hudBarraPreenchimento.style.width = `${percentual}%`;
        hudBarra.setAttribute('aria-valuenow', String(percentual));
        hudConta.textContent = texto;
        hudBolas.innerHTML = progressoExterno ? '' : Array.from({ length: total }, (_, i) => {
            const classe = i < feitasNaEtapa ? 'feita' : (i === feitasNaEtapa ? 'atual' : '');

            return `<i class="${classe}"></i>`;
        }).join('');
    }

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

    // ------------------------------------------------------------ portoes
    function criarPortao(dados) {
        const grupo = new B.TransformNode('portao', cena);
        const placas = {};

        for (const lado of ['cima', 'baixo']) {
            const x = lado === 'cima' ? -PISTA_X : PISTA_X;
            const tela = document.createElement('canvas');
            tela.width = 512;
            tela.height = 256;
            desenharPlaca(tela, dados[lado].word, 'normal', TECLA_DE_LADO[lado]);
            const textura = new B.DynamicTexture('placa', { width: 512, height: 256 }, cena, true);
            textura.getContext().drawImage(tela, 0, 0);
            textura.hasAlpha = true;
            textura.update();

            const painel = B.MeshBuilder.CreatePlane(`placa-${lado}`, { width: CFG.placaL, height: CFG.placaA }, cena);
            const mp = new B.StandardMaterial('placa', cena);
            mp.diffuseTexture = textura;
            mp.useAlphaFromDiffuseTexture = true;
            mp.emissiveColor = new B.Color3(0.9, 0.9, 0.9);
            mp.disableLighting = true;
            mp.fogEnabled = false;
            mp.backFaceCulling = false;
            painel.material = mp;
            painel.parent = grupo;
            painel.position.set(x, CFG.altura, 0);
            painel.metadata = { lado };

            // Moldura so nas bordas (quatro barras): o brilho do GlowLayer nao pode cobrir a palavra.
            const moldura = new B.TransformNode('moldura', cena);
            const molduraMaterial = material('#f08a3c', { emissiveColor: cor3('#f08a3c') });
            const barras = [
                [CFG.placaL * 1.04, 0.12, 0, CFG.placaA / 2 + 0.03],
                [CFG.placaL * 1.04, 0.12, 0, -CFG.placaA / 2 - 0.03],
                [0.12, CFG.placaA * 1.06, CFG.placaL / 2 + 0.03, 0],
                [0.12, CFG.placaA * 1.06, -CFG.placaL / 2 - 0.03, 0],
            ].map(([largura, altura, dx, dy]) => {
                const barra = B.MeshBuilder.CreateBox('barra', { width: largura, height: altura, depth: 0.1 }, cena);
                barra.material = molduraMaterial;
                barra.parent = moldura;
                barra.position.set(dx, dy, 0);
                barra.isPickable = false;

                return barra;
            });
            moldura.parent = grupo;
            moldura.position.set(x, CFG.altura, 0.06);
            barras.forEach((b) => { b.isVisible = false; });

            const posteMaterial = material(COR.azul);
            const postes = [-CFG.postes, CFG.postes].map((dx) => {
                const poste = B.MeshBuilder.CreateCylinder('poste', { diameter: 0.14, height: CFG.altura, tessellation: 8 }, cena);
                poste.material = posteMaterial;
                poste.parent = grupo;
                poste.position.set(x + dx, CFG.altura / 2, 0.06);
                poste.isPickable = false;

                return poste;
            });

            placas[lado] = { tela, textura, painel, moldura, barras, molduraMaterial, posteMaterial, postes, palavra: dados[lado].word, escala: 1, material: mp };
        }

        // Faixa de pedestres sob o portao.
        const riscoMaterial = material('#f6f1e0');

        for (let i = -4; rua && i <= 4; i++) {
            const risco = B.MeshBuilder.CreateBox('risco', { width: 0.55, height: 0.03, depth: 3.2 }, cena);
            risco.material = riscoMaterial;
            risco.parent = grupo;
            risco.position.set(i * 0.95, 0.07, 0);
            risco.isPickable = false;
        }

        const base = mundo ? mundo.basePortao(grupo) : null; // boias, nuvens, bandeiras... do cenario

        grupo.position.z = PORTAO_Z_INICIAL;

        return { grupo, placas, dados, escolhivel: false, escolhido: false, passou: false, inicioMs: 0, riscoMaterial, base };
    }

    function dadosDoPortao(i) {
        return dinamico ? opcoes.proximoPortao({ etapa: etapaAtual, indice: i }) : (etapas[etapaAtual]?.[i] ?? null);
    }

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

        for (const p of Object.values(portao.placas)) {
            p.barras.forEach((b) => brilho.removeIncludedOnlyMesh(b));
            p.molduraMaterial.dispose();
            p.textura.dispose();
            p.material.dispose();
            p.posteMaterial.dispose();
        }

        portao.riscoMaterial.dispose();
        portao.base?.destruir();
        portao.grupo.getChildMeshes().forEach((m) => m.dispose());
        portao.grupo.dispose();
        portao = null;
    }

    // ------------------------------------------------------------ confete e poeira
    const quadrado = texturaDeCanvas(64, 64, (c) => {
        c.fillStyle = '#fff';
        c.fillRect(8, 8, 48, 48);
    }, { alfa: true });
    const confete = new B.ParticleSystem('confete', 240, cena);
    confete.particleTexture = quadrado;
    confete.emitter = new B.Vector3(0, 3, 0);
    confete.minEmitBox = new B.Vector3(-1.4, 0, -0.2);
    confete.maxEmitBox = new B.Vector3(1.4, 0.6, 0.2);
    confete.color1 = new B.Color4(0.94, 0.54, 0.24, 1);
    confete.color2 = new B.Color4(0.43, 0.66, 0.88, 1);
    confete.colorDead = new B.Color4(1, 0.84, 0.29, 0);
    confete.addColorGradient(0, new B.Color4(1, 0.42, 0.62, 1));
    confete.addColorGradient(0.35, new B.Color4(0.43, 0.9, 0.63, 1));
    confete.addColorGradient(0.7, new B.Color4(1, 0.84, 0.29, 1));
    confete.addColorGradient(1, new B.Color4(0.43, 0.66, 0.88, 0));
    confete.minSize = 0.14;
    confete.maxSize = 0.28;
    confete.minLifeTime = 1.0;
    confete.maxLifeTime = 1.7;
    confete.emitRate = 0;
    confete.gravity = new B.Vector3(0, -7, 0);
    confete.direction1 = new B.Vector3(-2.5, 1.5, -1.5);
    confete.direction2 = new B.Vector3(2.5, 4.5, 1.5);
    confete.minAngularSpeed = -6;
    confete.maxAngularSpeed = 6;
    confete.minEmitPower = 1;
    confete.maxEmitPower = 1;
    confete.start();

    const poeira = new B.ParticleSystem('poeira', 80, cena);
    poeira.particleTexture = pontoBranco;
    poeira.emitter = new B.Vector3(0, 0.15, -0.3);
    poeira.minEmitBox = new B.Vector3(-0.3, 0, 0);
    poeira.maxEmitBox = new B.Vector3(0.3, 0, 0);
    poeira.color1 = fumaca ? new B.Color4(0.35, 0.38, 0.42, 0.45) : (mundo ? new B.Color4(0.92, 0.96, 1, 0.3) : new B.Color4(0.91, 0.87, 0.8, 0.3));
    poeira.color2 = fumaca ? new B.Color4(0.25, 0.27, 0.3, 0.35) : (mundo ? new B.Color4(0.85, 0.92, 1, 0.2) : new B.Color4(0.8, 0.8, 0.8, 0.2));
    poeira.colorDead = new B.Color4(1, 1, 1, 0);
    poeira.minSize = 0.14;
    poeira.maxSize = 0.34;
    poeira.minLifeTime = 0.4;
    poeira.maxLifeTime = 0.8;
    poeira.emitRate = 0;
    poeira.direction1 = new B.Vector3(-0.4, 0.4, -1.6);
    poeira.direction2 = new B.Vector3(0.4, 0.9, -2.4);
    poeira.start();

    // ------------------------------------------------------------ escolha
    function escolher(lado) {
        if (estado !== 'correndo' || !portao || !portao.escolhivel || portao.escolhido) {
            return false;
        }

        portao.escolhido = true;
        const outro = lado === 'cima' ? 'baixo' : 'cima';
        const tempoMs = Math.round(performance.now() - portao.inicioMs);
        const atualizarPlaca = (l, st) => {
            const p = portao.placas[l];
            desenharPlaca(p.tela, p.palavra, st, TECLA_DE_LADO[l]);
            const c = p.textura.getContext();
            c.clearRect(0, 0, 512, 256);
            c.drawImage(p.tela, 0, 0);
            p.textura.update();
        };

        atualizarPlaca(lado, 'escolhida');
        atualizarPlaca(outro, 'descartada');
        portao.placas[lado].posteMaterial.diffuseColor = cor3(COR.laranja);
        portao.placas[outro].posteMaterial.diffuseColor = cor3('#9aa7b6');
        portao.placas[lado].escala = 1.12;

        // Palavra pega (no ciclo, "Deixar passar" tem id 0 e nao conta): a cada N, um animal surge do lado oposto.
        if (animais && portao.dados[lado].id !== 0) {
            animais.pegou(dinamico ? (progressoExterno?.total ?? 0) : (etapas[etapaAtual]?.length ?? 0), lado === 'cima' ? -1 : 1);
        }

        portao.placas[lado].barras.forEach((b) => {
            b.isVisible = true;
            brilho.addIncludedOnlyMesh(b);
        });
        pulsoFov = 1;
        escolhasNaEtapa++;

        alvoX = lado === 'cima' ? -PISTA_X : PISTA_X;
        saltoRestante = reduzirMovimento ? 0 : 0.34;
        comemoracao = reacoes && portao.dados[lado].id !== 0 ? COMEMORAR_DURACAO : 0;
        atualizarHud();

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

    // Teclado e toque (vista 3D: ← → escolhem, ↑ acelera).
    const teclas = { ArrowLeft: 'cima', a: 'cima', A: 'cima', ArrowRight: 'baixo', d: 'baixo', D: 'baixo' };
    const teclasDeAceleracao = ['ArrowUp', 'w', 'W'];

    const aoTecla = (e) => {
        if (teclasDeAceleracao.includes(e.key)) {
            if (estado === 'correndo') {
                acelerando = true;
                e.preventDefault();
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
    const aoPerderFoco = () => { acelerando = false; };
    const aoVoltarParaAba = () => {
        if (!document.hidden) {
            ultimoQuadro = performance.now();
        }
    };

    window.addEventListener('keydown', aoTecla);
    window.addEventListener('keyup', aoSoltar);
    window.addEventListener('blur', aoPerderFoco);
    document.addEventListener('visibilitychange', aoVoltarParaAba);

    cena.onPointerDown = (_e, pick) => {
        const lado = pick?.hit ? pick.pickedMesh?.metadata?.lado : null;

        if (lado && portao?.escolhivel && !portao.escolhido) {
            escolher(lado);
        }
    };

    // ------------------------------------------------------------ etapa
    function iniciarEtapa(i) {
        animais?.reiniciarEtapa();
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
            motor: 'babylon',
            estado,
            etapa: etapaAtual,
            indice,
            escolhas: escolhasNaEtapa,
            total: dinamico ? (progressoExterno?.total ?? 0) : (etapas[etapaAtual]?.length ?? 0),
            portaoEscolhivel: Boolean(portao?.escolhivel && !portao?.escolhido),
            modo: '3d',
            velocidade: Math.round(velocidade * 100) / 100,
            velocidadeBase,
            acelerando,
            clima: nomeClima,
            curva: 0,
            kmh: velocimetro?.valor() ?? null,
            avatarX: Math.round(avatarNo.position.x * 100) / 100,
        };
    }

    // ------------------------------------------------------------ camera e tamanho
    function ajustarTamanho() {
        motor.resize();
        const aspecto = motor.getAspectRatio(camera) || 16 / 9;
        const compensacao = Math.max(1, (16 / 9) / aspecto) ** 0.6;
        const fovGraus = Math.min(78, (2 * Math.atan(Math.tan((CFG.fov * Math.PI) / 360) * compensacao) * 180) / Math.PI);
        fovBase = (fovGraus * Math.PI) / 180;
        camera.fov = fovBase;
    }

    const observador = new ResizeObserver(ajustarTamanho);
    observador.observe(parent);
    ajustarTamanho();

    function posicionarCamera(dt) {
        const x = avatarNo.position.x;
        pulsoFov = Math.max(0, pulsoFov - dt * 2.5);
        const rad = Math.PI / 180;
        const fovAlvo = fovBase + (acelerando && velocidade > velocidadeBase * 1.1 && !reduzirMovimento ? 8 * rad : 0) + (reduzirMovimento ? 0 : pulsoFov * 4 * rad);

        if (Math.abs(camera.fov - fovAlvo) > 0.001) {
            camera.fov += (fovAlvo - camera.fov) * Math.min(1, dt * 5);
        }

        tempoCamera += dt;
        const tremor = acelerando && velocidade > velocidadeBase * 1.15 && !reduzirMovimento ? 0.022 : 0;
        const k = Math.min(1, dt * 4);
        camera.position.x += (x * 0.45 - camera.position.x) * k + ruidoSuave(tempoCamera, 0) * tremor;
        camera.position.y += (3.1 - camera.position.y) * k + ruidoSuave(tempoCamera, 2.1) * tremor;
        camera.position.z = -6;
        camera.setTarget(new B.Vector3(x * 0.3, 1.7, 11));
    }

    // ------------------------------------------------------------ quadro
    function passo(dt, relogioSeg) {
        agoraSeg = relogioSeg;
        const turbo = acelerando ? (reduzirMovimento ? 1 + (turboForca - 1) * 0.55 : turboForca) : 1;
        let alvo = 0;

        if (estado === 'correndo' && portao) {
            alvo = portao.escolhido
                ? velocidadeBase * turbo
                : velocidadeBase * turbo * Math.min(1, Math.max(0, (portao.grupo.position.z - CFG.parada) / 18));
        }

        velocidade += (alvo - velocidade) * Math.min(1, dt * 4.5);

        if (velocidade < 0.05) {
            velocidade = 0;
        }

        const dz = velocidade * dt;
        distancia += dz;

        // Enquanto a pessoa le o portao a rua fica reta, para as placas ficarem exatamente onde se espera.
        const lendo = Boolean(portao?.escolhivel && !portao?.escolhido);
        const curvaAlvo = lendo ? 0 : Math.sin(distancia / 85) * 0.0021;
        curva.valor += (curvaAlvo - curva.valor) * Math.min(1, dt * 2.2);

        for (const item of movel) {
            item.obj.position.z -= dz;

            if (item.obj.position.z + item.comprimento / 2 < -Z_TRAS) {
                item.obj.position.z += PERIODO;
            }
        }

        for (const nuvem of nuvens) {
            nuvem.plano.position.x += dt * climaAtual.nuvemVelocidade;

            if (nuvem.plano.position.x > 110) {
                nuvem.plano.position.x = -110;
            }
        }

        if (!reduzirMovimento) {
            arvores.forEach((a, i) => { a.rotation.z = Math.sin(agoraSeg * 2.2 + i) * 0.1 * climaAtual.vento; });
        }

        atualizarClima(dt, velocidade);

        // Turbo: linhas de velocidade, poeira e som.
        const ritmo = velocidadeBase > 0 ? velocidade / velocidadeBase : 0;
        const turboAtivo = acelerando && ritmo > 1.15 && estado === 'correndo';
        linhas.classList.toggle('ativa', turboAtivo && !reduzirMovimento);

        if (turboAtivo && !turboAnterior) {
            opcoes.aoTurbo?.({ som: somDoMeio });
        }

        turboAnterior = turboAtivo;
        continuos.motor.atualizar({ tipo: somDoMeio, ritmo, turbo: turboAtivo });
        velocimetro?.atualizar(ritmo);
        poeira.emitRate = turboAtivo && !reduzirMovimento ? 28 : 0;
        poeira.emitter = fumaca ? new B.Vector3(avatarNo.position.x + 0.2, 0.4, -1.9) : new B.Vector3(avatarNo.position.x, 0.15, -0.3);
        // A rua anda para tras: as particulas soltas no ar acompanham (a velocidade do mundo entra na direcao).
        poeira.direction1 = new B.Vector3(-0.4, 0.4, -velocidade - 1.6);
        poeira.direction2 = new B.Vector3(0.4, 0.9, -velocidade - 2.4);

        // Avatar: corrida (a animacao do esqueleto acompanha a velocidade), troca de pista e salto.
        fase += velocidade * dt * 1.05;

        if (clipe) {
            clipe.speedRatio = Math.min(Math.max(ritmo, 0), 2.2);
        }

        if (mundo) {
            mundo.atualizar(dt, dz, ritmo, fase, climaAtual.vento, agoraSeg);
        } else if (avatar3d) {
            avatar3d.animar(fase, ritmo);
            espelho.atualizar();
        }

        if (!mundo && velocidade / velocidadeBase > 0.3 && Math.floor(fase / Math.PI) !== faseDoUltimoPasso) {
            faseDoUltimoPasso = Math.floor(fase / Math.PI);
            opcoes.aoPasso?.();
        }

        if (portao?.escolhido && portao.grupo.position.z < -2.5) {
            alvoX = 0; // depois de passar pelo portao volta para o meio da pista
        }

        const desvio = alvoX - avatarNo.position.x;
        avatarNo.position.x += desvio * Math.min(1, dt * (alvoX === 0 ? 4 : 8));
        sombraAvatar.position.x = avatarNo.position.x;

        // Inclina e vira o corpo para o lado em que vai.
        let giroY = 0;
        let giroZ = 0;

        if (!reduzirMovimento) {
            giroY = desvio * 0.1;
            giroZ = -desvio * (info.rodas ? 0.14 : 0.07) + (mundo ? mundo.balanco(agoraSeg) : 0);
        }

        // No rio o barco flutua e no ar a aeronave sobe e desce de leve.
        const alturaBase = mundo ? mundo.alturaBase(agoraSeg) : 0;
        let alturaY = alturaBase;
        let escalaY = 1;
        let escalaXZ = 1;

        if (comemoracao > 0) {
            comemoracao = Math.max(0, comemoracao - dt);
            const p = 1 - comemoracao / COMEMORAR_DURACAO;
            alturaY = alturaBase + Math.sin(p * Math.PI) * (mundo ? 0.45 : 0.95);
            saltoRestante = 0;

            // A pe (ou de cadeira/veiculo em terra) o corpo se abaixa, estica no ar e gira uma volta inteira.
            if (!mundo) {
                escalaY = p < 0.15 ? 1 - 0.12 * Math.sin((p / 0.15) * Math.PI) : 1 + 0.07 * Math.sin(((p - 0.15) / 0.85) * Math.PI);
                escalaXZ = 1 / Math.sqrt(escalaY);
            }

            if (!mundo && !info.rodas) {
                giroY += p * p * (3 - 2 * p) * Math.PI * 2; // sobre rodas o veiculo nao gira
            }
        } else if (saltoRestante > 0) {
            saltoRestante = Math.max(0, saltoRestante - dt);
            alturaY = alturaBase + Math.sin((1 - saltoRestante / 0.34) * Math.PI) * 0.55;
        }

        avatarNo.position.y = alturaY;
        avatarNo.rotation.y = giroY;
        avatarNo.rotation.z = giroZ;
        avatarNo.scaling.set(escalaXZ, escalaY, escalaXZ);
        sombraAvatar.scaling.setAll(Math.max(0.5, 1 - (alturaY - alturaBase) * 0.45));

        // Portao.
        if (portao) {
            portao.grupo.position.z -= dz;

            if (!portao.escolhivel && portao.grupo.position.z <= CFG.legivel) {
                liberarPortao();
            }

            for (const p of Object.values(portao.placas)) {
                const escala = p.painel.scaling.x + (p.escala - p.painel.scaling.x) * Math.min(1, dt * 10);
                p.painel.scaling.setAll(escala);
                p.moldura.scaling.setAll(escala);
            }

            // O avatar esta atravessando o portao escolhido: chuva de confete e aviso (o celular vibra).
            if (portao.escolhido && !portao.passou && portao.grupo.position.z < 2.5) {
                portao.passou = true;

                if (reacoes) {
                    confete.emitter = new B.Vector3(avatarNo.position.x, 2.4, portao.grupo.position.z - 0.5);
                    confete.direction1 = new B.Vector3(-3, 1.5, -velocidade - 2);
                    confete.direction2 = new B.Vector3(3, 5, -velocidade + 2);
                    confete.manualEmitCount = 120;
                    opcoes.aoPassarPortao?.({ etapa: etapaAtual, indice });
                }
            }

            if (portao.grupo.position.z < PORTAO_Z_FIM) {
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

        animais?.atualizar(dt, avatarNo.position.x);
        atualizarMapa(dt);
        posicionarCamera(dt);
    }

    function quadro() {
        if (!rodando) {
            return;
        }

        const agora = performance.now();
        const bruto = (agora - ultimoQuadro) / 1000;
        const dt = Math.min(0.05, bruto);
        ultimoQuadro = agora;

        // Qualidade adaptativa: media baixa de quadros por segundo diminui a resolucao do desenho (so desce).
        if (aquecimento > 0) {
            aquecimento -= Math.min(0.1, bruto);
        } else if (!document.hidden && bruto < 0.5) {
            janelaDt += bruto;
            janelaQuadros++;

            if (janelaDt >= 2) {
                janelasLentas = janelaQuadros / janelaDt < 38 ? janelasLentas + 1 : 0;

                if (janelasLentas >= 2 && ratioAtual > 1) {
                    ratioAtual = Math.max(1, ratioAtual * 0.75);
                    motor.setHardwareScalingLevel(1 / ratioAtual);
                    ajustarTamanho();
                    janelasLentas = 0;
                    aquecimento = 2;
                }

                janelaDt = 0;
                janelaQuadros = 0;
            }
        }

        passo(dt, agora / 1000);
        cena.render();
    }

    posicionarCamera(1);
    desenharCeu(climaInicial.ceuTopo, climaInicial.ceuBase);
    atualizarClima(0.016, 0);

    if (!modoTeste) {
        motor.runRenderLoop(quadro);
    } else {
        cena.render();
    }

    queueMicrotask(() => opcoes.aoPronto?.());

    return {
        iniciarEtapa,
        escolher,
        definirProgresso(progresso) {
            progressoExterno = progresso;
            atualizarHud();
        },
        acelerar(ativo) {
            acelerando = Boolean(ativo) && estado === 'correndo';
        },
        obterEstado,
        // Para testes: avanca o relogio por um tempo fixo (ver `?teste=1`).
        passo(dt = 0.016) {
            ultimoQuadro += dt * 1000;
            passo(dt, (agoraSeg || 0) + dt);
            cena.render();
        },
        destruir() {
            rodando = false;
            window.removeEventListener('keydown', aoTecla);
            window.removeEventListener('keyup', aoSoltar);
            window.removeEventListener('blur', aoPerderFoco);
            document.removeEventListener('visibilitychange', aoVoltarParaAba);
            observador.disconnect();
            animais?.destruir();
            velocimetro?.remover();
            espelho?.destruir();
            mundo?.destruir();
            continuos.motor.parar();
            continuos.clima.parar();
            motor.stopRenderLoop();
            cena.dispose();
            motor.dispose();
            canvas.remove();
            hud.remove();
            mapa.remove();
            linhas.remove();
            selo.remove();
        },
    };
}
