import * as THREE from 'three';

/**
 * Cenarios do jogo. O cenario e so o visual (chao, margens, veiculo): portoes, placas, ciclo de
 * palavras, pontuacao e relatorio sao os mesmos em todos. Quem decide em qual cenario cada avatar cabe
 * e `avatarCabe`: o criterio e o meio de locomocao do avatar (campo `mobilidade`).
 */
export const CENARIOS = {
    // Textos do jogo que dependem do cenario: o que a pessoa faz (verbo), o botao de comecar, onde termina,
    // como acelerar e por onde segue.
    rua: {
        nome: 'Rua',
        descricao: 'Uma rua de cidade, com prédios e árvores.',
        verbo: 'correr',
        comeco: 'Começar a correr',
        fim: 'da rua',
        acelerar: 'correr mais rápido',
        percurso: 'pela rua',
        motivo: '',
        aceita: () => true,
    },
    rio: {
        nome: 'Rio',
        descricao: 'Um rio com margens de mata, percorrido de barco.',
        verbo: 'navegar',
        comeco: 'Começar a navegar',
        fim: 'do rio',
        acelerar: 'navegar mais rápido',
        percurso: 'pelo rio',
        motivo: 'Moto e táxi não vão de barco.',
        aceita: (mobilidade) => !['moto', 'taxi'].includes(mobilidade),
    },
    ar: {
        nome: 'Céu',
        descricao: 'Voando entre as nuvens, com campos e montanhas lá embaixo.',
        verbo: 'voar',
        comeco: 'Começar a voar',
        fim: 'do voo',
        acelerar: 'voar mais rápido',
        percurso: 'pelo céu',
        motivo: 'Moto e táxi não voam.',
        aceita: (mobilidade) => !['moto', 'taxi'].includes(mobilidade),
    },
};

const SOBE_NO_BARCO = ['anda', 'bengala', 'andador', 'cadeira', 'cadeira-corrida'];

/**
 * Meios de locomocao de cada cenario (a pessoa escolhe em "Como voce quer ir?"). `aceita` recebe a
 * `mobilidade` do avatar; `textos` troca as frases do jogo (verbo, botao de comecar, como acelerar).
 */
export const MEIOS = {
    barco: {
        cenario: 'rio',
        nome: 'Barco a motor',
        descricao: 'Sentado no banco de uma voadeira, com motor de popa.',
        motivo: 'Moto e táxi não vão de barco.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        textos: {},
    },
    veleiro: {
        cenario: 'rio',
        nome: 'Veleiro',
        descricao: 'Sentado no veleiro, com a vela cheia de vento.',
        motivo: 'Moto e táxi não vão de veleiro.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        textos: { verbo: 'velejar', comeco: 'Começar a velejar', acelerar: 'velejar mais rápido' },
    },
    // Ceu. `sentado: false` = o avatar fica pendurado em pe (asa delta); nos demais senta no veiculo.
    aviao: {
        cenario: 'ar',
        nome: 'Avião',
        descricao: 'Num avião de hélice, com a cabine aberta.',
        motivo: 'Moto e táxi não voam.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        textos: {},
    },
    jato: {
        cenario: 'ar',
        nome: 'Jato',
        descricao: 'Num jato veloz, sob uma cúpula de vidro.',
        motivo: 'Moto e táxi não voam.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        textos: {},
    },
    helicoptero: {
        cenario: 'ar',
        nome: 'Helicóptero',
        descricao: 'Num helicóptero, de hélice girando no alto.',
        motivo: 'Moto e táxi não voam.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        textos: {},
    },
    'asa-delta': {
        cenario: 'ar',
        nome: 'Asa delta',
        descricao: 'Pendurado sob uma asa triangular, planando.',
        motivo: 'Moto e táxi não voam.',
        sentado: false,
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        textos: {},
    },
    parapente: {
        cenario: 'ar',
        nome: 'Parapente',
        descricao: 'Sentado no arnês, sob uma grande vela.',
        motivo: 'Moto e táxi não voam.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        textos: {},
    },
};

/** Primeiro meio de um cenario (o que vem marcado), ou null se o cenario nao tem meios. */
export function meioPadrao(cenario) {
    return Object.keys(MEIOS).find((chave) => MEIOS[chave].cenario === cenario) ?? null;
}

/** Quem entra: a regra do meio, quando o cenario tem meios, ou a do proprio cenario. */
export function regraDe(cenario, meio) {
    return MEIOS[meio]?.cenario === cenario ? MEIOS[meio] : (CENARIOS[cenario] ?? CENARIOS.rua);
}

/** Frases do jogo para o cenario e o meio escolhidos. */
export function textosDe(cenario, meio) {
    return { ...(CENARIOS[cenario] ?? CENARIOS.rua), ...(MEIOS[meio]?.cenario === cenario ? MEIOS[meio].textos : {}) };
}

