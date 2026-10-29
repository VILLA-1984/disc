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
    neve: {
        nome: 'Neve',
        descricao: 'Uma pista de montanha coberta de neve, com pinheiros e nevasca.',
        verbo: 'deslizar',
        comeco: 'Começar a deslizar',
        fim: 'da pista',
        acelerar: 'deslizar mais rápido',
        percurso: 'pela neve',
        motivo: 'Moto, táxi e cadeira de corrida não vão para a neve.',
        aceita: (mobilidade) => !['moto', 'taxi', 'cadeira-corrida'].includes(mobilidade),
    },
    trilhos: {
        nome: 'Trilhos',
        descricao: 'Uma ferrovia no campo, com três vias, postes de telégrafo e colinas.',
        verbo: 'viajar',
        comeco: 'Começar a viagem',
        fim: 'da linha',
        acelerar: 'andar mais rápido',
        percurso: 'pelos trilhos',
        motivo: 'Moto e táxi não andam sobre trilhos.',
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
    // `semApoio`: o avatar vai sem cadeira, bengala ou andador (ficam na margem), sentado no veiculo, sem perder
    // roupa, cabelo, oculos e demais tracos. `base`: altura do convés sobre a agua. `bracos`: angulo dos bracos.
    caiaque: {
        cenario: 'rio',
        nome: 'Caiaque',
        descricao: 'Remando sentado num caiaque. Os apoios (cadeira, bengala, andador) ficam na margem.',
        motivo: 'Moto e táxi não vão de caiaque.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        semApoio: true,
        base: 0.2,
        bracos: 0.8,
        textos: { verbo: 'remar', comeco: 'Começar a remar', acelerar: 'remar mais rápido' },
    },
    'moto-aquatica': {
        cenario: 'rio',
        nome: 'Moto aquática',
        descricao: 'Pilotando uma moto aquática, de colete salva-vidas.',
        motivo: 'A moto aquática é para quem anda, usa bengala ou já é de moto.',
        aceita: (mobilidade) => ['anda', 'bengala', 'moto'].includes(mobilidade),
        semApoio: true,
        base: 0.3,
        bracos: 0.95,
        textos: { verbo: 'pilotar', comeco: 'Começar a pilotar', acelerar: 'pilotar mais rápido' },
    },
    // Trilhos. O avatar vai sentado (os apoios ficam na plataforma): na cabine da locomotiva a vapor, ou na
    // draisina, o carrinho de ferrovia de bombear, onde os bracos acompanham a alavanca.
    locomotiva: {
        cenario: 'trilhos',
        nome: 'Locomotiva',
        descricao: 'Na cabine de uma locomotiva a vapor, com fumaça saindo da chaminé. Os apoios ficam na plataforma.',
        motivo: 'Moto e táxi não andam sobre trilhos.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        semApoio: true,
        base: 0.62,
        bracos: 0.7,
        textos: { comeco: 'Começar a viagem', acelerar: 'acelerar a locomotiva' },
    },
    draisina: {
        cenario: 'trilhos',
        nome: 'Draisina',
        descricao: 'Num carrinho de ferrovia de bombear, empurrando a alavanca. Os apoios ficam na plataforma.',
        motivo: 'Moto e táxi não andam sobre trilhos.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        semApoio: true,
        bombeando: true,
        base: 0.5,
        textos: { verbo: 'bombear', comeco: 'Começar a bombear', acelerar: 'bombear mais rápido' },
    },
    // Neve. Quem anda ou usa bengala ou andador esquia em pe (os apoios ficam na base da pista); quem usa cadeira
    // vai de sit-ski; o trenó serve a todos os que cabem na neve.
    esqui: {
        cenario: 'neve',
        nome: 'Esqui',
        descricao: 'Esquiando em pé, com bastões. Os apoios (bengala, andador) ficam na base da pista.',
        motivo: 'Para esquiar em pé: quem anda ou usa bengala ou andador. Quem usa cadeira vai de sit-ski ou trenó.',
        aceita: (mobilidade) => ['anda', 'bengala', 'andador'].includes(mobilidade),
        semApoio: true,
        sentado: false,
        base: 0.04,
        bracos: 0.5,
        textos: { verbo: 'esquiar', comeco: 'Começar a esquiar', acelerar: 'esquiar mais rápido' },
    },
    'sit-ski': {
        cenario: 'neve',
        nome: 'Sit-ski',
        descricao: 'Sentado num esqui adaptado, com bastões de apoio, para quem usa cadeira de rodas.',
        motivo: 'O sit-ski é para quem usa cadeira de rodas.',
        aceita: (mobilidade) => mobilidade === 'cadeira',
        semApoio: true,
        base: 0.16,
        bracos: 0.55,
        textos: { verbo: 'esquiar', comeco: 'Começar a esquiar', acelerar: 'esquiar mais rápido' },
    },
    treno: {
        cenario: 'neve',
        nome: 'Trenó',
        descricao: 'Deslizando sentado num trenó de madeira.',
        motivo: 'Moto, táxi e cadeira de corrida não vão para a neve.',
        aceita: (mobilidade) => ['anda', 'bengala', 'andador', 'cadeira'].includes(mobilidade),
        semApoio: true,
        base: 0.1,
        textos: { verbo: 'deslizar', comeco: 'Começar a deslizar', acelerar: 'deslizar mais rápido' },
    },
    nado: {
        cenario: 'rio',
        nome: 'Nado',
        descricao: 'Nadando crawl, de colete salva-vidas. Os apoios (cadeira, bengala, andador) ficam na margem.',
        motivo: 'Moto e táxi não nadam.',
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        semApoio: true,
        nadando: true,
        base: 0.02,
        textos: { verbo: 'nadar', comeco: 'Começar a nadar', acelerar: 'nadar mais rápido' },
    },
    'boia-pato': {
        cenario: 'rio',
        nome: 'Boia de pato',
        descricao: 'Boiando sentado numa boia em forma de pato. Os apoios ficam na margem.',
        motivo: 'A boia de pato é para quem anda ou usa bengala ou andador.',
        aceita: (mobilidade) => ['anda', 'bengala', 'andador'].includes(mobilidade),
        semApoio: true,
        base: 0.04,
        textos: { verbo: 'boiar', comeco: 'Começar a boiar', acelerar: 'boiar mais rápido' },
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
        semApoio: true, // pendurado no arnes, sem cadeira, bengala ou andador
        bracos: 2.7, // maos para cima, na barra de controle
        aceita: (mobilidade) => SOBE_NO_BARCO.includes(mobilidade),
        textos: {},
    },
    parapente: {
        cenario: 'ar',
        nome: 'Parapente',
        descricao: 'Sentado no arnês, sob uma grande vela.',
        motivo: 'Moto e táxi não voam.',
        semApoio: true, // sentado no arnes, sem cadeira, bengala ou andador
        bracos: 2.5, // maos para cima, nos comandos da vela
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
    if (meio === 'caiaque') {
        return criarCaiaque();
    }

    if (meio === 'moto-aquatica') {
        return criarMotoAquatica();
    }

    if (meio === 'boia-pato') {
        return criarBoiaPato();
    }

    if (meio === 'nado') {
        return criarAguaDoNado();
    }

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

// ------------------------------------------------------------------------------------ meios do rio

/** Casco extrudado a partir de uma forma vista de cima (proa em +y da forma = -z do mundo). Conves em y = 0. */
function cascoDe(forma, profundidade, cor) {
    const casco = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: profundidade, bevelEnabled: false }), lambert(cor));
    casco.rotation.x = -Math.PI / 2;
    casco.position.y = -profundidade;

    return casco;
}

