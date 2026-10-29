import * as THREE from 'three';

/**
 * Avatares do jogo: uma especificacao simples (cor de pele, cabelo, acessorios, corpo, mobilidade)
 * vira um personagem 3D feito de formas basicas. O mesmo personagem serve para a vista 3D e para a
 * vista lateral, e tambem para os retratos da tela de escolha e do relatorio.
 *
 * Os dez avatares abaixo foram pensados para que mais pessoas se vejam no jogo: tons de pele,
 * texturas e estilos de cabelo, idades, tipos de corpo, uso de oculos, barba, lenco e boné, uma
 * pessoa que usa bengala e uma que usa cadeira de rodas. Nao ha avatar "padrao". A lista e um ponto
 * de partida e deve ser revisada com o RH e o grupo de diversidade da instituicao.
 *
 * Campos: pele, cabelo {estilo, cor}, barba ('cheia'|'curta'|'bigode'), oculos ('quadrado'|'redondo'),
 * bone (cor), lenco (cor), roupa, calca, detalhe, longa (tunica), corpo ('esguio'|'medio'|'largo'),
 * altura (multiplicador) e mobilidade ('anda'|'bengala'|'andador'|'cadeira'|'cadeira-corrida'|'moto'|'taxi').
 * Extras de veiculo: capacete, corMoto, entrega/bau (moto de entregas), corCarro, corCadeira.
 */

export const AVATARES = [
    { id: 'ana', nome: 'Ana', pele: '#5a3825', cabelo: { estilo: 'blackpower', cor: '#17100d' }, roupa: '#f08a3c', calca: '#0d2b4e', detalhe: '#ffffff', corpo: 'esguio', altura: 0.98, mobilidade: 'anda' },
    { id: 'bruno', nome: 'Bruno', pele: '#b57b54', cabelo: { estilo: 'curto', cor: '#22160f' }, barba: 'curta', roupa: '#1f6fb8', calca: '#2b3a4f', detalhe: '#f08a3c', corpo: 'medio', altura: 1, mobilidade: 'anda' },
    { id: 'carla', nome: 'Carla', pele: '#f0c8a4', cabelo: { estilo: 'longo', cor: '#6b3f1d' }, oculos: 'quadrado', roupa: '#2e9e6b', calca: '#34495e', detalhe: '#ffffff', corpo: 'esguio', altura: 0.99, mobilidade: 'anda' },
    { id: 'davi', nome: 'Davi', pele: '#3d2415', cabelo: { estilo: 'careca', cor: '#17100d' }, barba: 'cheia', roupa: '#0d2b4e', calca: '#4a4f57', detalhe: '#f08a3c', corpo: 'largo', altura: 1.04, mobilidade: 'anda' },
    { id: 'elisa', nome: 'Elisa', pele: '#8d5a3b', cabelo: { estilo: 'cacheado', cor: '#241611' }, roupa: '#7b4fa3', calca: '#2c2c3a', detalhe: '#f2b705', corpo: 'medio', altura: 0.97, mobilidade: 'anda' },
    { id: 'fatima', nome: 'Fátima', pele: '#d9a47a', lenco: '#6fa8e0', roupa: '#2f5f94', calca: '#2f5f94', detalhe: '#ffffff', longa: true, corpo: 'medio', altura: 0.98, mobilidade: 'anda' },
    { id: 'gabriel', nome: 'Gabriel', pele: '#e3b48f', cabelo: { estilo: 'curto', cor: '#5a3a22' }, bone: '#d6455a', roupa: '#d6455a', calca: '#2b3a4f', detalhe: '#ffffff', corpo: 'medio', altura: 1, mobilidade: 'cadeira' },
    { id: 'haru', nome: 'Haru', pele: '#f3d3b5', cabelo: { estilo: 'chanel', cor: '#0e0e12' }, roupa: '#f2b705', calca: '#4a4a55', detalhe: '#0d2b4e', corpo: 'esguio', altura: 0.95, mobilidade: 'anda' },
    { id: 'iara', nome: 'Iara', pele: '#a8683f', cabelo: { estilo: 'trancas', cor: '#120c0a' }, roupa: '#c0553a', calca: '#4b3a2a', detalhe: '#f6e7c1', corpo: 'medio', altura: 0.98, mobilidade: 'anda' },
    { id: 'joao', nome: 'João', pele: '#c68b63', cabelo: { estilo: 'curto', cor: '#cfcfcf' }, barba: 'bigode', oculos: 'redondo', roupa: '#8a5a2b', calca: '#3b3b3b', detalhe: '#f6e7c1', corpo: 'medio', altura: 0.96, mobilidade: 'bengala' },
    // Quem se desloca de outras formas: moto, entrega de moto, taxi, cadeira de corrida e andador.
    { id: 'rafa', nome: 'Rafa', pele: '#9b6b4a', roupa: '#2b3a4f', calca: '#1f2a36', detalhe: '#f08a3c', capacete: '#d6455a', corMoto: '#1f6fb8', corpo: 'medio', altura: 1, mobilidade: 'moto' },
    { id: 'beto', nome: 'Beto', pele: '#e0ac86', roupa: '#f08a3c', calca: '#2b2f36', detalhe: '#ffffff', capacete: '#ffffff', corMoto: '#2b2f36', entrega: true, bau: '#f08a3c', corpo: 'largo', altura: 1, mobilidade: 'moto' },
    { id: 'lucio', nome: 'Seu Lúcio', pele: '#7a4a30', cabelo: { estilo: 'curto', cor: '#d9d9d9' }, barba: 'bigode', oculos: 'quadrado', roupa: '#ffffff', calca: '#2b3a4f', detalhe: '#1f6fb8', corpo: 'largo', altura: 1, mobilidade: 'taxi' },
    { id: 'maya', nome: 'Maya', pele: '#c99774', cabelo: { estilo: 'coque', cor: '#1a1210' }, roupa: '#7b4fa3', calca: '#1f2a36', detalhe: '#f2b705', corCadeira: '#7b4fa3', corpo: 'esguio', altura: 0.98, mobilidade: 'cadeira-corrida' },
    { id: 'nair', nome: 'Dona Nair', pele: '#f0c8a4', cabelo: { estilo: 'coque', cor: '#e4e4e4' }, oculos: 'redondo', roupa: '#c0553a', calca: '#4b3a2a', detalhe: '#f6e7c1', corpo: 'medio', altura: 0.93, mobilidade: 'andador' },
];

