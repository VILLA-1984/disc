/**
 * Gato e aguia em 3D, montados no codigo com formas simples (sem arquivo de modelo): no estilo dos avatares e dos
 * veiculos do jogo. Os dois olham para -z (a direcao da corrida) e se mexem por `animar(fase)`: o gato galopa, a aguia
 * bate as asas. Cada um devolve `{ raiz, materiais, animar }`; o controlador cuida de posicao, escala e transparencia.
 */
import * as THREE from 'three';

function material(cor, extra = {}) {
    return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, metalness: 0, transparent: true, ...extra });
}

function malha(geometria, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometria, mat);
    m.position.set(x, y, z);
    m.frustumCulled = false;

    return m;
}

/** Perna de dois segmentos pendurada no quadril; devolve o grupo do quadril e o do joelho. */
function perna(mat, pata, { comprimento, raio, x, y, z }) {
    const quadril = new THREE.Group();
    quadril.position.set(x, y, z);
    quadril.add(malha(new THREE.CylinderGeometry(raio * 1.15, raio, comprimento, 8), mat, 0, -comprimento / 2, 0));

    const joelho = new THREE.Group();
    joelho.position.set(0, -comprimento, 0);
    joelho.add(malha(new THREE.CylinderGeometry(raio, raio * 0.8, comprimento, 8), mat, 0, -comprimento / 2, 0));
    joelho.add(malha(new THREE.SphereGeometry(raio * 1.25, 8, 6), pata, 0, -comprimento, -raio * 0.5));
    quadril.add(joelho);

    return { quadril, joelho };
}

export function criarGato3D() {
    const pelo = material(0xd9822b);
    const claro = material(0xf6e6cf);
    const escuro = material(0x5a3a1a);
    const rosa = material(0xe99aa0);
    const olho = material(0x1c1c1c);
    const materiais = [pelo, claro, escuro, rosa, olho];

    const raiz = new THREE.Group();
    // O corpo inteiro "pula" um pouco a cada passada.
    const corpo = new THREE.Group();
    raiz.add(corpo);

    const tronco = malha(new THREE.CapsuleGeometry(0.13, 0.42, 6, 12), pelo, 0, 0.42, 0);
    tronco.rotation.x = Math.PI / 2;
    corpo.add(tronco);
    // Listras do dorso e peito claro.
    for (const z of [-0.12, 0.02, 0.16]) {
        corpo.add(malha(new THREE.BoxGeometry(0.2, 0.025, 0.045), escuro, 0, 0.545, z));
    }

    corpo.add(malha(new THREE.SphereGeometry(0.09, 10, 8), claro, 0, 0.38, -0.24));

    // Cabeca: a cabeca de um gato e larga, com focinho curto, orelhas pontudas e olhos grandes.
    const cabeca = new THREE.Group();
    cabeca.position.set(0, 0.5, -0.4);
    cabeca.add(malha(new THREE.SphereGeometry(0.13, 14, 10), pelo, 0, 0, 0));
    cabeca.add(malha(new THREE.SphereGeometry(0.06, 10, 8), claro, 0, -0.04, -0.1));
    cabeca.add(malha(new THREE.SphereGeometry(0.018, 6, 5), rosa, 0, -0.01, -0.155));

    for (const lado of [-1, 1]) {
        const orelha = malha(new THREE.ConeGeometry(0.055, 0.13, 4), pelo, lado * 0.075, 0.13, 0.0);
        orelha.rotation.z = -lado * 0.25;
        cabeca.add(orelha);
        const interna = malha(new THREE.ConeGeometry(0.03, 0.08, 4), rosa, lado * 0.075, 0.12, -0.02);
        interna.rotation.z = -lado * 0.25;
        cabeca.add(interna);
        cabeca.add(malha(new THREE.SphereGeometry(0.022, 8, 6), olho, lado * 0.055, 0.035, -0.115));
    }

    corpo.add(cabeca);

    // Cauda comprida e levantada, em segmentos que ondulam.
    const segmentosCauda = [];
    let pai = new THREE.Group();
    pai.position.set(0, 0.46, 0.34);
    corpo.add(pai);

    for (let i = 0; i < 5; i++) {
        const seg = new THREE.Group();
        seg.add(malha(new THREE.CapsuleGeometry(0.03 - i * 0.002, 0.1, 4, 8), i === 4 ? escuro : pelo, 0, 0.06, 0));
        seg.rotation.x = -0.5 - i * 0.12; // sobe e curva para tras
        pai.add(seg);
        const proximo = new THREE.Group();
        proximo.position.set(0, 0.115, 0);
        seg.add(proximo);
        segmentosCauda.push(seg);
        pai = proximo;
    }

    // Pernas: dianteiras (z negativo) e traseiras (z positivo).
    const membros = [
        { ...perna(pelo, claro, { comprimento: 0.17, raio: 0.04, x: -0.1, y: 0.38, z: -0.2 }), fase: 0, sinal: 1 },
        { ...perna(pelo, claro, { comprimento: 0.17, raio: 0.04, x: 0.1, y: 0.38, z: -0.2 }), fase: 0.45, sinal: 1 },
        { ...perna(pelo, claro, { comprimento: 0.19, raio: 0.045, x: -0.1, y: 0.38, z: 0.22 }), fase: 3.1, sinal: -1 },
        { ...perna(pelo, claro, { comprimento: 0.19, raio: 0.045, x: 0.1, y: 0.38, z: 0.22 }), fase: 3.55, sinal: -1 },
    ];

    for (const m of membros) {
        corpo.add(m.quadril);
    }

    return {
        raiz,
        materiais,
        animar(fase) {
            corpo.position.y = Math.abs(Math.sin(fase)) * 0.045;
            corpo.rotation.x = Math.sin(fase * 2) * 0.03;

            for (const m of membros) {
                const t = fase + m.fase;

                m.quadril.rotation.x = Math.sin(t) * 0.85;
                m.joelho.rotation.x = Math.max(0, Math.sin(t + 1.4)) * 1.1 * m.sinal * -1 + 0.15;
            }

            segmentosCauda.forEach((seg, i) => {
                seg.rotation.z = Math.sin(fase * 0.8 - i * 0.7) * 0.16;
            });
            cabeca.rotation.x = Math.sin(fase * 2 + 1) * 0.05;
        },
    };
}

