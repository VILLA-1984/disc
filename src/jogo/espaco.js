import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Modelos 3D prontos (glTF, CC0, Quaternius "Ultimate Space Kit") so neste cenario e so no projeto Next: piloto da melhoria.
 * Entram de forma assincrona por cima do veiculo feito em codigo, que continua sendo o plano B (sem rede, arquivo ausente
 * ou `?modelos=0` na URL). `largura` e o tamanho no eixo x depois de girar o modelo para a proa apontar para -z; `topo`
 * e a altura da parte de cima do casco; `cabineZ` e quanto a abertura da cabine fica atras do centro do casco (o avatar
 * fica ali, so com o tronco para fora); `semBanco` tira o banco feito em codigo; `popa` guia onde ficam as chamas.
 */
const MODELOS = {
    nave: { arquivo: 'nave.glb', largura: 4.3, topo: 1.0, cabineZ: 0.76, semBanco: true, popa: true },
    'disco-voador': { arquivo: 'disco-voador.glb', largura: 4.4, topo: 0.1 },
};
const PASTA_MODELOS = '/modelos/espaco/';
const carregador = new GLTFLoader();
const emCache = new Map();

/** Carrega (uma vez) o glTF de um meio; quem chamar recebe um clone novo da cena. */
function carregarModelo(arquivo) {
    if (!emCache.has(arquivo)) {
        emCache.set(arquivo, carregador.loadAsync(PASTA_MODELOS + arquivo).then((gltf) => gltf.scene));
    }

    return emCache.get(arquivo).then((cena) => cena.clone(true));
}

/**
 * Cenario do espaco: estrelas, nebulosas e planetas ao fundo, balizas de luz e asteroides que passam, riscos de
 * estrelas, rochas girando e cometas. Como nos outros cenarios, e so o visual: portoes, placas, ciclo de palavras,
 * pontuacao e relatorio sao os mesmos. As regras de quem pode ir (e os textos) ficam em cenarios.js.
 */

const lambert = (cor) => new THREE.MeshLambertMaterial({ color: cor });
const brilho = (cor, opacidade = 1) => new THREE.MeshBasicMaterial({ color: cor, transparent: opacidade < 1, opacity: opacidade });

/** Numero "aleatorio" que depende so da posicao: vertices iguais recebem o mesmo desvio (a rocha nao racha). */
const ruido = (x, y, z) => {
    const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;

    return v - Math.floor(v);
};

/** Rocha de asteroide: icosaedro com os vertices deformados e faces chapadas. */
function criarRocha(raio, cor) {
    const geometria = new THREE.IcosahedronGeometry(raio, 1);
    const posicao = geometria.attributes.position;

    for (let i = 0; i < posicao.count; i++) {
        const fator = 0.74 + ruido(posicao.getX(i), posicao.getY(i), posicao.getZ(i)) * 0.5;
        posicao.setXYZ(i, posicao.getX(i) * fator, posicao.getY(i) * fator, posicao.getZ(i) * fator);
    }

    geometria.computeVertexNormals();

    return new THREE.Mesh(geometria, new THREE.MeshLambertMaterial({ color: cor, flatShading: true }));
}

