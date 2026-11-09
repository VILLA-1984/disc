/**
 * Espelha em Babylon.js um objeto 3D montado em three.js (THREE.Group com malhas), sem refazer o desenho: os avatares
 * de formas simples (avatars.js: pessoas, moto, taxi, cadeiras, andador...) e os animais montados no codigo continuam
 * sendo construidos e animados pelo three.js (so na memoria, sem renderizador) e este modulo copia a forma e, a cada
 * quadro, as posicoes e rotacoes para os objetos do Babylon.
 *
 * O three.js e "mao direita" (a camera olha para -z); o Babylon do jogo e "mao esquerda" (camera olha para +z). A troca
 * e um espelho em z: a geometria ganha z invertido e a ordem dos triangulos troca; posicao e z invertidos e a
 * rotacao (quaternio x, y, z, w) vira (-x, -y, z, w); a escala nao muda.
 *
 * So entende o que os avatares usam: malhas (qualquer geometria) com MeshLambertMaterial ou MeshBasicMaterial
 * (cor, transparencia, dois lados) e grupos.
 */

/**
 * @param {object} B espaco BABYLON
 * @param {object} cena BABYLON.Scene
 * @param {object} raiz THREE.Object3D (normalmente um Group) a espelhar
 * @param {object} pai no do Babylon que recebe o espelho
 * @returns {{no: object, atualizar: () => void, destruir: () => void}}
 */
export function espelharObjeto3D(B, cena, raiz, pai) {
    const materiais = new Map();
    const pares = [];
    const geometrias = new Map();

    function material(origem) {
        if (materiais.has(origem.uuid)) {
            return materiais.get(origem.uuid);
        }

        const m = new B.StandardMaterial(origem.name || 'espelho', cena);
        const cor = B.Color3.FromHexString(`#${origem.color.getHexString()}`);
        m.specularColor = new B.Color3(0, 0, 0);

        if (origem.isMeshBasicMaterial) {
            m.diffuseColor = new B.Color3(0, 0, 0);
            m.emissiveColor = cor;
            m.disableLighting = true;
        } else {
            m.diffuseColor = cor;

            if (origem.emissive) {
                m.emissiveColor = B.Color3.FromHexString(`#${origem.emissive.getHexString()}`);
            }
        }

        if (origem.transparent) {
            m.alpha = origem.opacity;
        }

        // Dois lados: sem descarte de faces. Um lado so: o espelho em z inverteu a ordem dos triangulos (tratada abaixo).
        m.backFaceCulling = origem.side !== 2;
        materiais.set(origem.uuid, m);

        return m;
    }

    function malhaDe(origem) {
        const geo = origem.geometry;
        const malha = new B.Mesh(origem.name || 'espelho', cena);
        let dados = geometrias.get(geo.uuid);

        if (!dados) {
            const posicao = geo.getAttribute('position');
            const normal = geo.getAttribute('normal');
            const uv = geo.getAttribute('uv');
            const indice = geo.getIndex();
            const posicoes = new Float32Array(posicao.count * 3);
            const normais = normal ? new Float32Array(posicao.count * 3) : null;

            for (let i = 0; i < posicao.count; i++) {
                posicoes.set([posicao.getX(i), posicao.getY(i), -posicao.getZ(i)], i * 3);
                normais?.set([normal.getX(i), normal.getY(i), -normal.getZ(i)], i * 3);
            }

            const lista = indice ? Array.from(indice.array) : Array.from({ length: posicao.count }, (_, i) => i);

            // Espelhar inverte a face dos triangulos: troca o segundo e o terceiro vertice.
            for (let i = 0; i + 2 < lista.length; i += 3) {
                [lista[i + 1], lista[i + 2]] = [lista[i + 2], lista[i + 1]];
            }

            const vd = new B.VertexData();
            vd.positions = posicoes;
            vd.indices = lista;

            if (normais) {
                vd.normals = normais;
            }

            if (uv) {
                vd.uvs = Float32Array.from(uv.array);
            }

            dados = vd;
            geometrias.set(geo.uuid, dados);
        }

        dados.applyToMesh(malha);
        malha.material = material(origem.material);
        malha.isPickable = false;

        return malha;
    }

    function criar(origem, paiBabylon) {
        const no = origem.isMesh ? malhaDe(origem) : new B.TransformNode(origem.name || 'espelho', cena);
        no.parent = paiBabylon;
        no.rotationQuaternion = new B.Quaternion();
        pares.push({ origem, no, visivel: true });

        for (const filho of origem.children) {
            criar(filho, no);
        }

        return no;
    }

    const noRaiz = criar(raiz, pai);

    function atualizar() {
        for (const p of pares) {
            const { origem, no } = p;
            no.position.set(origem.position.x, origem.position.y, -origem.position.z);
            no.rotationQuaternion.set(-origem.quaternion.x, -origem.quaternion.y, origem.quaternion.z, origem.quaternion.w);
            no.scaling.set(origem.scale.x, origem.scale.y, origem.scale.z);

            if (p.visivel !== origem.visible) {
                p.visivel = origem.visible;
                no.setEnabled(origem.visible);
            }
        }
    }

    atualizar();

    return {
        no: noRaiz,
        atualizar,
        destruir() {
            for (const p of pares) {
                p.no.dispose();
            }

            materiais.forEach((m) => m.dispose());
        },
    };
}