/** O avatar (especificacao de avatars.js) pode ir neste cenario, neste meio? */
export function avatarCabe(spec, cenario, meio) {
    return regraDe(cenario, meio).aceita(spec.mobilidade ?? 'anda');
}

const lambert = (cor) => new THREE.MeshLambertMaterial({ color: cor });

/** Cores do rio em cada clima (a chave `agua` de CLIMAS em game3d.js troca a cor da superficie). */
export const LARGURA_RIO = 12;

/**
 * Rio: agua, margens com mata, palafitas e morros ao fundo. Tudo que anda com a "rua" entra em
 * `adicionarMovel` (reciclado a cada `periodo`), como os predios da cidade.
 *
 * @returns {{agua: THREE.Mesh, basePortao: () => THREE.Group}}
 */
export function construirRio({ cena, lados, adicionarMovel, arvores, sorteio, periodo, zTras }) {
    const agua = new THREE.Mesh(new THREE.BoxGeometry(LARGURA_RIO, 0.1, 420, 1, 1, 140), lambert(0x2f86b8));
    agua.position.set(0, -0.05, -170);
    cena.add(agua);

    for (const lado of [-1, 1]) {
        // Faixa de areia junto da agua e, depois dela, o capim.
        const areia = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 420, 1, 1, 140), lambert(0xd8c690));
        areia.position.set(lado * (LARGURA_RIO / 2 + 1.1), 0.05, -170);
        cena.add(areia);

        const capim = new THREE.Mesh(new THREE.BoxGeometry(60, 0.5, 420, 1, 1, 140), lambert(0x58a05a));
        capim.position.set(lado * (LARGURA_RIO / 2 + 2.3 + 30), 0.05, -170);
        cena.add(capim);

        const grupoLado = lado < 0 ? lados.esquerdo : lados.direito;

        // Arvores de mata ciliar (copa redonda) e palmeiras, em lugares alternados.
        const quantidade = Math.round(periodo / 8);

        for (let i = 0; i < quantidade; i++) {
            const arvore = new THREE.Group();
            const palmeira = i % 3 === 2;

            if (palmeira) {
                const altura = 4.2 + sorteio() * 1.4;
                const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, altura, 8), lambert(0x8a6a44));
                tronco.position.y = altura / 2;
                arvore.add(tronco);

                for (let f = 0; f < 6; f++) {
                    const folha = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 2.1), lambert(f % 2 ? 0x2f8a4a : 0x3f9d57));
                    folha.position.set(0, altura, 0);
                    folha.rotation.y = (f / 6) * Math.PI * 2;
                    folha.rotation.x = 0.35;
                    folha.geometry.translate(0, 0, 1);
                    arvore.add(folha);
                }
            } else {
                const altura = 2 + sorteio() * 1.6;
                const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, altura, 8), lambert(0x6b4a2e));
                tronco.position.y = altura / 2;
                const copa = new THREE.Mesh(new THREE.SphereGeometry(1.5 + sorteio() * 0.7, 12, 10), lambert(i % 2 ? 0x2f8350 : 0x3f9b5f));
                copa.position.y = altura + 0.5;
                arvore.add(tronco, copa);
            }

            const x = LARGURA_RIO / 2 + 3.2 + sorteio() * 6;
            arvore.position.x = lado * x;
            arvores.push(arvore);
            adicionarMovel(arvore, 0, zTras - (i / quantidade) * periodo - sorteio() * 3, grupoLado);
        }

        // Palafitas: casinha de madeira sobre pilares, de frente para o rio.
        for (let i = 0; i < 2; i++) {
            const casa = new THREE.Group();
            const cores = [0xe9b27a, 0x9cc7e8, 0xe7d6a0];

            for (const px of [-1, 1]) {
                for (const pz of [-1, 1]) {
                    const pilar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6), lambert(0x6b4a2e));
                    pilar.position.set(px * 1.1, 0.7, pz * 1.1);
                    casa.add(pilar);
                }
            }

            const piso = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 2.8), lambert(0x8a5a2b));
            piso.position.y = 1.4;
            const paredes = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 2.4), lambert(cores[(i + (lado > 0 ? 1 : 0)) % cores.length]));
            paredes.position.y = 2.2;
            const telhado = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.1, 4), lambert(0xc0553a));
            telhado.position.y = 3.5;
            telhado.rotation.y = Math.PI / 4;
            casa.add(piso, paredes, telhado);
            casa.position.x = lado * (LARGURA_RIO / 2 + 4.4);
            adicionarMovel(casa, 0, zTras - (i + 0.5) * (periodo / 2) - 10 * lado, grupoLado);
        }

        // Morros ao fundo.
        for (let i = 0; i < 5; i++) {
            const altura = 9 + sorteio() * 8;
            const morro = new THREE.Mesh(new THREE.ConeGeometry(11 + sorteio() * 6, altura, 7), lambert(i % 2 ? 0x3c8a58 : 0x4a9a62));
            morro.position.set(lado * (30 + sorteio() * 14), altura / 2 - 0.4, 0);
            adicionarMovel(morro, 0, zTras - (i / 5) * periodo - sorteio() * 8, grupoLado);
        }
    }

    // Marolas: tracos claros que passam pela agua e mostram a velocidade (fazem o papel da faixa da rua).
    const marolaGeo = new THREE.BoxGeometry(1.4, 0.02, 0.14);
    const marolaMat = new THREE.MeshLambertMaterial({ color: 0xdff1fb, transparent: true, opacity: 0.7 });

    for (let i = 0; i < periodo / 2.5; i++) {
        const marola = new THREE.Mesh(marolaGeo, marolaMat);
        marola.position.set((sorteio() - 0.5) * (LARGURA_RIO - 1.5), 0.02, 0);
        adicionarMovel(marola, 0, zTras - i * 2.5 - sorteio() * 1.5);
    }

    // Em vez da faixa de pedestres: uma fila de boias atravessando o rio, sob o portao.
    function basePortao() {
        const grupo = new THREE.Group();

        for (let i = -4; i <= 4; i++) {
            const boia = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lambert(i % 2 ? 0xffffff : 0xf08a3c));
            boia.position.set(i * 1.05, 0.1, 0);
            grupo.add(boia);
        }

        return grupo;
    }

    return { agua, basePortao };
}