/** Textura de planeta desenhada num canvas (sem arquivos): gigante de bandas, planeta azul com continentes, ou vermelho. */
function texturaDePlaneta(tipo, sorteio) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const c = canvas.getContext('2d');

    if (tipo === 'gigante') {
        const faixas = ['#e8c690', '#c99a62', '#f0d9ae', '#b9824f', '#e3b87c', '#d4a86f', '#f3e0b8', '#bf8a55'];

        for (let y = 0; y < 128; y += 8) {
            c.fillStyle = faixas[(y / 8 + Math.floor(sorteio() * 3)) % faixas.length];
            c.fillRect(0, y, 256, 8);
        }

        c.fillStyle = 'rgba(160, 90, 50, 0.55)';
        c.beginPath();
        c.ellipse(170, 76, 18, 8, 0, 0, Math.PI * 2);
        c.fill();
    } else if (tipo === 'terra') {
        c.fillStyle = '#1d5fae';
        c.fillRect(0, 0, 256, 128);

        for (let i = 0; i < 16; i++) {
            c.fillStyle = i % 3 === 0 ? '#8c7a4a' : '#3f9a52';
            c.beginPath();
            c.ellipse(sorteio() * 256, 22 + sorteio() * 84, 10 + sorteio() * 26, 6 + sorteio() * 14, sorteio() * 3, 0, Math.PI * 2);
            c.fill();
        }

        c.fillStyle = '#f2f7fb';
        c.fillRect(0, 0, 256, 7);
        c.fillRect(0, 121, 256, 7);
        c.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        c.lineWidth = 5;
        c.lineCap = 'round';

        for (let i = 0; i < 14; i++) {
            const x = sorteio() * 256;
            const y = 14 + sorteio() * 100;
            c.beginPath();
            c.moveTo(x, y);
            c.quadraticCurveTo(x + 18, y - 6, x + 36 + sorteio() * 20, y);
            c.stroke();
        }
    } else {
        c.fillStyle = '#b9552f';
        c.fillRect(0, 0, 256, 128);

        for (let i = 0; i < 22; i++) {
            c.fillStyle = i % 2 ? 'rgba(120, 50, 30, 0.45)' : 'rgba(230, 150, 110, 0.35)';
            c.beginPath();
            c.ellipse(sorteio() * 256, sorteio() * 128, 8 + sorteio() * 22, 4 + sorteio() * 10, sorteio() * 3, 0, Math.PI * 2);
            c.fill();
        }
    }

    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;

    return textura;
}

/** Brilho suave e redondo (nebulosa): gradiente radial que some nas bordas. */
function texturaDeNebulosa(cor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    const gradiente = c.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradiente.addColorStop(0, `${cor}cc`);
    gradiente.addColorStop(0.45, `${cor}55`);
    gradiente.addColorStop(1, `${cor}00`);
    c.fillStyle = gradiente;
    c.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(canvas);
}

/**
 * Mundo do espaco. O fundo (estrelas, nebulosas e planetas) fica parado, bem longe; o que passa pela rota (balizas de
 * luz e asteroides) anda com o resto do cenario, em `adicionarMovel`.
 *
 * Na vista lateral a camera fica rente a um dos lados da rota (o grupo `lados.direito`, que o jogo esconde): o que passa
 * perto da rota entra nos grupos dos lados e o fundo (planetas e nebulosas) vai para onde a camera olha.
 *
 * @returns {{solo: THREE.Mesh, planetas: THREE.Mesh[], basePortao: () => THREE.Group}}
 */