/** Espuma atras do veiculo: bolhas que saem, crescem e somem, mais fortes com o ritmo. Devolve o atualizador. */
function criarEspuma(grupo, zInicio, { quantidade = 9, comprimento = 4, tamanho = 1.8, forcaMax = 0.55 } = {}) {
    const espumas = [];
    const geometria = new THREE.CircleGeometry(0.5, 14);

    for (let i = 0; i < quantidade; i++) {
        const espuma = new THREE.Mesh(geometria, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
        espuma.rotation.x = -Math.PI / 2;
        espuma.position.set(0, -0.2, zInicio + (i / quantidade) * comprimento);
        espumas.push({ espuma, idade: i / quantidade });
        grupo.add(espuma);
    }

    return (dt, ritmo) => {
        for (const e of espumas) {
            e.idade += dt * (0.25 + Math.min(ritmo, 2) * 0.35);

            if (e.idade > 1) {
                e.idade -= 1;
            }

            e.espuma.position.z = zInicio + e.idade * comprimento;
            e.espuma.position.x = Math.sin(e.idade * 7 + e.espuma.id) * 0.25 * e.idade;
            e.espuma.scale.setScalar(0.6 + e.idade * tamanho);
            e.espuma.material.opacity = (1 - e.idade) * forcaMax * Math.min(1, ritmo);
        }
    };
}

/** Caiaque amarelo, estreito e fundo; o avatar rema sentado (pa dupla que alterna os lados). */
function criarCaiaque() {
    const grupo = new THREE.Group();
    const forma = new THREE.Shape();
    forma.moveTo(0, -1.7);
    forma.quadraticCurveTo(0.34, -1.0, 0.32, 0);
    forma.quadraticCurveTo(0.34, 1.0, 0, 1.9);
    forma.quadraticCurveTo(-0.34, 1.0, -0.32, 0);
    forma.quadraticCurveTo(-0.34, -1.0, 0, -1.7);
    grupo.add(cascoDe(forma, 0.5, 0xf2b705));

    const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 18, 1, true), new THREE.MeshLambertMaterial({ color: 0x2b3a4f, side: THREE.DoubleSide }));
    aro.scale.z = 1.5;
    aro.position.set(0, 0.04, 0);
    grupo.add(aro);

    const assento = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.4), lambert(0x2b3a4f));
    assento.position.set(0, 0.23, 0.05);
    grupo.add(assento);

    // Pa dupla: haste e duas laminas, segurada na altura das maos.
    const pa = new THREE.Group();
    pa.position.set(0, 1.0, -0.5);
    pa.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 8), lambert(0x59616b)), { }));
    pa.children[0].rotation.z = Math.PI / 2;

    for (const lado of [-1, 1]) {
        const lamina = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.55), lambert(lado < 0 ? 0xd6455a : 0x1f6fb8));
        lamina.position.set(lado * 1.3, 0, 0);
        pa.add(lamina);
    }

    grupo.add(pa);
    const espuma = criarEspuma(grupo, 1.9, { quantidade: 6, comprimento: 3, tamanho: 1.1, forcaMax: 0.4 });
    let tempo = 0;

    return {
        grupo,
        atualizar(dt, ritmo) {
            tempo += dt;
            // Cada remada mergulha uma lamina: a pa se inclina para um lado e depois para o outro.
            pa.rotation.z = Math.sin(tempo * 3.2) * 0.5 * Math.min(1, ritmo + 0.25);
            pa.rotation.y = Math.sin(tempo * 1.6) * 0.12;
            espuma(dt, ritmo);
        },
    };
}