/**
 * Como cada forma de se deslocar se comporta no jogo. "rodas" liga o velocimetro; kmhBase e o que o
 * velocimetro mostra na velocidade normal do jogo (o turbo multiplica) e kmhMax e o fim da escala.
 * Os numeros sao so de ambientacao: a velocidade real do jogo e a mesma para todos os avatares.
 * som: 'motor' (motor em marcha), 'rodas' (rolamento) ou 'passos' (so o ar do turbo).
 */
const MOBILIDADES = {
    moto: { rodas: true, kmhBase: 40, kmhMax: 100, som: 'motor', retrato: { distancia: 5.4, centro: 0.95 } },
    taxi: { rodas: true, kmhBase: 35, kmhMax: 100, som: 'motor', retrato: { distancia: 8.4, centro: 0.9 } },
    cadeira: { rodas: true, kmhBase: 6, kmhMax: 15, som: 'rodas', retrato: { distancia: 3.6, centro: 0.8 } },
    'cadeira-corrida': { rodas: true, kmhBase: 18, kmhMax: 40, som: 'rodas', retrato: { distancia: 4.6, centro: 0.7 } },
    andador: { rodas: false, kmhBase: 0, kmhMax: 0, som: 'passos', retrato: { distancia: 4.3, centro: 0.98 } },
};

const MOBILIDADE_PADRAO = { rodas: false, kmhBase: 0, kmhMax: 0, som: 'passos', retrato: { distancia: 4.3, centro: 0.98 } };

export function infoMobilidade(spec) {
    return MOBILIDADES[spec.mobilidade] ?? MOBILIDADE_PADRAO;
}

/** Cores de roupa que a pessoa pode trocar na tela de escolha. */
export const CORES_ROUPA = ['#1f6fb8', '#f08a3c', '#2e9e6b', '#7b4fa3', '#d6457f', '#0d2b4e', '#f2b705'];

const ESCALA_CORPO = { esguio: 0.88, medio: 1, largo: 1.2 };

function material(cor) {
    return new THREE.MeshLambertMaterial({ color: cor });
}

function escurecer(cor, fator) {
    return new THREE.Color(cor).multiplyScalar(fator);
}

/** Calota de esfera (parte de cima da cabeca). phi: 0..PI = metade de tras; PI..2PI = metade da frente. */
function calota(raio, cor, { thetaFim = 0.42, phiInicio = 0, phiTamanho = Math.PI * 2 } = {}) {
    return new THREE.Mesh(new THREE.SphereGeometry(raio, 18, 12, phiInicio, phiTamanho, 0, Math.PI * thetaFim), material(cor));
}

function esfera(raio, cor, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(raio, 14, 10), material(cor));
    m.position.set(x, y, z);

    return m;
}

function capsula(raio, comprimento, cor) {
    return new THREE.Mesh(new THREE.CapsuleGeometry(raio, comprimento, 4, 10), material(cor));
}

function caixa(l, a, p, cor, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), material(cor));
    m.position.set(x, y, z);

    return m;
}