/**
 * Peixes que pulam no rio (dourado, prata e pintado): de tempos em tempos um deles salta num arco perto do
 * barco, faz um anel de agua ao sair e ao voltar, e some. Acompanham a agua (somam `dz`, como o resto do
 * cenario). So enfeite: nao afetam nada do jogo.
 *
 * @returns {{atualizar: (dt: number, dz: number) => void}}
 */
export function criarPeixes({ cena, sorteio }) {
    const cores = [0xe8b33a, 0xc9d3dc, 0xd96b3a, 0xe8b33a];
    const corpoGeo = new THREE.SphereGeometry(0.22, 10, 8);
    const caudaGeo = new THREE.ConeGeometry(0.13, 0.3, 4);
    const aneisGeo = new THREE.RingGeometry(0.25, 0.34, 22);
    const DURACAO = 0.95; // segundos no ar
    const ALTURA = 1.3;
    const TAMANHO = 1.8; // os peixes precisam ser vistos de longe, na vista de cima e no celular
    const AVANCO = 2.4; // quanto o peixe anda para a frente enquanto salta

    const peixes = cores.map((cor, i) => {
        const grupo = new THREE.Group();
        const corpo = new THREE.Mesh(corpoGeo, lambert(cor));
        corpo.scale.set(0.5, 0.5, 1.6); // alongado em z; a cabeca aponta para -z
        const cauda = new THREE.Mesh(caudaGeo, lambert(cor));
        cauda.rotation.x = -Math.PI / 2; // ponta para o corpo, base aberta atras
        cauda.scale.set(0.22, 1, 1);
        cauda.position.z = 0.42;
        grupo.add(corpo, cauda);
        grupo.scale.setScalar(TAMANHO);
        grupo.visible = false;
        cena.add(grupo);

        const anel = new THREE.Mesh(aneisGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        anel.rotation.x = -Math.PI / 2;
        anel.visible = false;
        cena.add(anel);

        return { grupo, anel, ativo: false, espera: 0.4 + i * 0.9, t: 0, x: 0, z: 0, anelT: 1 };
    });

    function soltarAnel(peixe, x, z) {
        peixe.anel.position.set(x, 0.04, z);
        peixe.anelT = 0;
    }

    return {
        atualizar(dt, dz) {
            for (const p of peixes) {
                // O anel de agua cresce e some, andando com o rio.
                if (p.anelT < 1) {
                    p.anelT += dt / 0.8;
                    p.anel.visible = p.anelT < 1;
                    p.anel.position.z += dz;
                    p.anel.scale.setScalar(0.6 + p.anelT * 2.4);
                    p.anel.material.opacity = Math.max(0, 0.7 * (1 - p.anelT));
                }

                if (!p.ativo) {
                    p.espera -= dt;

                    if (p.espera <= 0) {
                        // Salta perto do barco, mas fora dele, de um dos lados e a alguma distancia a frente.
                        const lado = sorteio() < 0.5 ? -1 : 1;
                        p.x = lado * (1.8 + sorteio() * 2.6);
                        p.z = -5 - sorteio() * 8;
                        p.t = 0;
                        p.ativo = true;
                        p.grupo.visible = true;
                        soltarAnel(p, p.x, p.z);
                    }

                    continue;
                }

                p.t += dt;
                p.z += dz - (AVANCO / DURACAO) * dt;
                const s = Math.min(1, p.t / DURACAO);
                const y = 4 * ALTURA * s * (1 - s);
                const subida = 4 * ALTURA * (1 - 2 * s) / DURACAO; // dy/dt
                p.grupo.position.set(p.x, 0.05 + y, p.z);
                p.grupo.rotation.x = Math.atan2(subida, AVANCO / DURACAO);

                if (s >= 1) {
                    p.ativo = false;
                    p.grupo.visible = false;
                    p.espera = 1.5 + sorteio() * 2.5;
                    soltarAnel(p, p.x, p.z);
                }
            }
        },
    };
}

/**
 * Barco de motor de popa (as "voadeiras" dos rios do Mato Grosso). O convés fica em y = 0, e o casco
 * desce abaixo disso; comprimento de z = -2 (proa) a z = 1,4 (popa). O avatar senta no banco do meio.
 *
 * @returns {{grupo: THREE.Group, atualizar: (dt: number, ritmo: number) => void}}
 */
export function criarBarco(meio = 'barco', modo = '3d') {
    const veleiro = meio === 'veleiro';
    // Vista 3D (camera atras do avatar): vela mais baixa e translucida, para nao tapar as placas das palavras.
    const alturaVela = modo === '3d' ? 0.62 : 1;
    const baixa = (y) => 0.5 + (y - 0.5) * alturaVela;
    const grupo = new THREE.Group();

    // Casco: vista de cima com proa em ponta, extrudada para baixo do convés.
    const forma = new THREE.Shape();
    forma.moveTo(-0.85, -1.4);
    forma.lineTo(0.85, -1.4);
    forma.lineTo(0.85, 0.4);
    forma.quadraticCurveTo(0.7, 1.4, 0, 2.0);
    forma.quadraticCurveTo(-0.7, 1.4, -0.85, 0.4);
    forma.lineTo(-0.85, -1.4);

    const casco = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: 0.55, bevelEnabled: false }), lambert(0xf2f6fb));
    casco.rotation.x = -Math.PI / 2; // a ponta (y positivo) vira a proa, em z negativo
    casco.position.y = -0.55;
    grupo.add(casco);

    const piso = new THREE.Mesh(new THREE.ShapeGeometry(forma), lambert(0xa9773f));
    piso.rotation.x = -Math.PI / 2;
    piso.scale.set(0.9, 0.9, 1);
    piso.position.y = 0.005; // abaixo da sombra do avatar (0,01), para nao brigar na tela
    grupo.add(piso);

    for (const lado of [-1, 1]) {
        const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 2.5), lambert(veleiro ? 0x1f6fb8 : 0xf08a3c));
        faixa.position.set(lado * 0.86, -0.16, -0.3);
        grupo.add(faixa);
    }

    // Banco no meio do barco: e onde o avatar senta (o topo fica em 0,28, na altura do quadril sentado).
    const banco = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.4), lambert(0x6b4a2e));
    banco.position.set(0, 0.23, 0);
    grupo.add(banco);

    // Motor de popa e a helice, ja dentro da agua (o veleiro nao tem motor).
    let helice = null;

    if (!veleiro) {
        const motor = new THREE.Group();
        const cabecaMotor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.3), lambert(0x2b3a4f));
        cabecaMotor.position.set(0, 0.25, 0);
        const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), lambert(0x4a5668));
        haste.position.set(0, -0.2, 0);
        motor.add(cabecaMotor, haste);
        helice = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), lambert(0x9aa5b1));
        helice.position.set(0, -0.62, 0);
        motor.add(helice);
        motor.position.set(0, 0, 1.55);
        grupo.add(motor);
    }

    // Veleiro: mastro na frente do avatar, vela grande (grande) e vela da proa (buja), com a retranca. As
    // velas ficam levemente abertas para o lado oposto ao da camera lateral, para nao taparem o avatar.
    let balanco = null;

    if (veleiro) {
        const alturaMastro = 3.7 * alturaVela;
        const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, alturaMastro, 8), lambert(0xe9eef4));
        mastro.position.set(0, alturaMastro / 2, -0.9);
        grupo.add(mastro);

        const velaMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: modo === '3d' ? 0.5 : 0.96, depthWrite: false });
        const triangulo = (pontos) => {
            const forma2d = new THREE.Shape();
            pontos.forEach(([x, y], i) => (i === 0 ? forma2d.moveTo(x, y) : forma2d.lineTo(x, y)));

            return new THREE.Mesh(new THREE.ShapeGeometry(forma2d), velaMaterial);
        };

        balanco = new THREE.Group();
        balanco.position.set(0, 0, -0.9); // gira em torno do mastro

        const plano = new THREE.Group();
        plano.rotation.y = -Math.PI / 2; // o x das velas vira o eixo do barco (para a popa)
        plano.add(triangulo([[0, 0.5], [0, baixa(3.4)], [2.4, 0.6]])); // vela grande
        plano.add(triangulo([[-0.08, baixa(3.0)], [-0.08, 0.5], [-1.05, 0.45]])); // buja
        balanco.add(plano);

        const retranca = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.4), lambert(0xe9eef4));
        retranca.position.set(0, 0.55, 1.2);
        balanco.add(retranca);
        balanco.rotation.y = -0.4;
        grupo.add(balanco);
    }

    let tempo = 0;

    // Espuma na popa: bolhas que saem do barco, crescem e somem.
    const espumas = [];
    const espumaGeo = new THREE.CircleGeometry(0.5, 14);

    for (let i = 0; i < 9; i++) {
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
        const espuma = new THREE.Mesh(espumaGeo, material);
        espuma.rotation.x = -Math.PI / 2;
        espuma.position.set(0, -0.5, 1.8 + (i / 9) * 4);
        espumas.push({ espuma, idade: i / 9 });
        grupo.add(espuma);
    }

    return {
        grupo,
        atualizar(dt, ritmo) {
            tempo += dt;

            if (helice) {
                helice.rotation.x += dt * (8 + ritmo * 18);
            }

            if (balanco) {
                // O vento enche as velas: elas balancam de leve e o casco adorna para o lado.
                balanco.rotation.y = -0.4 + Math.sin(tempo * 1.3) * 0.05;
                grupo.rotation.z = 0.07 + Math.sin(tempo * 0.9) * 0.02;
            }

            for (const e of espumas) {
                e.idade += dt * (0.25 + Math.min(ritmo, 2) * 0.35);

                if (e.idade > 1) {
                    e.idade -= 1;
                }

                const forca = Math.min(1, ritmo);
                e.espuma.position.z = 1.8 + e.idade * 4;
                e.espuma.position.x = Math.sin(e.idade * 7 + e.espuma.id) * 0.25 * e.idade;
                e.espuma.scale.setScalar(0.6 + e.idade * 1.8);
                e.espuma.material.opacity = (1 - e.idade) * 0.55 * forca;
            }
        },
    };
}

