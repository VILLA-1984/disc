import * as THREE from 'three';

/**
 * Cenarios do jogo. O cenario e so o visual (chao, margens, veiculo): portoes, placas, ciclo de
 * palavras, pontuacao e relatorio sao os mesmos em todos. Quem decide em qual cenario cada avatar cabe
 * e `avatarCabe`: o criterio e o meio de locomocao do avatar (campo `mobilidade`).
 */
export const CENARIOS = {
    rua: {
        nome: 'Rua',
        descricao: 'Uma rua de cidade, com prédios e árvores.',
        motivo: '',
        aceita: () => true,
    },
    rio: {
        nome: 'Rio',
        descricao: 'Um rio com margens de mata, percorrido de barco.',
        motivo: 'Moto e táxi não vão de barco.',
        aceita: (mobilidade) => !['moto', 'taxi'].includes(mobilidade),
    },
};

/** O avatar (especificacao de avatars.js) pode ir neste cenario? */
export function avatarCabe(spec, cenario) {
    return (CENARIOS[cenario] ?? CENARIOS.rua).aceita(spec.mobilidade ?? 'anda');
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
 * Barco de motor de popa (as "voadeiras" dos rios do Mato Grosso). O convés fica em y = 0, e o casco
 * desce abaixo disso; comprimento de z = -2 (proa) a z = 1,4 (popa). O avatar fica em pe no convés.
 *
 * @returns {{grupo: THREE.Group, atualizar: (dt: number, ritmo: number) => void}}
 */
export function criarBarco() {
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
        const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 2.5), lambert(0xf08a3c));
        faixa.position.set(lado * 0.86, -0.16, -0.3);
        grupo.add(faixa);
    }

    const banco = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.32), lambert(0x6b4a2e));
    banco.position.set(0, 0.32, 0.95);
    grupo.add(banco);

    // Motor de popa e a helice, ja dentro da agua.
    const motor = new THREE.Group();
    const cabecaMotor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.3), lambert(0x2b3a4f));
    cabecaMotor.position.set(0, 0.25, 0);
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), lambert(0x4a5668));
    haste.position.set(0, -0.2, 0);
    motor.add(cabecaMotor, haste);
    const helice = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), lambert(0x9aa5b1));
    helice.position.set(0, -0.62, 0);
    motor.add(helice);
    motor.position.set(0, 0, 1.55);
    grupo.add(motor);

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
            helice.rotation.x += dt * (8 + ritmo * 18);

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