/** Moto aquatica vermelha e branca, com guidao e jato de agua atras. */
function criarMotoAquatica() {
    const grupo = new THREE.Group();
    const forma = new THREE.Shape();
    forma.moveTo(-0.45, -1.1);
    forma.lineTo(0.45, -1.1);
    forma.lineTo(0.45, 0.2);
    forma.quadraticCurveTo(0.4, 0.95, 0, 1.55);
    forma.quadraticCurveTo(-0.4, 0.95, -0.45, 0.2);
    forma.lineTo(-0.45, -1.1);
    grupo.add(cascoDe(forma, 0.5, 0xf2f6fb));

    const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 2.2), lambert(0xd6455a));
    faixa.position.set(0, -0.05, -0.1);
    grupo.add(faixa);

    const capo = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.32, 0.8), lambert(0xd6455a));
    capo.position.set(0, 0.14, -0.85);
    grupo.add(capo);

    const banco = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 1.0), lambert(0x2b3a4f));
    banco.position.set(0, 0.23, 0.35);
    grupo.add(banco);

    const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), lambert(0x4a5668));
    coluna.position.set(0, 0.5, -0.62);
    const guidao = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), lambert(0x2b3a4f));
    guidao.position.set(0, 0.75, -0.62);
    grupo.add(coluna, guidao);

    const espuma = criarEspuma(grupo, 1.3, { quantidade: 12, comprimento: 5, tamanho: 2.4, forcaMax: 0.75 });
    let tempo = 0;

    return {
        grupo,
        atualizar(dt, ritmo) {
            tempo += dt;
            // A moto aquatica trepida nas ondas e inclina o nariz para cima quando acelera.
            grupo.rotation.x = -0.04 * Math.min(ritmo, 2) + Math.sin(tempo * 5.5) * 0.012 * Math.min(1, ritmo);
            espuma(dt, ritmo);
        },
    };
}

/** Boia de pato: argola amarela com cabeca, bico, asinhas e rabo; o avatar senta no buraco, de pernas na agua. */
function criarBoiaPato() {
    const grupo = new THREE.Group();
    const amarelo = lambert(0xf6d12e);

    const argola = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.3, 12, 28), amarelo);
    argola.rotation.x = Math.PI / 2;
    argola.position.y = 0.1;
    grupo.add(argola);

    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), amarelo);
    cabeca.position.set(0, 0.55, -1.0);
    const bico = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.28), lambert(0xf08a3c));
    bico.position.set(0, 0.5, -1.36);
    grupo.add(cabeca, bico);

    for (const lado of [-1, 1]) {
        const olho = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        olho.position.set(lado * 0.17, 0.65, -1.28);
        grupo.add(olho);

        const asa = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), amarelo);
        asa.scale.set(0.35, 0.55, 1);
        asa.position.set(lado * 0.98, 0.3, 0.1);
        grupo.add(asa);
    }

    const rabo = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 8), amarelo);
    rabo.rotation.x = -0.9;
    rabo.position.set(0, 0.5, 1.0);
    grupo.add(rabo);

    const espuma = criarEspuma(grupo, 1.1, { quantidade: 5, comprimento: 2.4, tamanho: 0.9, forcaMax: 0.3 });
    let tempo = 0;

    return {
        grupo,
        atualizar(dt, ritmo) {
            tempo += dt;
            // A boia balanca com a agua, de leve, nos dois eixos.
            grupo.rotation.z = Math.sin(tempo * 1.3) * 0.05;
            grupo.rotation.x = Math.sin(tempo * 1.7 + 1) * 0.03;
            espuma(dt, ritmo);
        },
    };
}

/**
 * Nado: nao ha veiculo, so a agua em volta de quem nada: espuma de pernas atras, ondas que saem do peito e
 * aneis que abrem na agua a cada bracada.
 */