// ------------------------------------------------------------------------------------------- ceu

/**
 * Ceu: campos e montanhas la embaixo (muito abaixo da rota de voo), nuvens ao lado da rota e, no lugar da
 * faixa de pedestres, balões e nuvenzinhas sob as placas. Tudo que anda entra em `adicionarMovel`.
 *
 * @returns {{solo: THREE.Mesh, basePortao: () => THREE.Group}}
 */
export function construirCeu({ cena, adicionarMovel, sorteio, periodo, zTras }) {
    const solo = new THREE.Mesh(new THREE.BoxGeometry(900, 0.5, 720), lambert(0x5aa25c));
    solo.position.set(0, -42, -250);
    cena.add(solo);

    // Campos de cultivo, que passam devagar la embaixo e mostram o movimento.
    const camposCores = [0x6fb06a, 0xc8b86a, 0x4f9a5c, 0x8cbf6a, 0xb7a35a];

    for (let i = 0; i < 28; i++) {
        const campo = new THREE.Mesh(new THREE.BoxGeometry(14 + sorteio() * 40, 0.1, 10 + sorteio() * 34), lambert(camposCores[i % camposCores.length]));
        campo.position.set((sorteio() - 0.5) * 200, -41.7, 0);
        adicionarMovel(campo, 0, zTras - (i / 28) * periodo - sorteio() * 4);
    }

    // Montanhas, com o topo perto da altura do voo.
    for (const lado of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const altura = 44 + sorteio() * 16;
            const montanha = new THREE.Mesh(new THREE.ConeGeometry(22 + sorteio() * 10, altura, 7), lambert(i % 2 ? 0x6d8f6a : 0x7c9c78));
            montanha.position.set(lado * (62 + sorteio() * 60), -42 + altura / 2, 0); // longe da rota: aparecem pequenas e enevoadas
            adicionarMovel(montanha, 0, zTras - (i / 4) * periodo - sorteio() * 10);
        }
    }

    // Nuvens ao lado da rota (sempre longe do caminho do avatar).
    const nuvemMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });

    for (let i = 0; i < 26; i++) {
        const nuvem = new THREE.Group();

        for (let k = 0; k < 4; k++) {
            const bola = new THREE.Mesh(new THREE.SphereGeometry(1.2 + sorteio() * 1.2, 10, 8), nuvemMaterial);
            bola.position.set(k * 1.4 - 2, sorteio() * 0.6, (sorteio() - 0.5) * 1.6);
            bola.scale.y = 0.7;
            nuvem.add(bola);
        }

        nuvem.scale.setScalar(1 + sorteio() * 1.2);
        nuvem.position.set((i % 2 ? -1 : 1) * (11 + sorteio() * 30), -14 + sorteio() * 24, 0);
        adicionarMovel(nuvem, 0, zTras - (i / 26) * periodo - sorteio() * 5);
    }

    // Em vez da faixa de pedestres: balões coloridos atravessando o portão e uma nuvenzinha na base de cada poste.
    function basePortao() {
        const grupo = new THREE.Group();
        const baloes = [0xf08a3c, 0x1f6fb8, 0xd6457f, 0xf2b705, 0x2e9e6b];

        for (let i = -4; i <= 4; i++) {
            const balao = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lambert(baloes[Math.abs(i) % baloes.length]));
            balao.position.set(i * 1.05, 0.45, 0);
            grupo.add(balao);
        }

        for (const x of [-4.3, -0.3, 0.3, 4.3]) {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), nuvemMaterial);
            puff.position.set(x, 0.1, 0);
            puff.scale.set(1.2, 0.6, 1);
            grupo.add(puff);
        }

        return grupo;
    }

    return { solo, basePortao };
}

