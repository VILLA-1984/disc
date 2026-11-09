/**
 * Espelha em Babylon.js um objeto 3D montado em three.js (THREE.Group com malhas), sem refazer o desenho: os avatares
 * (avatars.js: pessoas, moto, taxi, cadeiras, andador...), os veiculos e os cenarios do rio, do ceu, da neve, dos trilhos
 * e do espaco (cenarios.js, espaco.js) continuam sendo construidos e animados pelo three.js (so na memoria, sem
 * renderizador) e este modulo copia a forma e, a cada quadro, as posicoes, rotacoes, cores e visibilidade para os objetos
 * do Babylon.
 *
 * O three.js e "mao direita" (a camera olha para -z); o Babylon do jogo e "mao esquerda" (camera olha para +z). A troca
 * e um espelho em z: a geometria ganha z invertido (isso ja inverte o giro dos triangulos, sem trocar a ordem dos vertices); posicao e z invertidos e a
 * rotacao (quaternio x, y, z, w) vira (-x, -y, z, w); a escala nao muda. A ordem dos triangulos nao precisa trocar.
 *
 * Entende: malhas (qualquer geometria; materiais Lambert, Basic e Standard, com cor, mapa de textura, transparencia, dois
 * lados, mistura aditiva, sem nevoa e sem escrita de profundidade), grupos, sprites (vira plano sempre de frente para a
 * camera), pontos (estrelas, flocos de neve; com cor por ponto) e linhas soltas. Posicoes de pontos e de linhas que mudam
 * sao copiadas quando o three marca a mudanca. Objetos que entram na arvore depois (modelos glTF que terminam de baixar,
 * chamas dos motores) sao achados por `reescanear()`.
 */

/**
 * @param {object} B espaco BABYLON
 * @param {object} cena BABYLON.Scene
 * @param {object} raiz THREE.Object3D (normalmente um Group) a espelhar
 * @param {object} pai no do Babylon que recebe o espelho
 * @param {{pixelRatio?: number}} [opcoes] `pixelRatio`: tamanho dos pontos (em pixels de tela) acompanha a resolucao
 * @returns {{no: object, atualizar: () => void, reescanear: () => void, destruir: () => void}}
 */
