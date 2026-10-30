import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Modelos 3D prontos (glTF, CC0) usados no piloto do Next: entram de forma assincrona por cima do veiculo feito em
 * codigo, que continua sendo o plano B (sem rede, arquivo ausente ou `?modelos=0` na URL).
 */
const carregador = new GLTFLoader();
const emCache = new Map();

/** Falso so com `?modelos=0` na URL (para comparar com os veiculos feitos em codigo). */
export const modelosLigados = () => typeof location === 'undefined' || new URLSearchParams(location.search).get('modelos') !== '0';

/** Carrega (uma vez) o glTF e devolve um clone novo da cena a cada chamada. */
export function carregarModelo(url) {
    if (!emCache.has(url)) {
        emCache.set(url, carregador.loadAsync(url).then((gltf) => gltf.scene));
    }

    return emCache.get(url).then((cena) => cena.clone(true));
}

/**
 * Gira o modelo (os do Kenney e do Quaternius olham para +z; o jogo anda para -z), dimensiona pela largura (eixo x),
 * centraliza em x e z e fixa a altura pelo `topo` (parte de cima) ou pelo `fundo` (parte de baixo). `cabineZ` desloca
 * o modelo para a cabine (que fica atras do centro) cair na origem, onde o avatar fica.
 *
 * @returns {{grupo: THREE.Group, escala: number, tamanho: THREE.Vector3}} `tamanho` ja vem na escala final.
 */
export function encaixarModelo(cena, { largura, topo, fundo, cabineZ = 0 }) {
    const pivo = new THREE.Group();
    pivo.rotation.y = Math.PI;
    pivo.add(cena);
    pivo.updateMatrixWorld(true);

    const caixa = new THREE.Box3().setFromObject(pivo);
    const tamanho = caixa.getSize(new THREE.Vector3());
    const centro = caixa.getCenter(new THREE.Vector3());
    const escala = largura / tamanho.x;
    const y = topo !== undefined ? topo - caixa.max.y * escala : fundo - caixa.min.y * escala;
    const grupo = new THREE.Group();
    grupo.scale.setScalar(escala);
    grupo.position.set(-centro.x * escala, y, -centro.z * escala - cabineZ);
    grupo.add(pivo);

    return { grupo, escala, tamanho: tamanho.multiplyScalar(escala) };
}