/** Cabelo e coberturas da cabeca, centrados na cabeca (origem no centro da cabeca, frente = -z). */
function construirCabelo(spec, balancos) {
    const grupo = new THREE.Group();
    const R = 0.26;

    if (spec.lenco) {
        // Lenco: cobre o topo, os lados e as costas da cabeca e deixa o rosto livre na frente.
        grupo.add(calota(R + 0.04, spec.lenco, { thetaFim: 0.34 }));
        grupo.add(new THREE.Mesh(
            new THREE.SphereGeometry(R + 0.04, 24, 16, Math.PI * 1.74, Math.PI * 1.52, 0, Math.PI * 0.86),
            material(spec.lenco),
        ));
        const caida = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.01, R + 0.1, 0.3, 20, 1, true), new THREE.MeshLambertMaterial({ color: spec.lenco, side: THREE.DoubleSide }));
        caida.position.set(0, -0.27, 0.05);
        grupo.add(caida);

        return grupo;
    }

    if (spec.bone) {
        grupo.add(calota(R + 0.02, spec.bone, { thetaFim: 0.5 }));
        const aba = caixa(0.34, 0.03, 0.2, spec.bone, 0, 0.06, -0.3);
        aba.rotation.x = 0.12;
        grupo.add(aba);
    }

    const { estilo, cor } = spec.cabelo ?? { estilo: 'careca', cor: '#000000' };

    switch (estilo) {
        case 'curto':
            if (!spec.bone) {
                grupo.add(calota(R + 0.015, cor, { thetaFim: 0.42 }));
            }
            grupo.add(calota(R + 0.012, cor, { thetaFim: 0.64, phiInicio: 0, phiTamanho: Math.PI }));
            break;
        case 'chanel':
            grupo.add(calota(R + 0.015, cor, { thetaFim: 0.42 }));
            grupo.add(calota(R + 0.02, cor, { thetaFim: 0.8, phiInicio: 0, phiTamanho: Math.PI }));
            grupo.add(caixa(0.04, 0.2, 0.26, cor, 0.255, -0.1, -0.02));
            grupo.add(caixa(0.04, 0.2, 0.26, cor, -0.255, -0.1, -0.02));
            break;
        case 'longo': {
            grupo.add(calota(R + 0.015, cor, { thetaFim: 0.42 }));
            grupo.add(calota(R + 0.015, cor, { thetaFim: 0.66, phiInicio: 0, phiTamanho: Math.PI }));
            const cortina = capsula(0.17, 0.5, cor);
            cortina.scale.set(1.35, 1, 0.55);
            cortina.position.set(0, -0.42, 0.17);
            grupo.add(cortina);
            break;
        }
        case 'blackpower': {
            // Volume atras e em cima da cabeca; a testa e o rosto ficam livres.
            grupo.add(esfera(0.32, cor, 0, 0.1, 0.15));
            for (let i = 0; i < 9; i++) {
                const a = Math.PI * (0.05 + (i / 8) * 0.9); // arco de lado a lado, passando por tras
                grupo.add(esfera(0.15, cor, Math.cos(a) * 0.3, 0.14 + Math.sin(a * 3) * 0.04, 0.12 + Math.sin(a) * 0.2));
            }
            grupo.add(esfera(0.15, cor, 0, 0.3, -0.02));
            break;
        }
        case 'cacheado':
            grupo.add(esfera(0.28, cor, 0, 0.09, 0.14));
            grupo.add(calota(R + 0.02, cor, { thetaFim: 0.4 }));

            for (let i = 0; i < 11; i++) {
                const a = Math.PI * (0.02 + (i / 10) * 0.96);
                grupo.add(esfera(0.12, cor, Math.cos(a) * 0.29, -0.03 - (i % 3) * 0.11, 0.1 + Math.sin(a) * 0.22));
            }
            break;
        case 'trancas': {
            grupo.add(calota(R + 0.015, cor, { thetaFim: 0.42 }));
            grupo.add(calota(R + 0.015, cor, { thetaFim: 0.64, phiInicio: 0, phiTamanho: Math.PI }));

            for (let i = 0; i < 9; i++) {
                const pivo = new THREE.Group();
                const a = Math.PI * (0.1 + (i / 8) * 0.8); // arco atras da cabeca
                pivo.position.set(Math.cos(a) * 0.22, -0.08, Math.sin(a) * 0.2);
                const trança = capsula(0.03, 0.62, cor);
                trança.position.y = -0.34;
                pivo.add(trança);
                grupo.add(pivo);
                balancos.push(pivo);
            }
            break;
        }
        case 'coque':
            grupo.add(calota(R + 0.015, cor, { thetaFim: 0.42 }));
            grupo.add(esfera(0.12, cor, 0, 0.3, 0.05));
            break;
        default:
            break; // careca
    }

    return grupo;
}

