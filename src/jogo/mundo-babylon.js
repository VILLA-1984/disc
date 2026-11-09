import * as THREE from 'three';
import { criarAvatar3D } from './avatars.js';
import { MEIOS, construirCeu, construirNeve, construirRio, construirTrilhos, criarAeronave, criarBarco, criarNevasca, criarPassaros, criarPeixes, criarVeiculoNeve, criarVeiculoTrilho } from './cenarios.js';
import { construirEspaco, criarEspacoVivo, criarVeiculoEspacial } from './espaco.js';
import { espelharObjeto3D } from './espelho-babylon.js';

/**
 * Cenarios fora da rua (rio, ceu, neve, trilhos e espaco) para o motor em Babylon.js. O mundo, o veiculo e o avatar sao
 * montados pelas mesmas funcoes do three.js (cenarios.js, espaco.js, avatars.js), so na memoria, e espelhados no Babylon
 * (espelho-babylon.js). Aqui fica o que o game3d.js faz por cenario: reciclagem do cenario, enfeites vivos (peixes,
 * passaros, nevasca, cometas), cor da pista no clima e o balanco do veiculo.
 *
 * Mesma convencao do three.js dentro do modulo (z negativo e a frente); o espelho inverte o z para o Babylon.
 */

const PERIODO = 175;
const Z_TRAS = 20;

export const CENARIOS_DO_MUNDO = ['rio', 'ar', 'neve', 'trilhos', 'espaco'];

/**
 * @param {object} B espaco BABYLON
 * @param {object} cena BABYLON.Scene
 * @param {{cenario: string, meio?: string, avatar: object, avatarNo: object, reduzirMovimento: boolean, sorteio: () => number, pixelRatio: number}} opcoes
 */