function criarAguaDoNado() {
    const grupo = new THREE.Group();
    const espuma = criarEspuma(grupo, 1.3, { quantidade: 10, comprimento: 3.4, tamanho: 1.6, forcaMax: 0.65 });

    // Ondas que saem da cabeca e do peito, abrindo para os lados.
    const ondas = [];
    const ondaGeo = new THREE.RingGeometry(0.45, 0.58, 24);

    for (let i = 0; i < 3; i++) {
        const onda = new THREE.Mesh(ondaGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        onda.rotation.x = -Math.PI / 2;
        onda.position.set(0, 0.0, -1.3);
        grupo.add(onda);
        ondas.push({ onda, idade: i / 3 });
    }

    let tempo = 0;

    return {
        grupo,
        atualizar(dt, ritmo) {
            tempo += dt;
            espuma(dt, Math.max(0.4, ritmo)); // mesmo parado, as pernas batem e fazem um pouco de espuma

            for (const o of ondas) {
                o.idade += dt * (0.5 + Math.min(ritmo, 2) * 0.5);

                if (o.idade > 1) {
                    o.idade -= 1;
                }

                o.onda.scale.set(1 + o.idade * 2.2, 1 + o.idade * 1.4, 1);
                o.onda.position.z = -1.3 - o.idade * 0.6;
                o.onda.material.opacity = (1 - o.idade) * 0.5;
            }

            // A agua balanca um pouco a cada bracada (visto no grupo, so por causa da espuma e das ondas).
            grupo.rotation.z = Math.sin(tempo * 1.6) * 0.02;
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

// ----------------------------------------------------------------------------------------- neve

/**
 * Neve: pista branca de montanha, pinheiros nevados, montanhas ao longe, bandeirinhas de slalom nas bordas e,
 * no lugar da faixa de pedestres, uma fileira de bandeirinhas sob as placas. Tudo que anda entra em
 * `adicionarMovel`, como a rua.
 *
 * @returns {{solo: THREE.Mesh, basePortao: () => THREE.Group}}
 */
export function construirNeve({ cena, lados, adicionarMovel, arvores, sorteio, periodo, zTras }) {
    const solo = new THREE.Mesh(new THREE.BoxGeometry(LARGURA_RIO, 0.1, 420, 1, 1, 140), lambert(0xf4f8fc));
    solo.position.set(0, -0.05, -170);
    cena.add(solo);

    const neveAlta = lambert(0xe6eef6);
    const verdePinheiro = lambert(0x2f6b4a);
    const capaDeNeve = lambert(0xffffff);

    for (const lado of [-1, 1]) {
        const barranco = new THREE.Mesh(new THREE.BoxGeometry(60, 0.9, 420, 1, 1, 140), neveAlta);
        barranco.position.set(lado * (LARGURA_RIO / 2 + 30), 0, -170);
        cena.add(barranco);

        const grupoLado = lado < 0 ? lados.esquerdo : lados.direito;

        // Pinheiros com neve nos galhos.
        const quantidade = Math.round(periodo / 6);

        for (let i = 0; i < quantidade; i++) {
            const pinheiro = new THREE.Group();
            const escala = 0.9 + sorteio() * 0.9;
            const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 8), lambert(0x6b4a2e));
            tronco.position.y = 0.6;
            pinheiro.add(tronco);

            [[1.7, 2.0, 1.4], [1.3, 1.8, 2.5], [0.9, 1.6, 3.5]].forEach(([raio, altura, y], k) => {
                const galho = new THREE.Mesh(new THREE.ConeGeometry(raio, altura, 9), verdePinheiro);
                galho.position.y = y;
                pinheiro.add(galho);
                const capa = new THREE.Mesh(new THREE.ConeGeometry(raio * 0.72, altura * 0.55, 9), capaDeNeve);
                capa.position.y = y + altura * 0.22;
                pinheiro.add(capa);
                void k;
            });

            pinheiro.scale.setScalar(escala);
            pinheiro.position.x = lado * (LARGURA_RIO / 2 + 2.6 + sorteio() * 8);
            arvores.push(pinheiro);
            adicionarMovel(pinheiro, 0, zTras - (i / quantidade) * periodo - sorteio() * 2, grupoLado);
        }

        // Bandeirinhas de slalom nas bordas da pista, vermelhas e azuis.
        for (let i = 0; i < Math.round(periodo / 7); i++) {
            const bandeira = new THREE.Group();
            const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), lambert(0x59616b));
            haste.position.y = 0.75;
            const pano = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.55, 3), lambert(i % 2 ? 0x1f6fb8 : 0xd6455a));
            pano.rotation.z = -Math.PI / 2;
            pano.position.set(lado * 0.3, 1.25, 0);
            bandeira.add(haste, pano);
            bandeira.position.x = lado * (LARGURA_RIO / 2 - 0.4);
            adicionarMovel(bandeira, 0, zTras - i * 7 - 2, grupoLado);
        }

        // Montanhas ao fundo, de topo branco.
        for (let i = 0; i < 4; i++) {
            const altura = 22 + sorteio() * 16;
            const raio = 18 + sorteio() * 10;
            const montanha = new THREE.Group();
            const corpo = new THREE.Mesh(new THREE.ConeGeometry(raio, altura, 7), lambert(0x9fb2c6));
            const topo = new THREE.Mesh(new THREE.ConeGeometry(raio * 0.5, altura * 0.5, 7), capaDeNeve);
            topo.position.y = altura * 0.27;
            montanha.add(corpo, topo);
            montanha.position.set(lado * (55 + sorteio() * 55), altura / 2 - 2, 0);
            adicionarMovel(montanha, 0, zTras - (i / 4) * periodo - sorteio() * 12, grupoLado);
        }
    }

    // Marcas de esqui na neve: tracos claros que passam e mostram a velocidade.
    const marcaGeo = new THREE.BoxGeometry(0.06, 0.012, 3.2);
    const marcaMat = new THREE.MeshLambertMaterial({ color: 0xc6d9ea });

    for (let i = 0; i < periodo / 4; i++) {
        const marca = new THREE.Mesh(marcaGeo, marcaMat);
        marca.position.set((sorteio() - 0.5) * (LARGURA_RIO - 1.5), 0.012, 0);
        adicionarMovel(marca, 0, zTras - i * 4 - sorteio() * 2);
    }

    // Em vez da faixa de pedestres: uma fileira de bandeirinhas sob o portao.
    function basePortao() {
        const grupo = new THREE.Group();

        for (let i = -4; i <= 4; i++) {
            const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), lambert(0x59616b));
            haste.position.set(i * 1.05, 0.4, 0);
            const pano = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 3), lambert(i % 2 ? 0x1f6fb8 : 0xd6455a));
            pano.rotation.z = -Math.PI / 2;
            pano.position.set(i * 1.05 + 0.15, 0.68, 0);
            grupo.add(haste, pano);
        }

        return grupo;
    }

    return { solo, basePortao };
}