function construirRosto(spec) {
    const rosto = new THREE.Group();

    rosto.add(esfera(0.03, '#1b1b1b', 0.09, 0, -0.235));
    rosto.add(esfera(0.03, '#1b1b1b', -0.09, 0, -0.235));

    const nariz = esfera(0.04, escurecer(spec.pele, 0.9), 0, -0.04, -0.265);
    nariz.scale.set(0.9, 1, 1);
    rosto.add(nariz);

    if (spec.oculos) {
        const cor = '#1f2a36';
        const raio = spec.oculos === 'redondo' ? 0.078 : 0.07;
        const z = -0.255;

        for (const lado of [-1, 1]) {
            const aro = new THREE.Mesh(new THREE.TorusGeometry(raio, 0.011, 8, 18), material(cor));
            aro.position.set(lado * 0.095, 0.005, z);

            if (spec.oculos === 'quadrado') {
                aro.scale.set(1.2, 0.85, 1);
            }

            rosto.add(aro);
            rosto.add(caixa(0.012, 0.012, 0.2, cor, lado * 0.185, 0.005, z + 0.1));
        }

        rosto.add(caixa(0.05, 0.012, 0.012, cor, 0, 0.012, z));
    }

    const corBarba = spec.cabelo?.cor ?? '#2a1c12';

    if (spec.barba === 'cheia') {
        const b = esfera(0.2, corBarba, 0, -0.15, -0.08);
        b.scale.set(1, 0.78, 0.72);
        rosto.add(b);
    } else if (spec.barba === 'curta') {
        const b = esfera(0.17, corBarba, 0, -0.17, -0.12);
        b.scale.set(1, 0.5, 0.55);
        rosto.add(b);
    }

    if (spec.barba) {
        rosto.add(caixa(0.15, 0.03, 0.04, corBarba, 0, -0.095, -0.245));
    }

    return rosto;
}

/** Roda: pneu + aro, com um parafuso para a rotacao ser visivel. O eixo da roda e o eixo x. */
function construirRoda(raio, largura, cor = '#1d2026') {
    const roda = new THREE.Group();
    const pneu = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, largura, 18), material(cor));
    pneu.rotation.z = Math.PI / 2;
    const aro = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.62, raio * 0.62, largura + 0.01, 14), material('#b9c2cc'));
    aro.rotation.z = Math.PI / 2;
    const parafuso = caixa(largura + 0.03, raio * 0.22, raio * 0.22, '#5a6572', 0, raio * 0.4, 0);
    roda.add(pneu, aro, parafuso);

    return roda;
}

function texturaTaxi() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const c = canvas.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 48);
    c.fillStyle = '#111111';
    c.font = 'bold 34px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('TAXI', 64, 26);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;

    return t;
}

/** Moto: quadro, tanque, banco, guidao, garfo e duas rodas. Devolve as rodas para animar. */
function construirMoto(corpo, spec) {
    const cor = spec.corMoto ?? '#c0392b';
    const rodas = [];

    const frente = construirRoda(0.34, 0.12);
    frente.position.set(0, 0.34, -0.78);
    const tras = construirRoda(0.34, 0.16);
    tras.position.set(0, 0.34, 0.78);
    corpo.add(frente, tras);
    rodas.push(frente, tras);

    corpo.add(caixa(0.2, 0.26, 1.0, '#2b2f36', 0, 0.55, 0.05));
    const tanque = esfera(0.26, cor, 0, 0.82, -0.28);
    tanque.scale.set(0.8, 0.7, 1.35);
    corpo.add(tanque);
    corpo.add(caixa(0.3, 0.09, 0.62, '#1b1b1b', 0, 0.8, 0.34));
    corpo.add(caixa(0.26, 0.18, 0.3, cor, 0, 0.7, 0.8)); // paralama/rabeta

    // Garfo e guidao.
    for (const lado of [-1, 1]) {
        const garfo = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.86, 8), material('#9aa5b1'));
        garfo.position.set(lado * 0.1, 0.72, -0.64);
        garfo.rotation.x = 0.33;
        corpo.add(garfo);
    }

    corpo.add(caixa(0.78, 0.04, 0.05, '#2b2f36', 0, 1.1, -0.52));
    corpo.add(esfera(0.1, '#fff4c2', 0, 0.98, -0.78));
    const escape = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 10), material('#6c7683'));
    escape.rotation.x = Math.PI / 2;
    escape.position.set(0.2, 0.36, 0.55);
    corpo.add(escape);

    if (spec.entrega) {
        // Bau de entregas na garupa, com uma faixa clara.
        const bau = caixa(0.62, 0.5, 0.58, spec.bau ?? '#f08a3c', 0, 1.1, 0.74);
        corpo.add(bau, caixa(0.64, 0.08, 0.6, '#ffffff', 0, 1.1, 0.74));
    }

    return rodas;
}