export function espelharObjeto3D(B, cena, raiz, pai, { pixelRatio = 1 } = {}) {
    const materiais = new Map(); // uuid do material three -> { o, m, aceso, hex, opacidade }
    const texturas = new Map();
    const modelos = new Map(); // `${geometria}|${material}` -> malha-modelo escondida (as malhas espelhadas sao instancias dela)
    const geometrias = new Map();
    const pares = new Map(); // objeto three -> { origem, no, visivel, tipo, ... }

    const corDe = (c) => B.Color3.FromHexString(`#${c.getHexString()}`);

    function textura(mapa) {
        if (texturas.has(mapa.uuid)) {
            return texturas.get(mapa.uuid);
        }

        const imagem = mapa.image;
        const largura = imagem.width || 4;
        const altura = imagem.height || 4;
        const invertido = mapa.flipY !== false; // canvas: o three vira a imagem; glTF: nao
        const t = new B.DynamicTexture('espelho', { width: largura, height: altura }, cena, true, undefined, undefined, invertido);
        t.getContext().drawImage(imagem, 0, 0, largura, altura);
        t.hasAlpha = true;
        t.update(invertido);
        texturas.set(mapa.uuid, t);

        return t;
    }

    function material(o) {
        const feito = materiais.get(o.uuid);

        if (feito) {
            return feito.m;
        }

        const m = new B.StandardMaterial(o.name || 'espelho', cena);
        const aceso = Boolean(o.isMeshBasicMaterial || o.isSpriteMaterial || o.isPointsMaterial || o.isLineBasicMaterial);
        const cor = o.color ? corDe(o.color) : new B.Color3(1, 1, 1);
        const mapa = o.map?.image ? textura(o.map) : null;
        m.specularColor = new B.Color3(0, 0, 0);

        if (mapa) {
            m.diffuseTexture = mapa;
        }

        if (aceso) {
            m.disableLighting = true;
            m.diffuseColor = new B.Color3(0, 0, 0);
            m.emissiveColor = cor; // sem luz: a cor (ou o tom do mapa) aparece como e
        } else {
            m.diffuseColor = cor;

            if (o.emissive) {
                m.emissiveColor = corDe(o.emissive);
            }
        }

        if (o.transparent) {
            m.alpha = o.opacity;

            if (mapa) {
                m.useAlphaFromDiffuseTexture = true;
            }
        }

        if (o.blending === 2) { // AdditiveBlending: soma luz ao fundo
            m.alphaMode = B.Engine.ALPHA_ADD;
        }

        if (o.depthWrite === false) {
            m.disableDepthWrite = true;
        }

        if (o.fog === false) {
            m.fogEnabled = false;
        }

        // Dois lados: sem descarte de faces. Um lado so: o espelho em z inverteu a ordem dos triangulos (tratada abaixo).
        m.backFaceCulling = o.side !== 2 && !o.isSpriteMaterial;

        if (o.isPointsMaterial) {
            m.pointsCloud = true;
            m.pointSize = Math.max(1, (o.sizeAttenuation === false ? o.size : o.size * 30) * pixelRatio);
        }

        if (o.isSpriteMaterial || o.isPointsMaterial) {
            m.metadata = { semCurva: true }; // fundo distante (nuvens, estrelas): no three.js tambem nao curva
        }

        materiais.set(o.uuid, { o, m, aceso, hex: o.color ? o.color.getHex() : 0, opacidade: o.opacity });

        return m;
    }

    const materialDe = (origem) => (Array.isArray(origem.material) ? origem.material[0] : origem.material);

    function dadosDe(geo) {
        let dados = geometrias.get(geo.uuid);

        if (dados) {
            return dados;
        }

        const posicao = geo.getAttribute('position');
        const normal = geo.getAttribute('normal');
        const uv = geo.getAttribute('uv');
        const cor = geo.getAttribute('color');
        const indice = geo.getIndex();
        const posicoes = new Float32Array(posicao.count * 3);
        const normais = normal ? new Float32Array(posicao.count * 3) : null;

        for (let i = 0; i < posicao.count; i++) {
            posicoes.set([posicao.getX(i), posicao.getY(i), -posicao.getZ(i)], i * 3);
            normais?.set([normal.getX(i), normal.getY(i), -normal.getZ(i)], i * 3);
        }

        const lista = indice ? Array.from(indice.array) : Array.from({ length: posicao.count }, (_, i) => i);

        // Nao troca a ordem dos vertices: o espelho em z ja inverte o giro dos triangulos (anti-horario no three vira horario
        // aqui), que e justamente o lado "da frente" no Babylon de mao esquerda.
        const vd = new B.VertexData();
        vd.positions = posicoes;
        vd.indices = lista;

        if (normais) {
            vd.normals = normais;
        }

        if (uv) {
            vd.uvs = Float32Array.from(uv.array);
        }

        if (cor) {
            const rgba = new Float32Array(posicao.count * 4);

            for (let i = 0; i < posicao.count; i++) {
                rgba.set([cor.getX(i), cor.getY(i), cor.getZ(i), 1], i * 4);
            }

            vd.colors = rgba;
        }

        geometrias.set(geo.uuid, vd);

        return vd;
    }

    function malhaDe(origem) {
        const geo = origem.geometry;
        const mat = materialDe(origem);
        const chave = `${geo.uuid}|${mat.uuid}`;
        let modelo = modelos.get(chave);

        if (!modelo) {
            modelo = new B.Mesh(origem.name || 'modelo', cena);
            dadosDe(geo).applyToMesh(modelo);

            modelo.material = material(mat);
            modelo.isVisible = false;
            modelo.isPickable = false;

            if (mat.flatShading) {
                modelo.convertToFlatShadedMesh(); // rochas de faces chapadas
            }

            modelos.set(chave, modelo);
        }

        const malha = modelo.createInstance(origem.name || 'espelho');
        malha.isPickable = false;

        return malha;
    }

    function pontosDe(origem, linhas) {
        const geo = origem.geometry;
        const posicao = geo.getAttribute('position');
        const n = posicao.count;
        const buf = new Float32Array(n * 3);
        const vd = new B.VertexData();
        const cor = geo.getAttribute('color');

        for (let i = 0; i < n; i++) {
            buf.set([posicao.getX(i), posicao.getY(i), -posicao.getZ(i)], i * 3);
        }

        vd.positions = buf;
        vd.indices = Array.from({ length: n }, (_, i) => i);

        if (cor) {
            const rgba = new Float32Array(n * 4);

            for (let i = 0; i < n; i++) {
                rgba.set([cor.getX(i), cor.getY(i), cor.getZ(i), 1], i * 4);
            }

            vd.colors = rgba;
        }

        const malha = linhas ? new B.LinesMesh(origem.name || 'linhas', cena) : new B.Mesh(origem.name || 'pontos', cena);
        vd.applyToMesh(malha, true);
        malha.isPickable = false;
        malha.alwaysSelectAsActiveMesh = true; // as posicoes mudam: a caixa da forma inicial nao vale

        if (linhas) {
            malha.color = corDe(origem.material.color);
            malha.alpha = origem.material.transparent ? origem.material.opacity : 1;
        } else {
            malha.material = material(origem.material);
        }

        return { malha, buf, versao: posicao.version };
    }

    function spriteDe(origem) {
        const plano = B.MeshBuilder.CreatePlane(origem.name || 'sprite', { size: 1 }, cena);
        plano.material = material(origem.material);
        plano.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
        plano.isPickable = false;

        return plano;
    }

    function criar(origem, paiBabylon) {
        let tipo = 'no';
        let extra = {};
        let no;

        if (origem.isSprite) {
            tipo = 'sprite';
            no = spriteDe(origem);
        } else if (origem.isPoints || origem.isLine) {
            tipo = origem.isPoints ? 'pontos' : 'linhas';
            const feito = pontosDe(origem, !origem.isPoints);
            no = feito.malha;
            extra = { buf: feito.buf, versao: feito.versao };
        } else if (origem.isMesh) {
            tipo = 'malha';
            no = malhaDe(origem);
        } else {
            no = new B.TransformNode(origem.name || 'espelho', cena);
        }

        no.parent = paiBabylon;
        no.rotationQuaternion = new B.Quaternion();
        pares.set(origem, { origem, no, visivel: true, tipo, ...extra });

        for (const filho of origem.children) {
            criar(filho, no);
        }

        return no;
    }

    const noRaiz = criar(raiz, pai);

    function sincronizarArvore(origem) {
        const pare = pares.get(origem).no;

        for (const filho of origem.children) {
            if (pares.has(filho)) {
                sincronizarArvore(filho);
            } else {
                criar(filho, pare);
            }
        }
    }

    /** Acha o que entrou na arvore do three depois (modelos que terminaram de baixar, chamas novas) e tira o que saiu. */
    function reescanear() {
        const saiu = [];

        for (const origem of pares.keys()) {
            let topo = origem;

            while (topo.parent) {
                topo = topo.parent;
            }

            if (topo !== raiz) {
                saiu.push(origem);
            }
        }

        for (const origem of saiu) {
            const p = pares.get(origem);
            pares.delete(origem);

            if (p && !p.no.isDisposed()) {
                p.no.dispose();
            }
        }

        sincronizarArvore(raiz);
    }

    function atualizar() {
        for (const p of pares.values()) {
            const { origem, no } = p;
            no.position.set(origem.position.x, origem.position.y, -origem.position.z);
            no.rotationQuaternion.set(-origem.quaternion.x, -origem.quaternion.y, origem.quaternion.z, origem.quaternion.w);
            no.scaling.set(origem.scale.x, origem.scale.y, p.tipo === 'sprite' ? 1 : origem.scale.z);

            if (p.visivel !== origem.visible) {
                p.visivel = origem.visible;
                no.setEnabled(origem.visible);
            }

            if (p.buf) {
                const atributo = origem.geometry.getAttribute('position');

                if (atributo.version !== p.versao) {
                    p.versao = atributo.version;

                    for (let i = 0; i < atributo.count; i++) {
                        p.buf[i * 3] = atributo.getX(i);
                        p.buf[i * 3 + 1] = atributo.getY(i);
                        p.buf[i * 3 + 2] = -atributo.getZ(i);
                    }

                    no.updateVerticesData(B.VertexBuffer.PositionKind, p.buf);
                }

                if (p.tipo === 'linhas') {
                    no.alpha = origem.material.transparent ? origem.material.opacity : 1;
                }
            }
        }

        // Cores e opacidades que o jogo muda ao longo do tempo (clima, nuvens, chamas).
        for (const e of materiais.values()) {
            const { o } = e;
            const hex = o.color ? o.color.getHex() : 0;

            if (hex !== e.hex) {
                e.hex = hex;

                if (e.aceso) {
                    e.m.emissiveColor = corDe(o.color);
                } else {
                    e.m.diffuseColor = corDe(o.color);
                }
            }

            if (o.transparent && o.opacity !== e.opacidade) {
                e.opacidade = o.opacity;
                e.m.alpha = o.opacity;
            }
        }
    }

    atualizar();

    return {
        no: noRaiz,
        atualizar,
        reescanear,
        destruir() {
            for (const p of pares.values()) {
                if (!p.no.isDisposed()) {
                    p.no.dispose();
                }
            }

            pares.clear();
            modelos.forEach((m) => m.dispose());
            materiais.forEach((e) => e.m.dispose());
            texturas.forEach((t) => t.dispose());
        },
    };
}
