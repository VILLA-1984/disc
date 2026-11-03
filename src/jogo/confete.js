/**
 * Chuva curta de confete sobre um elemento, para a revelacao do animal. Um canvas so, por cima de tudo e sem receber
 * toques; apaga a si mesmo quando o confete termina (ou quando o elemento sai da tela). Quem prefere menos movimento
 * nao chama esta funcao.
 */
export function soltarConfete(pai, cores, { quantidade = 90, duracao = 2800 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:40;pointer-events:none';
    pai.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const largura = Math.max(1, pai.clientWidth);
    const altura = Math.max(1, pai.clientHeight);
    canvas.width = largura * ratio;
    canvas.height = altura * ratio;
    ctx.scale(ratio, ratio);

    const pecas = Array.from({ length: quantidade }, (_, i) => ({
        x: largura * (0.15 + Math.random() * 0.7),
        y: -20 - Math.random() * altura * 0.3,
        vx: (Math.random() - 0.5) * 180,
        vy: 120 + Math.random() * 160,
        giro: Math.random() * Math.PI * 2,
        vgiro: (Math.random() - 0.5) * 9,
        lado: 6 + Math.random() * 6,
        cor: cores[i % cores.length],
    }));

    const inicio = performance.now();
    let anterior = inicio;
    let quadro = 0;

    function desenhar(agora) {
        const dt = Math.min(0.05, (agora - anterior) / 1000);
        anterior = agora;
        const decorrido = agora - inicio;

        if (decorrido > duracao || !canvas.isConnected) {
            canvas.remove();

            return;
        }

        ctx.clearRect(0, 0, largura, altura);
        // Some aos poucos no ultimo terco, sem corte seco.
        ctx.globalAlpha = Math.min(1, (duracao - decorrido) / (duracao * 0.33));

        for (const p of pecas) {
            p.vy += 260 * dt;
            p.vx *= 1 - dt * 0.8;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.giro += p.vgiro * dt;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.giro);
            ctx.fillStyle = p.cor;
            // O "balanco" do papel: a largura oscila com o giro, como um confete de verdade.
            ctx.fillRect(-p.lado / 2, -p.lado / 4, p.lado, (p.lado / 2) * Math.abs(Math.cos(p.giro * 1.7)) + 1);
            ctx.restore();
        }

        quadro = requestAnimationFrame(desenhar);
    }

    quadro = requestAnimationFrame(desenhar);

    return () => {
        cancelAnimationFrame(quadro);
        canvas.remove();
    };
}