/** Taxi: carroceria amarela, cabine de vidro, luminoso no teto e quatro rodas. */
function construirTaxi(corpo, spec) {
    const cor = spec.corCarro ?? '#f2b705';
    const rodas = [];

    corpo.add(caixa(1.7, 0.55, 4.0, cor, 0, 0.62, 0));
    corpo.add(caixa(1.62, 0.12, 4.02, '#1b1b1b', 0, 0.4, 0)); // saia escura
    corpo.add(caixa(1.5, 0.08, 1.2, cor, 0, 0.95, -1.35)); // capo
    corpo.add(caixa(1.5, 0.08, 0.9, cor, 0, 0.95, 1.55)); // porta-malas

    const vidro = new THREE.MeshLambertMaterial({ color: '#9fc4e8', transparent: true, opacity: 0.38 });
    const cabine = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.74, 2.0), vidro);
    cabine.position.set(0, 1.34, 0.18);
    corpo.add(cabine);
    corpo.add(caixa(1.56, 0.07, 2.08, cor, 0, 1.74, 0.18)); // teto

    for (const x of [-0.74, 0.74]) {
        for (const z of [-0.8, 1.16]) {
            corpo.add(caixa(0.05, 0.78, 0.05, cor, x, 1.34, z));
        }
    }

    const luminoso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.17, 0.2), new THREE.MeshLambertMaterial({ map: texturaTaxi() }));
    luminoso.position.set(0, 1.88, 0.18);
    corpo.add(luminoso);

    // Volante, na frente do motorista (lado esquerdo).
    const volante = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 20), material('#1b1b1b'));
    volante.position.set(-0.42, 1.0, -0.42);
    volante.rotation.x = -0.9;
    corpo.add(volante);

    for (const x of [-0.6, 0.6]) {
        corpo.add(esfera(0.1, '#fff4c2', x, 0.7, -2.0));
        corpo.add(caixa(0.2, 0.1, 0.05, '#d33b2f', x, 0.7, 2.0));
    }

    for (const x of [-0.82, 0.82]) {
        for (const z of [-1.3, 1.3]) {
            const roda = construirRoda(0.33, 0.22);
            roda.position.set(x, 0.33, z);
            corpo.add(roda);
            rodas.push(roda);
        }
    }

    return rodas;
}

/** Cadeira de corrida: duas rodas grandes inclinadas, uma roda pequena a frente, assento baixo. */
function construirCadeiraCorrida(corpo, spec) {
    const rodas = [];

    for (const lado of [-1, 1]) {
        const roda = construirRoda(0.36, 0.05, '#23272e');
        roda.rotation.z = lado * 0.2; // inclinacao (camber) das rodas de corrida
        roda.position.set(lado * 0.4, 0.37, 0.12);
        corpo.add(roda);
        rodas.push(roda);
    }

    const frente = construirRoda(0.14, 0.05, '#23272e');
    frente.position.set(0, 0.14, -0.86);
    corpo.add(frente);
    rodas.push(frente);

    const cor = spec.corCadeira ?? '#d6455a';
    corpo.add(caixa(0.07, 0.07, 1.1, cor, 0, 0.3, -0.38)); // tubo central
    corpo.add(caixa(0.42, 0.06, 0.46, '#23272e', 0, 0.36, 0.08)); // assento
    corpo.add(caixa(0.8, 0.04, 0.05, cor, 0, 0.3, 0.12)); // eixo traseiro
    const garfo = caixa(0.05, 0.32, 0.05, cor, 0, 0.3, -0.86);
    corpo.add(garfo);

    return rodas;
}

/** Andador: armacao de quatro pes, com as maos de apoio na barra de tras. */
function construirAndador(corpo) {
    const armacao = new THREE.Group();
    const aluminio = '#aab4c0';

    for (const x of [-0.27, 0.27]) {
        for (const z of [-0.2, 0.2]) {
            const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.84, 8), material(aluminio));
            pe.position.set(x, 0.42, z);
            armacao.add(pe);
            armacao.add(esfera(0.03, '#1b1b1b', x, 0.02, z));
        }

        const lateral = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 8), material(aluminio));
        lateral.rotation.x = Math.PI / 2;
        lateral.position.set(x, 0.84, 0);
        armacao.add(lateral);
        armacao.add(esfera(0.045, '#1f2a36', x, 0.86, 0.2)); // punho
    }

    const travessa = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 8), material(aluminio));
    travessa.rotation.z = Math.PI / 2;
    travessa.position.set(0, 0.62, -0.2);
    armacao.add(travessa);
    armacao.position.set(0, 0, -0.62);
    corpo.add(armacao);

    return armacao;
}

/**
 * Constroi o avatar 3D. Os pes ficam em y = 0, a frente do personagem aponta para -z.
 *
 * @returns {{grupo: THREE.Group, animar: (fase: number, ritmo: number) => void, altura: number, info: object}}
 */