/**
 * Passaros que cruzam o ceu (no lugar dos peixes do rio): vem de um lado, batem as asas e saem do outro,
 * em varias alturas e distancias. So enfeite: nao afetam nada do jogo.
 *
 * @returns {{atualizar: (dt: number, dz: number) => void}}
 */
export function criarPassaros({ cena, sorteio }) {
    const cores = [0x2b3a4f, 0xf2f6fb, 0x6b4a2e, 0xd96b3a, 0x2b3a4f];

    const passaros = cores.map((cor, i) => {
        const grupo = new THREE.Group();
        const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lambert(cor));
        corpo.scale.set(0.7, 0.7, 1.5);
        const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), lambert(cor));
        cabeca.position.set(0, 0.04, -0.26);
        const bico = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 4), lambert(0xf2b705));
        bico.rotation.x = -Math.PI / 2;
        bico.position.set(0, 0.03, -0.38);
        grupo.add(corpo, cabeca, bico);

        const asas = [-1, 1].map((lado) => {
            const pivo = new THREE.Group();
            pivo.position.set(lado * 0.1, 0.03, 0);
            const asa = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.025, 0.26), lambert(cor));
            asa.position.x = lado * 0.28;
            pivo.add(asa);
            grupo.add(pivo);

            return { pivo, lado };
        });

        grupo.scale.setScalar(2.4);
        cena.add(grupo);

        return { grupo, asas, fase: sorteio() * 6, x: 0, y: 0, z: 0, vx: 0, vz: 0, i };
    });

    function nascer(p) {
        const lado = sorteio() < 0.5 ? -1 : 1;
        p.x = -lado * (16 + sorteio() * 8);
        p.y = -3 + sorteio() * 9;
        p.z = -10 - sorteio() * 40;
        p.vx = lado * (2.4 + sorteio() * 2.6);
        p.vz = 1 + sorteio() * 2.5; // aproxima-se aos poucos da camera
        p.grupo.rotation.y = Math.atan2(-p.vx, -p.vz);
    }

    passaros.forEach((p, i) => {
        nascer(p);
        p.x += (sorteio() - 0.5) * 30; // espalha no comeco, para nao entrarem todos juntos
        p.z += i * 4;
    });

    return {
        atualizar(dt, dz) {
            for (const p of passaros) {
                p.fase += dt * 11;
                p.x += p.vx * dt;
                p.z += dz + p.vz * dt;
                p.y += Math.sin(p.fase * 0.4 + p.i) * dt * 0.4;
                p.grupo.position.set(p.x, p.y, p.z);

                for (const { pivo, lado } of p.asas) {
                    pivo.rotation.z = lado * Math.sin(p.fase) * 0.75;
                }

                if (Math.abs(p.x) > 28 || p.z > 14) {
                    nascer(p);
                }
            }
        },
    };
}