/** Nevasca: flocos que caem devagar, levados de lado pelo vento, e acompanham o movimento da pista. So enfeite. */
export function criarNevasca({ cena, sorteio }) {
    const FLOCOS = 650;
    const posicoes = new Float32Array(FLOCOS * 3);
    const velocidades = Array.from({ length: FLOCOS }, () => 0.8 + sorteio() * 1.4);
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
    const flocos = new THREE.Points(geometria, new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }));
    flocos.frustumCulled = false;
    cena.add(flocos);

    const nascer = (i, topo = false) => {
        posicoes.set([-22 + sorteio() * 44, topo ? 12 + sorteio() * 3 : sorteio() * 14, -75 + sorteio() * 85], i * 3);
    };

    for (let i = 0; i < FLOCOS; i++) {
        nascer(i);
    }

    let tempo = 0;

    return {
        atualizar(dt, dz) {
            tempo += dt;

            for (let i = 0; i < FLOCOS; i++) {
                const o = i * 3;
                posicoes[o] += Math.sin(tempo * 0.7 + i) * dt * 0.5 + dt * 0.35;
                posicoes[o + 1] -= velocidades[i] * dt;
                posicoes[o + 2] += dz;

                if (posicoes[o + 1] < 0 || posicoes[o + 2] > 10) {
                    nascer(i, true);

                    // Os que reaparecem na frente da camera vem de longe.
                    if (posicoes[o + 2] > 0) {
                        posicoes[o + 2] -= 75;
                    }
                }
            }

            geometria.attributes.position.needsUpdate = true;
        },
    };
}

/**
 * Veiculos da neve (conves em y = 0, avatar no mesmo grupo): esqui (dois esquis e bastoes que balancam),
 * sit-ski (um esqui com cadeirinha e bastoes de apoio) e trenó de madeira.
 */