export function construirEspaco({ cena, lados, adicionarMovel, sorteio, periodo, zTras, modo = '3d' }) {
    const lateral = modo === 'lateral';
    const grupoDoLado = (lado) => (lado < 0 ? lados.esquerdo : lados.direito);

    // `solo` e a "superficie" que o jogo pinta conforme o clima; no espaco nao existe chao, entao fica invisivel.
    const solo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ visible: false }));
    solo.position.set(0, -80, -170);
    cena.add(solo);

    // Estrelas ao fundo: pontos numa esfera grande, de varias cores e tamanhos.
    const QUANTIDADE = 1700;
    const posicoes = new Float32Array(QUANTIDADE * 3);
    const cores = new Float32Array(QUANTIDADE * 3);
    const tons = [new THREE.Color(0xffffff), new THREE.Color(0xcfe3ff), new THREE.Color(0xfff1c9), new THREE.Color(0xffd6d6)];

    for (let i = 0; i < QUANTIDADE; i++) {
        let x;
        let y;
        let z;

        do {
            x = sorteio() * 2 - 1;
            y = sorteio() * 2 - 1;
            z = sorteio() * 2 - 1;
        } while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < 0.05 || z > 0.35); // so o que a camera enxerga: o fundo e as laterais

        const norma = Math.hypot(x, y, z);
        const raio = 270;
        posicoes.set([(x / norma) * raio, (y / norma) * raio, (z / norma) * raio], i * 3);
        const tom = tons[Math.floor(sorteio() * tons.length)];
        const intensidade = 0.55 + sorteio() * 0.45;
        cores.set([tom.r * intensidade, tom.g * intensidade, tom.b * intensidade], i * 3);
    }

    const estrelasGeo = new THREE.BufferGeometry();
    estrelasGeo.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
    estrelasGeo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    const estrelas = new THREE.Points(estrelasGeo, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
    estrelas.frustumCulled = false;
    cena.add(estrelas);

    // Nebulosas: manchas grandes e translucidas de cor, bem ao fundo.
    const nebulosas = lateral
        ? [['#7a3fd1', -250, 20, -60, 200], ['#1fb5c9', -260, 45, -170, 180], ['#d1456f', -240, 70, 40, 170]]
        : [['#7a3fd1', -95, 18, -250, 200], ['#1fb5c9', 120, 40, -260, 170], ['#d1456f', 10, 70, -285, 190]];

    for (const [cor, x, y, z, tamanho] of nebulosas) {
        const nebulosa = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDeNebulosa(cor), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        nebulosa.position.set(x, y, z);
        nebulosa.scale.setScalar(tamanho);
        cena.add(nebulosa);
    }

    // Planetas ao fundo (giram devagar): um gigante com aneis, um planeta azul com a sua lua e um vermelho.
    const planetas = [];
    const planeta = (raio, tipo, x, y, z, inclinacao = 0.3) => {
        const corpo = new THREE.Mesh(new THREE.SphereGeometry(raio, 36, 24), new THREE.MeshLambertMaterial({ map: texturaDePlaneta(tipo, sorteio), fog: false }));
        corpo.position.set(x, y, z);
        corpo.rotation.z = inclinacao;
        cena.add(corpo);
        planetas.push(corpo);

        return corpo;
    };

    // [gigante, terra, lua, vermelho]: na vista de frente ficam ao fundo; na lateral, do lado para onde a camera olha.
    const lugares = lateral
        ? { gigante: [-215, 40, -150], terra: [-195, -6, -30], lua: [-165, 32, -95], vermelho: [-225, 64, -250] }
        : { gigante: [-118, 30, -215], terra: [100, -2, -185], lua: [58, 30, -150], vermelho: [-38, 56, -262] };

    const gigante = planeta(30, 'gigante', ...lugares.gigante, 0.25);
    const aneis = new THREE.Mesh(new THREE.RingGeometry(40, 66, 80), new THREE.MeshBasicMaterial({ color: 0xcdb98c, transparent: true, opacity: 0.78, side: THREE.DoubleSide, fog: false }));
    aneis.rotation.x = Math.PI / 2 - 0.42;
    aneis.rotation.y = lateral ? Math.PI / 2 + 0.25 : 0.25; // de lado, o anel precisa abrir para a camera
    aneis.position.copy(gigante.position);
    cena.add(aneis);

    planeta(34, 'terra', ...lugares.terra, 0.4);
    const lua = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 14), new THREE.MeshLambertMaterial({ color: 0xc4c8cf, fog: false }));
    lua.position.set(...lugares.lua);
    cena.add(lua);
    planeta(13, 'vermelho', ...lugares.vermelho, 0.1);

    // Balizas de luz dos dois lados da rota: marcam a velocidade, como a faixa da rua.
    const luzes = [0x35e0ff, 0xff4fa8, 0xffd23f, 0x7dff9a];
    const espacamento = 6;

    for (const lado of [-1, 1]) {
        for (let i = 0; i < periodo / espacamento; i++) {
            const baliza = new THREE.Group();
            const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.3, 6), lambert(0x4a5668));
            haste.position.y = 0.65;
            const ponta = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), brilho(luzes[(i + (lado > 0 ? 1 : 0)) % luzes.length]));
            ponta.position.y = 1.4;
            baliza.add(haste, ponta);
            baliza.position.x = lado * 6.6;
            adicionarMovel(baliza, 0, zTras - i * espacamento - (lado > 0 ? espacamento / 2 : 0), grupoDoLado(lado));
        }
    }

    // Asteroides parados longe da rota (os que giram, perto dela, ficam em criarEspacoVivo).
    for (const lado of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
            const rocha = criarRocha(0.6 + sorteio() * 1.5, i % 2 ? 0x8a8378 : 0x6f6a64);
            rocha.rotation.set(sorteio() * 3, sorteio() * 3, sorteio() * 3);
            rocha.scale.set(1 + sorteio() * 0.5, 0.7 + sorteio() * 0.5, 1 + sorteio() * 0.5);
            rocha.position.set(lado * (12 + sorteio() * 26), -4 + sorteio() * 16, 0);
            adicionarMovel(rocha, 0, zTras - (i / 9) * periodo - sorteio() * 6, grupoDoLado(lado));
        }
    }

    // Em vez da faixa de pedestres: uma fileira de luzes sob as placas, com uma barra de luz por tras.
    function basePortao() {
        const grupo = new THREE.Group();

        for (let i = -4; i <= 4; i++) {
            const luz = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), brilho(luzes[Math.abs(i) % luzes.length]));
            luz.position.set(i * 1.05, 0.45, 0);
            grupo.add(luz);
        }

        const barra = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.05, 0.12), brilho(0x6fd3ff, 0.55));
        barra.position.y = 0.45;
        grupo.add(barra);

        return grupo;
    }

    return { solo, planetas, basePortao };
}