export function criarAvatar3D(spec) {
    const raiz = new THREE.Group();
    const corpo = new THREE.Group();
    raiz.add(corpo);

    const w = ESCALA_CORPO[spec.corpo] ?? 1;
    const mobilidade = spec.mobilidade ?? 'anda';
    const info = infoMobilidade(spec);
    const cadeira = mobilidade === 'cadeira';
    const corrida = mobilidade === 'cadeira-corrida';
    const moto = mobilidade === 'moto';
    const taxi = mobilidade === 'taxi';
    const andador = mobilidade === 'andador';
    const sentado = cadeira || corrida || moto || taxi;
    const balancos = [];

    // Altura do quadril e inclinacao do tronco de cada postura (para a frente = negativo).
    const posturas = {
        cadeira: { quadril: -0.31, inclina: 0 },
        'cadeira-corrida': { quadril: -0.48, inclina: -0.55 },
        moto: { quadril: -0.04, inclina: spec.entrega ? -0.2 : -0.3 },
        taxi: { quadril: -0.5, inclina: 0 },
        andador: { quadril: 0, inclina: -0.12 },
    };
    const postura = posturas[mobilidade] ?? { quadril: 0, inclina: 0 };

    // O tronco gira em torno do quadril, nao do chao: quadril fica no pivo e a parte de cima desce.
    const quadril = new THREE.Group();
    quadril.position.y = 0.86 + postura.quadril;
    corpo.add(quadril);
    const superior = new THREE.Group();
    superior.position.y = -0.86;
    quadril.add(superior);
    quadril.rotation.x = postura.inclina;

    const tronco = capsula(0.24 * w, 0.34, spec.roupa);
    tronco.position.y = 1.22;
    tronco.scale.z = 0.8;
    superior.add(tronco);

    // Colete salva-vidas (cenario do rio): laranja vivo por cima da roupa, com uma faixa refletiva.
    if (spec.colete) {
        const colete = capsula(0.262 * w, 0.28, '#ff7a1a');
        colete.position.y = 1.24;
        colete.scale.z = 0.86;
        superior.add(colete);
        const refletiva = new THREE.Mesh(new THREE.CylinderGeometry(0.268 * w, 0.268 * w, 0.04, 18), material('#ffffff'));
        refletiva.position.y = 1.3;
        refletiva.scale.z = 0.86;
        superior.add(refletiva);
    }

    const faixa = new THREE.Mesh(new THREE.CylinderGeometry(0.245 * w, 0.245 * w, 0.06, 18), material(spec.detalhe ?? '#ffffff'));
    faixa.position.y = 1.12;
    faixa.scale.z = 0.8;
    superior.add(faixa);

    if (spec.longa) {
        const tunica = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * w, 0.36 * w, 0.62, 18), material(spec.roupa));
        tunica.position.y = 0.62;
        tunica.scale.z = 0.85;
        corpo.add(tunica);
    }

    const pescoco = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 12), material(spec.pele));
    pescoco.position.y = 1.66;
    superior.add(pescoco);

    const cabeca = new THREE.Group();
    cabeca.position.y = 1.88;
    cabeca.add(esfera(0.26, spec.pele));
    cabeca.add(construirRosto(spec));
    cabeca.add(construirCabelo(spec, balancos));
    superior.add(cabeca);

    // Bracos: pivo no ombro; manga na cor da roupa e antebraco na cor da pele.
    const bracos = [-1, 1].map((lado) => {
        const pivo = new THREE.Group();
        pivo.position.set(lado * (0.24 * w + 0.08), 1.52, 0);
        const manga = capsula(0.078, 0.22, spec.roupa);
        manga.position.y = -0.2;
        const antebraco = capsula(0.062, 0.24, spec.pele);
        antebraco.position.y = -0.5;
        const mao = esfera(0.072, spec.pele, 0, -0.72, 0);
        pivo.add(manga, antebraco, mao);
        superior.add(pivo);

        return pivo;
    });

    // Pernas de quem anda (inclusive com bengala ou andador).
    const pernas = [];

    if (!sentado) {
        for (const lado of [-1, 1]) {
            const pivo = new THREE.Group();
            pivo.position.set(lado * 0.12 * w, 0.86, 0);
            const perna = capsula(0.09 * w, 0.64, spec.longa ? spec.roupa : spec.calca);
            perna.position.y = -0.43;
            const sapato = caixa(0.17 * w, 0.09, 0.3, '#1b1b1b', 0, -0.82, -0.05);
            pivo.add(perna, sapato);
            corpo.add(pivo);
            pernas.push(pivo);
        }
    }

    // Veiculos e apoios com rodas.
    let rodas = [];
    let armacaoAndador = null;

    if (cadeira) {
        for (const lado of [-1, 1]) {
            const coxa = capsula(0.09, 0.34, spec.calca);
            coxa.rotation.x = Math.PI / 2;
            coxa.position.set(lado * 0.12, 0.56, -0.27);
            const canela = capsula(0.075, 0.3, spec.calca);
            canela.position.set(lado * 0.12, 0.32, -0.5);
            const sapato = caixa(0.16, 0.08, 0.28, '#1b1b1b', lado * 0.12, 0.06, -0.56);
            corpo.add(coxa, canela, sapato);

            const roda = new THREE.Group();
            roda.position.set(lado * 0.37, 0.33, 0.05);
            const aro = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.026, 8, 28), material('#2b2f36'));
            aro.rotation.y = Math.PI / 2;
            roda.add(aro);

            for (let i = 0; i < 3; i++) {
                const raio = caixa(0.012, 0.62, 0.012, '#9aa5b1');
                raio.rotation.x = (i * Math.PI) / 3;
                roda.add(raio);
            }

            corpo.add(roda);
            rodas.push(roda);
            corpo.add(esfera(0.05, '#2b2f36', lado * 0.2, 0.06, -0.55));
        }

        corpo.add(caixa(0.58, 0.05, 0.5, '#2b2f36', 0, 0.5, 0.02));
        corpo.add(caixa(0.58, 0.46, 0.04, '#2b2f36', 0, 0.78, 0.27));
    }

    // Quem esta sentado numa moto, num taxi ou na cadeira de corrida: coxas a frente, canelas para baixo.
    if (corrida || moto || taxi) {
        const hy = 0.86 + postura.quadril;

        for (const lado of [-1, 1]) {
            const x = lado * (taxi ? 0.11 : 0.13) - (taxi ? 0.42 : 0);
            const coxa = capsula(0.09, 0.3, spec.calca);
            coxa.rotation.x = Math.PI / 2 + (moto ? 0.25 : 0);
            coxa.position.set(x, hy - 0.04, -0.24);
            corpo.add(coxa);

            if (corrida) {
                // Joelhos dobrados sob o corpo (posicao de corrida).
                const canela = capsula(0.075, 0.28, spec.calca);
                canela.rotation.x = -0.75;
                canela.position.set(x, hy - 0.2, -0.47);
                corpo.add(canela);
            } else {
                const chao = taxi ? 0.14 : 0.36;
                const canela = capsula(0.075, Math.max(0.2, hy - chao - 0.2), spec.calca);
                canela.position.set(x, (hy + chao) / 2 - 0.06, -0.46);
                corpo.add(canela);
                corpo.add(caixa(0.15, 0.08, 0.28, '#1b1b1b', x, chao - 0.04, -0.52));
            }
        }
    }

    if (moto) {
        rodas = construirMoto(corpo, spec);
    } else if (taxi) {
        rodas = construirTaxi(corpo, spec);
        // O motorista senta do lado esquerdo do carro.
        quadril.position.x = -0.42;
    } else if (corrida) {
        rodas = construirCadeiraCorrida(corpo, spec);
    } else if (andador) {
        armacaoAndador = construirAndador(corpo);
    }

    // Capacete de quem anda de moto: casco na cor escolhida e viseira escura.
    if (moto) {
        const capacete = new THREE.Group();
        capacete.add(esfera(0.31, spec.capacete ?? '#ffffff'));
        const viseira = caixa(0.34, 0.12, 0.1, '#1a2230', 0, 0.02, -0.25);
        viseira.rotation.x = -0.05;
        capacete.add(viseira);
        capacete.add(caixa(0.06, 0.1, 0.5, spec.detalhe ?? '#f08a3c', 0, 0.3, 0));
        cabeca.add(capacete);
    }

    // Bengala: fica na mao direita e acompanha o corpo.
    if (mobilidade === 'bengala') {
        const bengala = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.84, 8), material('#5a3a22'));
        bengala.position.set(0.5 * w, 0.42, -0.14);
        corpo.add(bengala);
        const cabo = esfera(0.04, '#5a3a22', 0.5 * w, 0.85, -0.14);
        corpo.add(cabo);
    }

    // Maos nos apoios: guidao, volante e andador.
    const posicaoBracos = moto ? 1.0 : taxi ? 0.85 : andador ? 0.6 : null;

    // Sombra simples no chao (evita mapa de sombras, que pesa em celulares).
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.01;

    if (moto || corrida) {
        sombra.scale.set(0.9, 2.1, 1);
    } else if (taxi) {
        sombra.scale.set(1.9, 4.2, 1);
    }

    raiz.add(sombra);

    const escala = 0.86 * (spec.altura ?? 1);
    raiz.scale.setScalar(escala);

    const relaxar = (obj, eixo, alvo = 0) => {
        obj.rotation[eixo] += (alvo - obj.rotation[eixo]) * 0.25;
    };

    function animar(fase, ritmo) {
        const forca = Math.min(1, ritmo);
        const parado = ritmo < 0.04;

        if (parado) {
            pernas.forEach((p) => relaxar(p, 'x'));
            relaxar(quadril, 'x', postura.inclina);
            corpo.position.y += (0 - corpo.position.y) * 0.25;
            balancos.forEach((b) => relaxar(b, 'x'));
        }

        if (posicaoBracos !== null) {
            // Maos no guidao, no volante ou no andador.
            bracos.forEach((b) => relaxar(b, 'x', posicaoBracos));
        } else if (parado) {
            bracos.forEach((b) => relaxar(b, 'x'));
        }

        if (parado) {
            return;
        }

        rodas.forEach((r) => { r.rotation.x -= (cadeira ? 0.16 : 0.22) * Math.min(ritmo, 2); });

        const s = Math.sin(fase);

        if (moto || taxi) {
            // Vibracao leve do motor e do corpo na pista.
            corpo.position.y = Math.abs(Math.sin(fase * 3)) * 0.008 * forca;
        } else if (corrida) {
            bracos.forEach((b, i) => { b.rotation.x = -0.95 + Math.sin(fase * 1.6 + i * Math.PI) * 0.55 * forca; });
            corpo.position.y = Math.abs(Math.sin(fase)) * 0.01 * forca;
        } else if (cadeira) {
            // Empurra as rodas: bracos em movimento circular curto e rodas giram junto.
            bracos.forEach((b, i) => { b.rotation.x = -0.5 + Math.sin(fase * 1.1 + i * 0.4) * 0.5 * forca; });
            corpo.position.y = Math.abs(Math.sin(fase * 0.5)) * 0.015 * forca;
        } else if (andador) {
            // Passos curtos e firmes; o andador acompanha, sem sair do chao.
            pernas.forEach((p, i) => { p.rotation.x = s * 0.5 * forca * (i === 0 ? 1 : -1); });
            corpo.position.y = Math.abs(s) * 0.035 * forca;
        } else {
            pernas.forEach((p, i) => { p.rotation.x = s * 0.85 * forca * (i === 0 ? 1 : -1); });
            bracos.forEach((b, i) => { b.rotation.x = -s * 0.8 * forca * (i === 0 ? 1 : -1); });
            corpo.position.y = Math.abs(s) * 0.07 * forca;
            quadril.rotation.x = postura.inclina - 0.06 * forca; // leve inclinacao para frente
        }

        balancos.forEach((b, i) => { b.rotation.x = Math.sin(fase * 1.3 + i * 0.5) * 0.14 * forca; });
    }

    return { grupo: raiz, animar, altura: (taxi ? 2.0 : 2.15) * escala, info };
}

