/**
 * Painel de desempenho para testes (so aparece com `?fps=1` na URL): quadros por segundo, chamadas de desenho e
 * triangulos da ultima cena. Serve para medir no celular se os modelos 3D pesam. Nao afeta o jogo.
 */
export function criarPainelDesempenho(renderer, parent) {
    if (typeof location === 'undefined' || !new URLSearchParams(location.search).has('fps')) {
        return null;
    }

    const caixa = document.createElement('div');
    caixa.setAttribute('aria-hidden', 'true');
    caixa.style.cssText = 'position:absolute;left:8px;bottom:8px;z-index:30;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.65);color:#9fe3ff;font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;pointer-events:none;white-space:pre';
    parent.appendChild(caixa);

    let quadros = 0;
    let acumulado = 0;

    return {
        atualizar(dt) {
            quadros++;
            acumulado += dt;

            if (acumulado < 0.5) {
                return;
            }

            const { render, memory } = renderer.info;
            caixa.textContent = `${Math.round(quadros / acumulado)} fps\n${render.calls} chamadas\n${(render.triangles / 1000).toFixed(1)} mil triangulos\n${memory.geometries} geometrias / ${memory.textures} texturas`;
            quadros = 0;
            acumulado = 0;
        },
    };
}