/**
 * Enfeites vivos do espaco (so visuais): riscos de estrelas que passam rente a nave, rochas girando perto da rota,
 * cometas que cruzam o fundo e o giro lento dos planetas. Acompanham o cenario (somam `dz`).
 *
 * @returns {{atualizar: (dt: number, dz: number) => void}}
 */
export function criarEspacoVivo({ cena, sorteio, planetas = [], modo = '3d' }) {
    // Na vista lateral a camera fica do lado direito da rota: riscos e rochas so aparecem do lado esquerdo (o de la).
    const ladoDe = () => (modo === 'lateral' ? -1 : (sorteio() < 0.5 ? -1 : 1));

    // Riscos de estrelas: dois pontos por risco; o comprimento cresce com a velocidade.
    const RISCOS = 150;
    const pontos = new Float32Array(RISCOS * 6);
    const riscosGeo = new THREE.BufferGeometry();
    riscosGeo.setAttribute('position', new THREE.BufferAttribute(pontos, 3));
    const riscos = new THREE.LineSegments(riscosGeo, new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.7, depthWrite: false }));
    riscos.frustumCulled = false;
    cena.add(riscos);
    const estado = Array.from({ length: RISCOS }, () => ({ x: 0, y: 0, z: 0 }));

    function sortearRisco(r, longe = false) {
        const lado = ladoDe();
        r.x = lado * (2.4 + sorteio() * 16); // nunca no meio da rota, onde esta a nave
        r.y = -7 + sorteio() * 18;
        r.z = longe ? -95 - sorteio() * 15 : -95 + sorteio() * 105;
    }

    estado.forEach((r) => sortearRisco(r));

    // Rochas girando perto da rota.
    const rochas = Array.from({ length: 7 }, (_, i) => {
        const rocha = criarRocha(0.5 + sorteio() * 0.9, i % 2 ? 0x938c80 : 0x77716a);
        rocha.userData.giro = [(sorteio() - 0.5) * 1.6, (sorteio() - 0.5) * 1.6, (sorteio() - 0.5) * 1.2];
        cena.add(rocha);

        return rocha;
    });

    function sortearRocha(rocha, longe = false) {
        const lado = ladoDe();
        rocha.position.set(lado * (6.5 + sorteio() * 9), -1 + sorteio() * 8, longe ? -85 - sorteio() * 20 : -85 + sorteio() * 90);
    }

    rochas.forEach((rocha) => sortearRocha(rocha));

    // Cometas: uma cabeca brilhante e uma cauda longa, cruzando o fundo de tempos em tempos.
    const cometas = [0, 1].map((i) => {
        const grupo = new THREE.Group();
        const cabeca = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
        const cauda = new THREE.Mesh(new THREE.BoxGeometry(34, 0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xa8dcff, transparent: true, opacity: 0.45, fog: false, depthWrite: false }));
        cauda.position.x = 18;
        grupo.add(cabeca, cauda);
        grupo.visible = false;
        cena.add(grupo);

        return { grupo, ativo: false, espera: 2.5 + i * 4, vx: 0, vy: 0 };
    });

    return {
        atualizar(dt, dz) {
            const velocidade = dt > 0 ? dz / dt : 0;
            const comprimento = Math.min(3.2, 0.3 + velocidade * 0.05);

            for (let i = 0; i < RISCOS; i++) {
                const r = estado[i];
                r.z += dz;

                if (r.z > 12) {
                    sortearRisco(r, true);
                }

                pontos.set([r.x, r.y, r.z, r.x, r.y, r.z - comprimento], i * 6);
            }

            riscosGeo.attributes.position.needsUpdate = true;

            for (const rocha of rochas) {
                rocha.position.z += dz;
                rocha.rotation.x += rocha.userData.giro[0] * dt;
                rocha.rotation.y += rocha.userData.giro[1] * dt;
                rocha.rotation.z += rocha.userData.giro[2] * dt;

                if (rocha.position.z > 12) {
                    sortearRocha(rocha, true);
                }
            }

            for (const planeta of planetas) {
                planeta.rotation.y += dt * 0.03;
            }

            for (const cometa of cometas) {
                if (!cometa.ativo) {
                    cometa.espera -= dt;

                    if (cometa.espera <= 0) {
                        const lado = sorteio() < 0.5 ? -1 : 1;
                        cometa.ativo = true;
                        cometa.grupo.visible = true;
                        cometa.grupo.position.set(-lado * 150, 25 + sorteio() * 40, -190 - sorteio() * 30);
                        cometa.vx = lado * (70 + sorteio() * 40);
                        cometa.vy = -(4 + sorteio() * 10);
                        // a cauda aponta para tras do movimento
                        cometa.grupo.rotation.z = Math.atan2(cometa.vy, cometa.vx) + (lado > 0 ? Math.PI : 0);
                    }

                    continue;
                }

                cometa.grupo.position.x += cometa.vx * dt;
                cometa.grupo.position.y += cometa.vy * dt;

                if (Math.abs(cometa.grupo.position.x) > 170) {
                    cometa.ativo = false;
                    cometa.grupo.visible = false;
                    cometa.espera = 5 + sorteio() * 8;
                }
            }
        },
    };
}