export function criarVeiculoNeve(meio) {
    const grupo = new THREE.Group();
    const pivos = [];
    let tempo = 0;

    // Bastao preso a mao: um pivo na altura da mao, com a haste e o discinho na ponta.
    const bastao = (x, yMao, zMao, xPonta, yPonta, zPonta) => {
        const pivo = new THREE.Group();
        pivo.position.set(x, yMao, zMao);
        pivo.add(liga([0, 0, 0], [xPonta - x, yPonta - yMao, zPonta - zMao], 0x59616b, 0.016));
        const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 10), lambert(0xd6455a));
        disco.position.set(xPonta - x, yPonta - yMao + 0.05, zPonta - zMao);
        pivo.add(disco);
        grupo.add(pivo);
        pivos.push(pivo);
    };

    if (meio === 'esqui') {
        [-1, 1].forEach((lado) => {
            const esqui = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 1.9), lambert(lado < 0 ? 0x1f6fb8 : 0xf08a3c));
            esqui.position.set(lado * 0.17, 0.02, -0.1);
            const ponta = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.28), lambert(lado < 0 ? 0x1f6fb8 : 0xf08a3c));
            ponta.rotation.x = 0.45;
            ponta.position.set(lado * 0.17, 0.07, -1.12);
            grupo.add(esqui, ponta);
            bastao(lado * 0.28, 0.76, -0.3, lado * 0.42, 0.02, -0.95);
        });
    } else if (meio === 'sit-ski') {
        const esqui = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 2.1), lambert(0xd6455a));
        esqui.position.set(0, -0.14, -0.1);
        const ponta = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.3), lambert(0xd6455a));
        ponta.rotation.x = 0.45;
        ponta.position.set(0, -0.09, -1.2);
        grupo.add(esqui, ponta);
        grupo.add(liga([0, -0.12, -0.35], [0, 0.2, -0.05], 0x4a5668, 0.03));
        grupo.add(liga([0, -0.12, 0.55], [0, 0.2, 0.25], 0x4a5668, 0.03));

        const assento = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.45), lambert(0x2b3a4f));
        assento.position.set(0, 0.23, 0.05);
        const encosto = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.07), lambert(0x2b3a4f));
        encosto.position.set(0, 0.46, 0.3);
        grupo.add(assento, encosto);

        // Bastoes de apoio (outriggers), com um mini esqui na ponta.
        [-1, 1].forEach((lado) => {
            bastao(lado * 0.3, 0.74, -0.38, lado * 0.62, -0.14, -0.95);
            const mini = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.4), lambert(0x1f6fb8));
            mini.position.set(lado * 0.62, -0.14, -0.95);
            grupo.add(mini);
        });
    } else {
        // Trenó de madeira, com patins de metal e a frente curvada.
        const prancha = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 2.3), lambert(0xb5472f));
        prancha.position.set(0, 0.0, 0.1);
        const curva = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.45), lambert(0xb5472f));
        curva.rotation.x = -0.6;
        curva.position.set(0, 0.12, -1.28);
        grupo.add(prancha, curva);

        for (const lado of [-1, 1]) {
            const patim = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 2.7), lambert(0x59616b));
            patim.position.set(lado * 0.52, -0.1, 0.0);
            const apoio = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), lambert(0x59616b));
            apoio.position.set(lado * 0.52, -0.04, -0.3);
            grupo.add(patim, apoio);
        }

        const assento = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.5), lambert(0x6b4a2e));
        assento.position.set(0, 0.14, 0.15);
        grupo.add(assento);
    }

    return {
        grupo,
        atualizar(dt, ritmo) {
            tempo += dt;

            // Os bastoes balancam um contra o outro; os veiculos trepidam de leve na neve quando andam.
            pivos.forEach((p, i) => { p.rotation.x = Math.sin(tempo * 2.4 + i * Math.PI) * 0.28 * Math.min(1, ritmo + 0.2); });
            grupo.rotation.x = Math.sin(tempo * 9) * 0.006 * Math.min(1, ritmo);
            grupo.rotation.z = Math.sin(tempo * 1.1) * 0.015;
        },
    };
}
// --------------------------------------------------------------------------------------- trilhos

/** Posicao das tres vias (a do meio e a principal; as laterais sao as pistas de escolha do jogo). */
const VIAS = [-2.3, 0, 2.3];

/**
 * Ferrovia no campo: tres vias paralelas sobre brita e dormentes, campo verde dos dois lados, postes de
 * telegrafo, arvores e colinas. Tudo que anda entra em `adicionarMovel`. O avatar anda na via do meio e passa
 * para a da esquerda ou da direita a cada escolha, como num patio de manobras.
 *
 * @returns {{solo: THREE.Mesh, basePortao: () => THREE.Group}}
 */
