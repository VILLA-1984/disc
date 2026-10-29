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