/** Linha de luz de motor: cone que treme (a ponta aponta para tras da nave, em +z). */
function chamaDe(cor, raio, comprimento, x, y, z) {
    const chama = new THREE.Mesh(new THREE.ConeGeometry(raio, comprimento, 10), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.88 }));
    chama.rotation.x = Math.PI / 2;
    chama.position.set(x, y, z);

    return chama;
}

/**
 * Meios do espaco. O avatar (filho do mesmo grupo) fica em y = 0 sobre o assento; z negativo e a frente.
 *
 * @param {'nave'|'foguete'|'disco-voador'|'astronauta'} meio
 * @returns {{grupo: THREE.Group, atualizar: (dt: number, ritmo: number) => void}}
 */
export function criarVeiculoEspacial(meio, modo = '3d') {
    const grupo = new THREE.Group();
    const vidro = new THREE.MeshLambertMaterial({ color: 0xa8e4ff, transparent: true, opacity: modo === '3d' ? 0.22 : 0.3, depthWrite: false });
    const chamas = []; // { malha, base }
    const luzes = []; // luzes que piscam: { malha, fase, cores }
    const giros = []; // { obj, velocidade }
    let tempo = 0;

    const assento = (cor = 0x2b3a4f) => {
        const banco = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.45), lambert(cor));
        banco.position.set(0, 0.23, 0);
        banco.userData.manter = true;
        grupo.add(banco);
    };

    const cilindroEmZ = (raioTras, raioFrente, comprimento, cor, x, y, z) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(raioTras, raioFrente, comprimento, 16), lambert(cor));
        c.rotation.x = Math.PI / 2; // topo (raioTras) para a popa, base (raioFrente) para a proa
        c.position.set(x, y, z);

        return c;
    };

    if (meio === 'nave') {
        assento();
        grupo.add(cilindroEmZ(0.34, 0.5, 4.2, 0xe9eef4, 0, -0.14, 0.2));
        const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 16), lambert(0xd6455a));
        nariz.rotation.x = -Math.PI / 2;
        nariz.position.set(0, -0.14, -2.55);
        grupo.add(nariz);

        // Asas em delta, com a ponta azul.
        const forma = new THREE.Shape();
        forma.moveTo(0, 1.3);
        forma.lineTo(-2.7, -1.5);
        forma.lineTo(-2.2, -1.9);
        forma.lineTo(0, -0.9);
        forma.lineTo(2.2, -1.9);
        forma.lineTo(2.7, -1.5);
        forma.lineTo(0, 1.3);
        const asas = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: 0.07, bevelEnabled: false }), lambert(0x2f5f94));
        asas.rotation.x = -Math.PI / 2;
        asas.position.set(0, -0.34, 0.5);
        grupo.add(asas);

        for (const lado of [-1, 1]) {
            const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.8), lambert(0xd6455a));
            aleta.position.set(lado * 0.5, 0.18, 2.0);
            aleta.rotation.z = -lado * 0.3;
            grupo.add(aleta);
            grupo.add(cilindroEmZ(0.22, 0.26, 1.0, 0x4a5668, lado * 0.32, -0.18, 2.4));
            const chama = chamaDe(0x6fd3ff, 0.19, 1.2, lado * 0.32, -0.18, 3.5);
            grupo.add(chama);
            chamas.push({ malha: chama, base: 1 });

            const ponta = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: lado < 0 ? 0xff3b3b : 0x3bff6a }));
            ponta.position.set(lado * 2.5, -0.3, -1.4);
            grupo.add(ponta);
            luzes.push({ malha: ponta, fase: lado * 1.3, cores: null });
        }

        const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 12), vidro);
        cupula.scale.set(1, 0.95, 1.9);
        cupula.position.set(0, 0.86, -0.05);
        grupo.add(cupula);
    } else if (meio === 'foguete') {
        assento(0x59616b);
        // Corpo com listras vermelhas e brancas, ponta vermelha e tres aletas.
        const listras = [0xf2f6fb, 0xd6455a, 0xf2f6fb, 0xd6455a];

        listras.forEach((cor, i) => {
            grupo.add(cilindroEmZ(0.5, 0.5, 1.1, cor, 0, -0.3, 1.5 - i * 1.1));
        });

        const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 16), lambert(0xd6455a));
        ponta.rotation.x = -Math.PI / 2;
        ponta.position.set(0, -0.3, -3.1);
        grupo.add(ponta);

        for (const angulo of [Math.PI / 2, Math.PI / 2 + (Math.PI * 2) / 3, Math.PI / 2 + (Math.PI * 4) / 3]) {
            const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.95), lambert(0x1f6fb8));
            aleta.position.set(Math.cos(angulo) * 0.7, -0.3 + Math.sin(angulo) * 0.7, 1.9);
            aleta.rotation.z = angulo - Math.PI / 2;
            grupo.add(aleta);
        }

        // Janelinhas redondas ao longo do corpo.
        for (const lado of [-1, 1]) {
            for (const z of [-0.9, 0.4]) {
                const janela = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x9fe3ff }));
                janela.position.set(lado * 0.48, -0.15, z);
                grupo.add(janela);
            }
        }

        // Bolha de vidro em volta do avatar.
        const bolha = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), vidro);
        bolha.scale.set(1, 1.15, 1.35);
        bolha.position.set(0, 0.2, 0.1);
        grupo.add(bolha);

        const fogo = chamaDe(0xff9a2e, 0.42, 2.2, 0, -0.3, 3.55);
        const miolo = chamaDe(0xfff1a8, 0.22, 1.5, 0, -0.3, 3.3);
        grupo.add(fogo, miolo);
        chamas.push({ malha: fogo, base: 1 }, { malha: miolo, base: 0.9 });
    } else if (meio === 'disco-voador') {
        // Disco: lente achatada, anel na borda com luzes girando, cupula de vidro e um facho de luz embaixo.
        const casco = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 16), lambert(0x9fb0c3));
        casco.scale.set(1, 0.17, 1);
        casco.position.y = -0.22;
        grupo.add(casco);

        const borda = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.13, 10, 40), lambert(0x59708a));
        borda.rotation.x = Math.PI / 2;
        borda.position.y = -0.22;
        grupo.add(borda);

        assento(0x2b3a4f);
        const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), vidro);
        cupula.scale.set(1.1, 1.1, 1.1);
        cupula.position.set(0, 0.1, 0);
        grupo.add(cupula);

        const anel = new THREE.Group();
        anel.position.y = -0.22;
        const paleta = [0xff4fa8, 0x35e0ff, 0xffd23f, 0x7dff9a, 0xb06bff];

        for (let i = 0; i < 12; i++) {
            const angulo = (i / 12) * Math.PI * 2;
            const luz = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: paleta[i % paleta.length] }));
            luz.position.set(Math.cos(angulo) * 2.1, 0, Math.sin(angulo) * 2.1);
            anel.add(luz);
            luzes.push({ malha: luz, fase: i * 0.9, cores: paleta });
        }

        grupo.add(anel);
        giros.push({ obj: anel, velocidade: 1.4 });

        const facho = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6a0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
        facho.position.y = -1.95;
        facho.userData.manter = true;
        grupo.add(facho);
    } else if (meio === 'astronauta') {
        // Sem veiculo: mochila a jato nas costas (o avatar fica em pe, flutuando) e um capacete de vidro.
        const mochila = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.78, 0.3), lambert(0xe9eef4));
        mochila.position.set(0, 1.05, 0.3);
        grupo.add(mochila);

        for (const lado of [-1, 1]) {
            const bocal = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.26, 10), lambert(0x4a5668));
            bocal.position.set(lado * 0.17, 0.58, 0.32);
            grupo.add(bocal);
            const chama = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 8), new THREE.MeshBasicMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.85 }));
            chama.rotation.x = Math.PI; // ponta para baixo
            chama.position.set(lado * 0.17, 0.12, 0.32);
            grupo.add(chama);
            chamas.push({ malha: chama, base: 1 });
        }

        const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.32), lambert(0xd6455a));
        faixa.position.set(0, 1.2, 0.3);
        grupo.add(faixa);

        const capacete = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), vidro);
        capacete.position.set(0, 1.57, -0.02);
        grupo.add(capacete);
        const aro = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 20), lambert(0xe9eef4));
        aro.rotation.x = Math.PI / 2;
        aro.position.set(0, 1.3, -0.02);
        grupo.add(aro);
    }

    // Piloto glTF: troca o casco feito em codigo pelo modelo pronto assim que ele chegar.
    const modelo = MODELOS[meio];
    const usarModelos = typeof location === 'undefined' || new URLSearchParams(location.search).get('modelos') !== '0';

    if (modelo && usarModelos) {
        const mantidos = new Set(chamas.map((c) => c.malha));
        const proprios = [...grupo.children];

        carregarModelo(modelo.arquivo)
            .then((cena) => {
                const pivo = new THREE.Group();
                pivo.rotation.y = Math.PI; // os modelos olham para +z; o jogo anda para -z
                pivo.add(cena);
                pivo.updateMatrixWorld(true);

                const caixa = new THREE.Box3().setFromObject(pivo);
                const tamanho = caixa.getSize(new THREE.Vector3());
                const centro = caixa.getCenter(new THREE.Vector3());
                const escala = modelo.largura / tamanho.x;
                const aninhado = new THREE.Group();
                aninhado.scale.setScalar(escala);
                aninhado.position.set(-centro.x * escala, modelo.topo - caixa.max.y * escala, -centro.z * escala - (modelo.cabineZ ?? 0));
                aninhado.add(pivo);

                for (const filho of proprios) {
                    // fica o assento, o vidro, o facho e as chamas; o resto (casco, asas, luzes) sai
                    if (!mantidos.has(filho) && (!filho.userData.manter || modelo.semBanco) && filho.material !== vidro) {
                        filho.visible = false;
                    }
                }

                if (modelo.popa) {
                    const popa = (tamanho.z / 2) * escala - (modelo.cabineZ ?? 0); // z da traseira do casco, ja que o modelo fica centrado em z

                    for (const { malha } of chamas) {
                        malha.position.z = popa + 0.5;
                    }
                }

                grupo.add(aninhado);
            })
            .catch((erro) => console.warn(`modelo ${modelo.arquivo} indisponivel, usando o feito em codigo`, erro));
    }

    return {
        grupo,
        atualizar(dt, ritmo) {
            tempo += dt;

            for (const { malha, base } of chamas) {
                malha.scale.set(1, base * (0.75 + Math.random() * 0.5 + Math.min(ritmo, 2) * 0.28), 1);
            }

            for (const luz of luzes) {
                luz.malha.visible = luz.cores ? true : Math.sin(tempo * 4 + luz.fase) > -0.2;

                if (luz.cores) {
                    luz.malha.material.color.setHex(luz.cores[Math.floor(tempo * 3 + luz.fase) % luz.cores.length]);
                }
            }

            for (const giro of giros) {
                giro.obj.rotation.y += dt * giro.velocidade;
            }

            // Balanco de quem flutua: a nave e o disco oscilam de leve; o astronauta gira devagar de lado a lado.
            if (meio === 'disco-voador') {
                grupo.rotation.z = Math.sin(tempo * 1.1) * 0.05;
                grupo.rotation.x = Math.sin(tempo * 0.8) * 0.03;
            } else if (meio === 'astronauta') {
                grupo.rotation.z = Math.sin(tempo * 0.9) * 0.05;
            } else {
                grupo.rotation.z = Math.sin(tempo * 0.8) * 0.03;
            }
        },
    };
}