export function construirTrilhos({ cena, lados, adicionarMovel, arvores, sorteio, periodo, zTras }) {
    const solo = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 420, 1, 1, 140), lambert(0x7b7f86)); // brita
    solo.position.set(0, -0.05, -170);
    cena.add(solo);

    const campo = new THREE.Mesh(new THREE.BoxGeometry(140, 0.2, 420, 1, 1, 140), lambert(0x6bb06a));
    campo.position.set(0, -0.16, -170);
    cena.add(campo);

    // Trilhos de aco, ao longo de toda a linha.
    for (const via of VIAS) {
        for (const lado of [-1, 1]) {
            const trilho = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 420, 1, 1, 140), lambert(0xb8c0c8));
            trilho.position.set(via + lado * 0.72, 0.15, -170);
            cena.add(trilho);
        }
    }

    // Dormentes: uma fileira larga a cada metro, que passa e mostra a velocidade.
    const dormenteGeo = new THREE.BoxGeometry(8.4, 0.1, 0.28);
    const dormenteMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2e });

    for (let i = 0; i < periodo; i++) {
        const dormente = new THREE.Mesh(dormenteGeo, dormenteMat);
        dormente.position.set(0, 0.05, 0);
        adicionarMovel(dormente, 0, zTras - i);
    }

    for (const lado of [-1, 1]) {
        const grupoLado = lado < 0 ? lados.esquerdo : lados.direito;

        // Postes de telegrafo com travessa e isoladores.
        for (let i = 0; i < Math.round(periodo / 17.5); i++) {
            const poste = new THREE.Group();
            const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.6, 8), lambert(0x6b4a2e));
            mastro.position.y = 2.3;
            const travessa = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 0.09), lambert(0x6b4a2e));
            travessa.position.y = 4.3;
            poste.add(mastro, travessa);

            for (const dx of [-0.45, 0.45]) {
                const isolador = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lambert(0xe9eef4));
                isolador.position.set(dx, 4.42, 0);
                poste.add(isolador);
            }

            poste.position.x = lado * 5.2;
            adicionarMovel(poste, 0, zTras - i * 17.5 - 6, grupoLado);
        }

        // Arvores do campo.
        for (let i = 0; i < Math.round(periodo / 9); i++) {
            const arvore = new THREE.Group();
            const altura = 1.6 + sorteio() * 1.4;
            const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, altura, 8), lambert(0x6b4a2e));
            tronco.position.y = altura / 2;
            const copa = new THREE.Mesh(new THREE.SphereGeometry(1.2 + sorteio() * 0.7, 12, 10), lambert(i % 2 ? 0x2f8350 : 0x4aa35f));
            copa.position.y = altura + 0.5;
            arvore.add(tronco, copa);
            arvore.position.x = lado * (7.5 + sorteio() * 12);
            arvores.push(arvore);
            adicionarMovel(arvore, 0, zTras - (i / Math.round(periodo / 9)) * periodo - sorteio() * 3, grupoLado);
        }

        // Colinas arredondadas ao fundo.
        for (let i = 0; i < 5; i++) {
            const colina = new THREE.Mesh(new THREE.SphereGeometry(14 + sorteio() * 10, 16, 12), lambert(i % 2 ? 0x5b9e63 : 0x6bb06a));
            colina.scale.y = 0.45;
            colina.position.set(lado * (45 + sorteio() * 60), -2, 0);
            adicionarMovel(colina, 0, zTras - (i / 5) * periodo - sorteio() * 10, grupoLado);
        }
    }

    // Em vez da faixa de pedestres: cones de sinalizacao de via sobre os dormentes, sob o portao.
    function basePortao() {
        const grupo = new THREE.Group();

        for (let i = -4; i <= 4; i++) {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 10), lambert(0xf08a3c));
            cone.position.set(i * 1.05, 0.27, 0);
            const faixa = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.06, 10), lambert(0xffffff));
            faixa.position.set(i * 1.05, 0.28, 0);
            grupo.add(cone, faixa);
        }

        return grupo;
    }

    return { solo, basePortao };
}

/** Roda de ferro com raios, de eixo x (gira para a frente, em -z). */
function rodaDeFerro(raio, cor = 0x2b3a4f) {
    const roda = new THREE.Group();
    const aro = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, 0.1, 18), lambert(cor));
    aro.rotation.z = Math.PI / 2;
    roda.add(aro);

    for (let i = 0; i < 3; i++) {
        const raioDaRoda = new THREE.Mesh(new THREE.BoxGeometry(0.12, raio * 1.8, 0.05), lambert(0xb8c0c8));
        raioDaRoda.rotation.x = (i * Math.PI) / 3;
        roda.add(raioDaRoda);
    }

    return roda;
}

/**
 * Veiculos dos trilhos (conves em y = 0, avatar no mesmo grupo):
 *  - locomotiva a vapor: caldeira, chaminé com fumaça, cabine com teto, rodas motrizes e limpa-trilhos;
 *  - draisina: carrinho de ferrovia com alavanca de bombear, que balança junto com os braços do avatar.
 */