/** Cilindro fino entre dois pontos (cordas do parapente e da asa delta). */
function liga(a, b, cor = 0x59616b, raio = 0.014) {
    const va = new THREE.Vector3(...a);
    const direcao = new THREE.Vector3(...b).sub(va);
    const comprimento = direcao.length();
    const fio = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, comprimento, 5), lambert(cor));
    fio.position.copy(va).addScaledVector(direcao, 0.5);
    fio.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize());

    return fio;
}

/**
 * Aeronaves do cenario de ar. O avatar (filho do mesmo grupo) fica em y = 0 sobre o assento; cada aeronave
 * traz as suas partes moveis. Na vista 3D (camera atras) as partes grandes ficam mais baixas e translucidas
 * para nao taparem as placas.
 *
 * @param {'aviao'|'jato'|'helicoptero'|'asa-delta'|'parapente'} meio
 * @returns {{grupo: THREE.Group, atualizar: (dt: number, ritmo: number) => void}}
 */
export function criarAeronave(meio, modo = '3d') {
    const grupo = new THREE.Group();
    const vidro = new THREE.MeshLambertMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.26, depthWrite: false });
    const translucido = (cor, opacidade) => new THREE.MeshLambertMaterial({ color: cor, transparent: true, opacity: opacidade, depthWrite: false, side: THREE.DoubleSide });
    const opacidadeAsa = modo === '3d' ? 0.55 : 0.95;
    const giros = []; // { obj, eixo, velocidade }
    const chamas = [];
    let tempo = 0;

    const assento = (cor = 0x6b4a2e) => {
        const banco = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.45), lambert(cor));
        banco.position.set(0, 0.23, 0);
        grupo.add(banco);
    };

    const cilindroEmZ = (raioTras, raioFrente, comprimento, cor, x, y, z) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(raioTras, raioFrente, comprimento, 14), lambert(cor));
        c.rotation.x = Math.PI / 2; // topo (raioTras) para a popa, base (raioFrente) para a proa
        c.position.set(x, y, z);

        return c;
    };

    if (meio === 'aviao') {
        assento();
        grupo.add(cilindroEmZ(0.4, 0.52, 3.8, 0xd6455a, 0, -0.12, 0.1));

        // Borda da cabine aberta: uma moldura escura em volta do avatar.
        for (const lado of [-1, 1]) {
            const lateral = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 1.0), lambert(0x2b3a4f));
            lateral.position.set(lado * 0.5, 0.42, 0.05);
            grupo.add(lateral);
        }

        const traseira = new THREE.Mesh(new THREE.BoxGeometry(1.07, 0.2, 0.07), lambert(0x2b3a4f));
        traseira.position.set(0, 0.42, 0.55);
        grupo.add(traseira);
        const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.7, 14), lambert(0xf2f6fb));
        nariz.rotation.x = -Math.PI / 2;
        nariz.position.set(0, -0.12, -2.15);
        grupo.add(nariz);

        const asa = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.07, 1.0), lambert(0xf2f6fb));
        asa.position.set(0, -0.35, -0.2);
        grupo.add(asa);

        for (const lado of [-1, 1]) {
            const ponta = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.075, 1.02), lambert(0xd6455a));
            ponta.position.set(lado * 2.45, -0.35, -0.2);
            grupo.add(ponta);
        }

        const estabilizador = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.55), lambert(0xf2f6fb));
        estabilizador.position.set(0, -0.05, 1.85);
        const deriva = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.55), lambert(0xd6455a));
        deriva.position.set(0, 0.3, 1.85);
        grupo.add(estabilizador, deriva);

        const parabrisa = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.04), vidro);
        parabrisa.position.set(0, 0.62, -0.62);
        parabrisa.rotation.x = -0.5;
        grupo.add(parabrisa);

        const helice = new THREE.Group();
        helice.position.set(0, -0.12, -2.55);
        helice.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.04), lambert(0x2b3a4f)));
        helice.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lambert(0xf08a3c))));
        grupo.add(helice);
        giros.push({ obj: helice, eixo: 'z', velocidade: 30 });
    } else if (meio === 'jato') {
        assento(0x2b3a4f);
        grupo.add(cilindroEmZ(0.22, 0.46, 4.2, 0x8fa0b2, 0, -0.1, 0.3));
        const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.4, 14), lambert(0xe9eef4));
        nariz.rotation.x = -Math.PI / 2;
        nariz.position.set(0, -0.1, -2.5);
        grupo.add(nariz);

        const forma = new THREE.Shape();
        forma.moveTo(0, 1.2);
        forma.lineTo(-2.6, -1.6);
        forma.lineTo(0, -1.0);
        forma.lineTo(2.6, -1.6);
        forma.lineTo(0, 1.2);
        const asaDelta = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: 0.07, bevelEnabled: false }), lambert(0x59708a));
        asaDelta.rotation.x = -Math.PI / 2;
        asaDelta.position.set(0, -0.32, 0.3);
        grupo.add(asaDelta);

        for (const lado of [-1, 1]) {
            const deriva = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.7), lambert(0xd6455a));
            deriva.position.set(lado * 0.55, 0.2, 2.0);
            deriva.rotation.z = -lado * 0.25;
            grupo.add(deriva);
            grupo.add(cilindroEmZ(0.2, 0.22, 1.0, 0x4a5668, lado * 0.35, -0.2, 2.1));

            const chama = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.0, 8), new THREE.MeshBasicMaterial({ color: 0xff9a2e, transparent: true, opacity: 0.85 }));
            chama.rotation.x = Math.PI / 2; // ponta para tras
            chama.position.set(lado * 0.35, -0.2, 3.1);
            grupo.add(chama);
            chamas.push(chama);
        }

        const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.64, 14, 10), vidro);
        cupula.scale.set(1, 0.95, 1.9);
        cupula.position.set(0, 0.85, -0.1);
        grupo.add(cupula);
    } else if (meio === 'helicoptero') {
        assento(0x2b3a4f);
        const piso = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.9), lambert(0x59708a));
        piso.position.set(0, -0.04, 0.1);
        grupo.add(piso);

        const cabine = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), vidro);
        cabine.scale.set(1, 1.8, 1.3);
        cabine.position.set(0, 0, 0.05);
        grupo.add(cabine);

        grupo.add(cilindroEmZ(0.06, 0.13, 3.2, 0xd6455a, 0, 0.55, 2.4));
        const derivaCauda = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.5), lambert(0xd6455a));
        derivaCauda.position.set(0, 0.9, 3.9);
        grupo.add(derivaCauda);

        const rotorCauda = new THREE.Group();
        rotorCauda.position.set(0.12, 0.95, 3.9);
        rotorCauda.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.07), lambert(0x2b3a4f)));
        grupo.add(rotorCauda);
        giros.push({ obj: rotorCauda, eixo: 'x', velocidade: 34 });

        for (const lado of [-1, 1]) {
            grupo.add(cilindroEmZ(0.04, 0.04, 2.4, 0x2b3a4f, lado * 0.75, -0.55, 0.1));

            for (const z of [-0.5, 0.7]) {
                const apoio = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), lambert(0x2b3a4f));
                apoio.position.set(lado * 0.75, -0.3, z);
                grupo.add(apoio);
            }
        }

        const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), lambert(0x2b3a4f));
        mastro.position.set(0, 2.15, 0.05);
        grupo.add(mastro);

        const rotor = new THREE.Group();
        rotor.position.set(0, 2.4, 0.05);
        rotor.add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.04, 0.2), lambert(0x2b3a4f)));
        const disco = new THREE.Mesh(new THREE.CircleGeometry(2.2, 28), translucido(0xffffff, 0.1));
        disco.rotation.x = -Math.PI / 2;
        rotor.add(disco);
        grupo.add(rotor);
        giros.push({ obj: rotor, eixo: 'y', velocidade: 22 });
    } else if (meio === 'asa-delta') {
        // O avatar fica pendurado em pe, preso por duas fitas, sob uma asa triangular.
        const altura = modo === '3d' ? 2.35 : 2.9;
        const forma = new THREE.Shape();
        forma.moveTo(0, 2.2);
        forma.lineTo(-2.4, -1.2);
        forma.lineTo(0, -0.6);
        forma.lineTo(2.4, -1.2);
        forma.lineTo(0, 2.2);
        const asa = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: 0.05, bevelEnabled: false }), translucido(0xf08a3c, opacidadeAsa));
        asa.rotation.x = -Math.PI / 2;
        asa.position.set(0, altura, 0.2);
        grupo.add(asa);

        const quilha = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 3.4), lambert(0xe9eef4));
        quilha.position.set(0, altura - 0.04, 0.2);
        grupo.add(quilha);

        for (const lado of [-1, 1]) {
            grupo.add(liga([0, altura - 0.04, 0.1], [lado * 0.24, 1.45, 0], 0xe9eef4, 0.018));
            grupo.add(liga([lado * 1.2, altura - 0.05, -0.1], [lado * 0.28, 1.5, -0.25], 0x59616b, 0.012));
        }
    } else if (meio === 'parapente') {
        assento(0x2b3a4f);
        const raio = 3.0;
        const centro = 0.6;
        const faixas = 8;
        const arco = 1.6;

        for (let i = 0; i < faixas; i++) {
            const faixa = new THREE.Mesh(
                new THREE.CylinderGeometry(raio, raio, 1.2, 4, 1, true, Math.PI - arco / 2 + (i * arco) / faixas, arco / faixas),
                translucido(i % 2 ? 0xffffff : 0xd6455a, opacidadeAsa),
            );
            faixa.rotation.x = Math.PI / 2;
            faixa.position.set(0, centro, 0);
            grupo.add(faixa);
        }

        // Cordas das duas bordas e do meio da vela ate os ombros do avatar.
        const borda = Math.sin(arco / 2) * raio;
        const alturaBorda = centro + Math.cos(arco / 2) * raio;

        for (const lado of [-1, 1]) {
            grupo.add(liga([lado * borda, alturaBorda, -0.5], [lado * 0.24, 1.5, 0], 0x59616b));
            grupo.add(liga([lado * borda, alturaBorda, 0.5], [lado * 0.24, 1.5, 0], 0x59616b));
            grupo.add(liga([lado * borda * 0.5, centro + Math.cos(arco / 4) * raio, 0], [lado * 0.24, 1.5, 0], 0x59616b));
        }
    }

    return {
        grupo,
        atualizar(dt, ritmo) {
            tempo += dt;

            for (const giro of giros) {
                giro.obj.rotation[giro.eixo] += dt * (giro.velocidade + ritmo * 10);
            }

            for (const chama of chamas) {
                chama.scale.set(1, 0.7 + Math.random() * 0.6 + Math.min(ritmo, 2) * 0.25, 1);
            }

            // Balanco do voo: a vela e a asa balancam, as demais aeronaves adernam de leve nas curvas.
            grupo.rotation.z = Math.sin(tempo * 0.8) * (meio === 'parapente' || meio === 'asa-delta' ? 0.06 : 0.03);
        },
    };
}