export function criarAguia3D() {
    const penas = material(0x6b4a2e);
    const pontas = material(0x2d1f12);
    const branco = material(0xf7f3ea);
    const bico = material(0xf0b429);
    const olho = material(0x1c1c1c);
    const materiais = [penas, pontas, branco, bico, olho];

    const raiz = new THREE.Group();
    const corpo = new THREE.Group();
    raiz.add(corpo);

    // Corpo (elipsoide), peito claro, cabeca branca e bico curvo.
    const tronco = malha(new THREE.SphereGeometry(0.14, 14, 10), penas, 0, 0, 0);
    tronco.scale.set(0.9, 0.85, 2.3);
    corpo.add(tronco);

    const peito = malha(new THREE.SphereGeometry(0.1, 10, 8), branco, 0, -0.03, -0.12);
    peito.scale.set(0.9, 0.8, 1.5);
    corpo.add(peito);

    const cabeca = new THREE.Group();
    cabeca.position.set(0, 0.07, -0.34);
    cabeca.add(malha(new THREE.SphereGeometry(0.085, 12, 10), branco, 0, 0, 0));
    const ponta = malha(new THREE.ConeGeometry(0.04, 0.12, 8), bico, 0, -0.015, -0.1);
    ponta.rotation.x = -Math.PI / 2 - 0.35;
    cabeca.add(ponta);

    for (const lado of [-1, 1]) {
        cabeca.add(malha(new THREE.SphereGeometry(0.016, 6, 5), olho, lado * 0.055, 0.02, -0.055));
    }

    corpo.add(cabeca);

    // Cauda em leque, de penas mais escuras nas pontas.
    const cauda = malha(new THREE.BoxGeometry(0.22, 0.03, 0.32), penas, 0, 0, 0.5);
    cauda.rotation.x = 0.08;
    corpo.add(cauda);
    const leque = malha(new THREE.BoxGeometry(0.2, 0.014, 0.08), pontas, 0, 0, 0.65);
    leque.rotation.x = 0.08;
    corpo.add(leque);

    // Asas: um segmento junto ao corpo e outro na ponta, que dobra na batida.
    const asas = [];

    for (const lado of [-1, 1]) {
        const ombro = new THREE.Group();
        ombro.position.set(lado * 0.09, 0.03, -0.04);
        ombro.add(malha(new THREE.BoxGeometry(0.46, 0.035, 0.44), penas, lado * 0.23, 0, 0.04));

        const ponta2 = new THREE.Group();
        ponta2.position.set(lado * 0.46, 0, 0);
        ponta2.add(malha(new THREE.BoxGeometry(0.4, 0.03, 0.32), pontas, lado * 0.2, 0, 0.06));
        ombro.add(ponta2);

        corpo.add(ombro);
        asas.push({ ombro, ponta: ponta2, lado });
    }

    return {
        raiz,
        materiais,
        animar(fase) {
            const bate = Math.sin(fase);

            corpo.position.y = -bate * 0.03; // sobe quando as asas descem
            corpo.rotation.x = bate * 0.04;

            for (const { ombro, ponta, lado } of asas) {
                ombro.rotation.z = lado * (bate * 0.7 + 0.1);
                ponta.rotation.z = lado * (bate * 0.45 + 0.05);
            }
        },
    };
}