export function criarVeiculoTrilho(meio, modo = '3d') {
    const grupo = new THREE.Group();
    const rodas = [];
    const fumaca = [];
    let alavanca = null;
    let tempo = 0;

    if (meio === 'draisina') {
        const plataforma = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 2.2), lambert(0xa9773f));
        plataforma.position.set(0, -0.05, 0);
        grupo.add(plataforma);

        for (const lado of [-1, 1]) {
            const viga = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.4), lambert(0x4a5668));
            viga.position.set(lado * 0.55, -0.16, 0);
            grupo.add(viga);

            for (const z of [-0.8, 0.8]) {
                const roda = rodaDeFerro(0.24, 0xd6455a);
                roda.position.set(lado * 0.72, -0.04, z);
                grupo.add(roda);
                rodas.push(roda);
            }
        }

        const banco = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.38), lambert(0x6b4a2e));
        banco.position.set(0, 0.23, 0.05);
        grupo.add(banco);

        // Alavanca de bombear: um poste com uma barra que gira no topo; as maos do avatar ficam nas pontas.
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 8), lambert(0x4a5668));
        poste.position.set(0, 0.45, -0.5);
        grupo.add(poste);

        alavanca = new THREE.Group();
        alavanca.position.set(0, 0.95, -0.5);
        alavanca.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.07), lambert(0x59616b)));

        for (const lado of [-1, 1]) {
            const punho = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), lambert(0x2b3a4f));
            punho.position.set(lado * 0.65, 0, 0);
            alavanca.add(punho);
        }

        grupo.add(alavanca);

        // Lanterna na frente e bandeirinha atras, so de enfeite.
        const lanterna = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), lambert(0xf2b705));
        lanterna.position.set(0, 0.11, -1.0);
        const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 6), lambert(0x59616b));
        mastro.position.set(0.55, 0.55, 0.95);
        const bandeira = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.01), lambert(0xd6455a));
        bandeira.position.set(0.7, 1.0, 0.95);
        grupo.add(lanterna, mastro, bandeira);
    } else {
        const preto = lambert(0x2b3a4f);
        const latao = lambert(0xc9a227);

        // Chassi e rodas: duas motrizes grandes, uma pequena na frente e outra atras.
        const chassi = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 4.6), lambert(0x4a5668));
        chassi.position.set(0, -0.12, -0.9);
        grupo.add(chassi);

        [[-2.1, 0.42], [-1.1, 0.42], [-3.1, 0.26], [0.95, 0.3]].forEach(([z, raio]) => {
            for (const lado of [-1, 1]) {
                const roda = rodaDeFerro(raio, raio > 0.4 ? 0xd6455a : 0x2b3a4f);
                roda.position.set(lado * 0.72, raio === 0.42 ? 0.02 : raio - 0.4, z);
                grupo.add(roda);
                rodas.push(roda);
            }
        });

        // Caldeira com aros de latao, caixa de fumaca na frente e farol.
        const caldeira = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.6, 18), preto);
        caldeira.rotation.x = Math.PI / 2;
        caldeira.position.set(0, 0.72, -1.9);
        grupo.add(caldeira);

        for (const z of [-0.9, -1.9, -2.7]) {
            const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.08, 18), latao);
            aro.rotation.x = Math.PI / 2;
            aro.position.set(0, 0.72, z);
            grupo.add(aro);
        }

        const caixa = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.5, 18), lambert(0x59616b));
        caixa.rotation.x = Math.PI / 2;
        caixa.position.set(0, 0.72, -3.25);
        const farol = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b0 }));
        farol.position.set(0, 0.74, -3.55);
        grupo.add(caixa, farol);

        const chamine = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.7, 12), preto);
        chamine.position.set(0, 1.62, -3.0);
        const bocal = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.2, 0.18, 12), latao);
        bocal.position.set(0, 2.03, -3.0);
        const domo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), latao);
        domo.position.set(0, 1.4, -1.7);
        grupo.add(chamine, bocal, domo);

        // Limpa-trilhos (a "grade" na frente): uma cunha inclinada.
        const grade = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.8), lambert(0xd6455a));
        grade.rotation.x = 0.6;
        grade.position.set(0, -0.02, -3.85);
        grupo.add(grade);

        // Cabine: piso, paredes laterais baixas, colunas e teto (translucido na vista 3D, para nao tapar as placas).
        const piso = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.8), lambert(0x8a5a2b));
        piso.position.set(0, -0.03, 0.3);
        grupo.add(piso);

        for (const lado of [-1, 1]) {
            const parede = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 1.6), lambert(0xd6455a));
            parede.position.set(lado * 0.74, 0.5, 0.4);
            grupo.add(parede);

            for (const z of [-0.45, 1.2]) {
                const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), lambert(0x4a5668));
                coluna.position.set(lado * 0.72, 1.1, z);
                grupo.add(coluna);
            }
        }

        const teto = new THREE.Mesh(
            new THREE.BoxGeometry(1.7, 0.07, 1.95),
            new THREE.MeshLambertMaterial({ color: 0x2b3a4f, transparent: true, opacity: modo === '3d' ? 0.3 : 0.95, depthWrite: false }),
        );
        teto.position.set(0, 2.22, 0.38);
        grupo.add(teto);

        const banco = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.4), lambert(0x6b4a2e));
        banco.position.set(0, 0.23, 0.05);
        grupo.add(banco);

        // Fumaca: bolas cinzentas que sobem da chaminé, vao para tras e somem.
        const fumacaGeo = new THREE.SphereGeometry(0.3, 8, 6);

        for (let i = 0; i < 9; i++) {
            const bola = new THREE.Mesh(fumacaGeo, new THREE.MeshBasicMaterial({ color: 0xe3e7ec, transparent: true, opacity: 0, depthWrite: false }));
            grupo.add(bola);
            fumaca.push({ bola, idade: i / 9 });
        }
    }

    return {
        grupo,
        atualizar(dt, ritmo) {
            tempo += dt;
            const giro = dt * (2 + Math.min(ritmo, 2) * 12);
            rodas.forEach((roda) => { roda.rotation.x -= giro; });

            if (alavanca) {
                // Sincronizada com os bracos do avatar (mesma formula em avatars.js, pelo relogio do navegador).
                alavanca.rotation.z = Math.sin((performance.now() / 1000) * 4.4) * 0.3;
            }

            for (const f of fumaca) {
                f.idade += dt * (0.22 + Math.min(ritmo, 2) * 0.22);

                if (f.idade > 1) {
                    f.idade -= 1;
                }

                f.bola.position.set(Math.sin(f.idade * 5 + 1) * 0.15, 2.15 + f.idade * 2.6, -3.0 + f.idade * (1.2 + Math.min(ritmo, 2) * 2.4));
                f.bola.scale.setScalar(0.5 + f.idade * 1.9);
                f.bola.material.opacity = (1 - f.idade) * 0.7;
            }

            // Trepidacao leve sobre os trilhos quando anda.
            grupo.position.y = Math.sin(tempo * 17) * 0.006 * Math.min(1, ritmo);
        },
    };
}