export function criarMundoEspelhado(B, cena, { modo = '3d', cenario, meio, avatar: spec, avatarNo, reduzirMovimento, sorteio, pixelRatio }) {
    const raiz = new THREE.Group(); // a "cena" do three.js, so na memoria
    const noMundo = new B.TransformNode('mundo', cena);
    const movel = []; // itens que andam com o cenario: { obj, comprimento }
    const arvores = []; // balancam com o vento
    const lados = { esquerdo: new THREE.Group(), direito: new THREE.Group() };
    raiz.add(lados.esquerdo, lados.direito);

    // Lateral: a camera fica do lado de x positivo, e o que estiver desse lado taparia a cena.
    if (modo === 'lateral') {
        lados.direito.visible = false;
    }

    function adicionarMovel(obj, comprimento, zInicial, pai = raiz) {
        obj.position.z = zInicial;
        pai.add(obj);
        movel.push({ obj, comprimento });
    }

    const parametros = { cena: raiz, lados, adicionarMovel, arvores, sorteio, periodo: PERIODO, zTras: Z_TRAS };
    const rio = cenario === 'rio' ? construirRio(parametros) : null;
    const aereo = cenario === 'ar' ? construirCeu(parametros) : null;
    const gelo = cenario === 'neve' ? construirNeve(parametros) : null;
    const ferrovia = cenario === 'trilhos' ? construirTrilhos(parametros) : null;
    const espacial = cenario === 'espaco' ? construirEspaco({ ...parametros, modo }) : null;
    const mundo3 = rio ?? aereo ?? gelo ?? ferrovia ?? espacial;
    const estrada = rio ? rio.agua : (aereo ? aereo.solo : (gelo ? gelo.solo : (ferrovia ? ferrovia.solo : espacial.solo)));

    // ------------------------------------------------------------------ avatar e veiculo
    const meioEscolhido = meio ?? (rio ? 'barco' : (aereo ? 'aviao' : (gelo ? 'treno' : (ferrovia ? 'locomotiva' : 'nave'))));
    const infoMeio = MEIOS[meioEscolhido] ?? {};
    const alturaConves = infoMeio.base ?? 0.34;
    const sentadoNoMeio = infoMeio.sentado !== false;
    const tracosDoMeio = {
        ...(infoMeio.semApoio ? { mobilidade: 'anda' } : {}),
        ...(infoMeio.nadando ? { nadando: true, noBarco: false } : {}),
        ...(infoMeio.bombeando ? { bombeando: true } : {}),
        semModelo: true,
        ...(infoMeio.bracos !== undefined ? { anguloBracos: infoMeio.bracos } : {}),
    };
    const specAvatar = rio
        ? { ...spec, colete: true, noBarco: true, ...tracosDoMeio }
        : { ...spec, noBarco: sentadoNoMeio, ...tracosDoMeio };
    const avatar = criarAvatar3D(specAvatar);
    avatar.grupo.position.set(0, 0, 0);

    const esconderAvatar = () => {
        for (const parte of avatar.grupo.children) {
            if (parte !== veiculo.grupo) {
                parte.visible = false;
            }
        }
    };
    const veiculo = rio
        ? criarBarco(meioEscolhido, modo, { aoModelo: esconderAvatar })
        : (aereo
            ? criarAeronave(meioEscolhido, modo)
            : (gelo ? criarVeiculoNeve(meioEscolhido) : (ferrovia ? criarVeiculoTrilho(meioEscolhido, modo, { aoModelo: esconderAvatar }) : criarVeiculoEspacial(meioEscolhido, modo))));

    veiculo.grupo.scale.setScalar(1 / avatar.grupo.scale.x);
    avatar.grupo.add(veiculo.grupo);

    // No espaco so o astronauta mostra o avatar (de traje); nave, foguete e disco levam a pessoa por dentro.
    if (espacial && meioEscolhido !== 'astronauta') {
        for (const parte of avatar.grupo.children) {
            if (parte !== veiculo.grupo) {
                parte.visible = false;
            }
        }
    }

    // Enfeites vivos (so visuais; ficam de fora com "reduzir movimento"): peixes que pulam no rio, passaros no ceu.
    const peixes = rio && !reduzirMovimento ? criarPeixes({ cena: raiz, sorteio }) : null;
    const passaros = aereo && !reduzirMovimento ? criarPassaros({ cena: raiz, sorteio }) : null;
    const nevasca = gelo && !reduzirMovimento ? criarNevasca({ cena: raiz, sorteio }) : null;
    const espacoVivo = espacial && !reduzirMovimento ? criarEspacoVivo({ cena: raiz, sorteio, planetas: espacial.planetas, modo }) : null;

    const semMotor = ['veleiro', 'caiaque', 'boia-pato', 'nado', 'asa-delta', 'parapente', 'esqui', 'sit-ski', 'treno', 'astronauta'].includes(meioEscolhido);
    const somDoMeio = meioEscolhido === 'draisina' ? 'rodas' : (semMotor ? 'passos' : 'motor');

    // ------------------------------------------------------------------ espelhos
    const espelhoMundo = espelharObjeto3D(B, cena, raiz, noMundo, { pixelRatio });
    const espelhoAvatar = espelharObjeto3D(B, cena, avatar.grupo, avatarNo, { pixelRatio });
    let relogioVarredura = 0;

    const flutuacao = aereo || espacial ? { vel: 1.4, amp: 0.07 } : { vel: 2.1, amp: (gelo || ferrovia) ? 0.008 : 0.035 };

    return {
        /** Base do portao do cenario (boias, nuvens, bandeiras, balizas...): entra como filha do portao do Babylon. */
        basePortao(paiBabylon) {
            return espelharObjeto3D(B, cena, mundo3.basePortao(), paiBabylon, { pixelRatio });
        },
        info: avatar.info,
        meio: meioEscolhido,
        somDoMeio,
        nadando: Boolean(infoMeio.nadando),
        /** Altura do veiculo em relacao a pista (o barco flutua, a aeronave sobe e desce de leve). */
        alturaBase: (agoraSeg) => alturaConves + (reduzirMovimento ? 0 : Math.sin(agoraSeg * flutuacao.vel) * flutuacao.amp),
        /** Leve balanco lateral do veiculo. */
        balanco: (agoraSeg) => Math.sin(agoraSeg * 1.7) * 0.025,
        /** A pista (agua, nuvens, terra, neve ou chao do espaco) muda de cor com o clima. */
        aplicarClima(climaAtual) {
            const cor = rio ? climaAtual.agua : (aereo ? climaAtual.solo : (gelo ? climaAtual.neve : climaAtual.asfalto)); // trilhos e espaco usam a cor da rua

            estrada.material.color.set(cor.toHexString());
        },
        atualizar(dt, dz, ritmo, fase, vento, agoraSeg) {
            for (const item of movel) {
                item.obj.position.z += dz;

                if (item.obj.position.z - item.comprimento / 2 > Z_TRAS) {
                    item.obj.position.z -= PERIODO;
                }
            }

            if (!reduzirMovimento) {
                arvores.forEach((a, i) => { a.rotation.z = Math.sin(agoraSeg * 2.2 + i) * 0.1 * vento; });
            }

            // No barco ou no ar ninguem corre: o avatar fica sentado (ou pendurado) e quem se move e o veiculo.
            avatar.animar(fase, infoMeio.nadando ? ritmo : 0);
            veiculo.atualizar(dt, ritmo);
            peixes?.atualizar(dt, dz);
            passaros?.atualizar(dt, dz);
            nevasca?.atualizar(dt, dz);
            espacoVivo?.atualizar(dt, dz);

            // Modelos que terminam de baixar e chamas novas entram na arvore do three depois: acha de tempos em tempos.
            relogioVarredura += dt;

            if (relogioVarredura > 0.3) {
                relogioVarredura = 0;
                espelhoMundo.reescanear();
                espelhoAvatar.reescanear();
            }

            espelhoMundo.atualizar();
            espelhoAvatar.atualizar();
        },
        destruir() {
            espelhoMundo.destruir();
            espelhoAvatar.destruir();
            noMundo.dispose();
        },
    };
}