// ---------------------------------------------------------------------- retratos

/**
 * Retratos dos avatares (imagens) para a tela de escolha e o relatorio, desenhados com o proprio
 * personagem 3D. Devolve um mapa id -> data URL; vazio se o navegador nao tiver WebGL.
 */
// Um unico contexto WebGL serve a todos os retratos (navegadores limitam quantos contextos existem).
let motorRetrato;

function obterMotorRetrato() {
    if (motorRetrato !== undefined) {
        return motorRetrato;
    }

    try {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.setClearColor(0x000000, 0);
        const cena = new THREE.Scene();
        cena.add(new THREE.HemisphereLight(0xffffff, 0x9fb4cc, 1.55));
        const luz = new THREE.DirectionalLight(0xffffff, 1.1);
        luz.position.set(-2, 3, -4);
        cena.add(luz);
        motorRetrato = { renderer, cena, camera: new THREE.PerspectiveCamera(30, 1, 0.1, 50) };
    } catch {
        motorRetrato = null;
    }

    return motorRetrato;
}

export function gerarRetratos(specs, { largura = 220, altura = 260 } = {}) {
    const mapa = new Map();
    const motor = obterMotorRetrato();

    if (!motor) {
        return mapa;
    }

    const { renderer, cena, camera } = motor;
    renderer.setSize(largura, altura);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();

    for (const spec of specs) {
        const { grupo, info } = criarAvatar3D(spec);
        const centroY = info.retrato.centro * (spec.altura ?? 1);
        grupo.rotation.y = 0.5;
        cena.add(grupo);
        camera.position.set(0.9, centroY + 0.25, -info.retrato.distancia);
        camera.lookAt(0, centroY, 0);
        renderer.render(cena, camera);
        mapa.set(spec.id, renderer.domElement.toDataURL('image/png'));
        cena.remove(grupo);
        grupo.traverse((o) => {
            o.geometry?.dispose();
            o.material?.dispose();
        });
    }

    return mapa;
}
