import { ANIMAIS, ORDEM_FATORES, FATOR_ANIMAL, resolverAnimais } from './animals.js';
import { sons } from './audio.js';

/**
 * Relatorio gamificado do jogo: suspense, revelacao do animal com efeitos e som proprios, e depois
 * os cards com as caracteristicas. Usa os mesmos animais e textos do relatorio normal (animals.js);
 * aqui so ha a apresentacao animada. O relatorio dos analistas continua sendo o completo.
 *
 * Cuidados de acessibilidade: nada pisca mais de uma vez por segundo (os "clarões" sao suaves e
 * lentos); o botao "Reduzir efeitos" (ou a preferencia do sistema) desliga clarões, particulas e
 * movimento forte; "Pular animacao" leva direto aos cards; o resultado tambem e lido por leitores
 * de tela.
 */

const TEMAS = {
    lobo: { fundo: 'linear-gradient(180deg,#070f26 0%,#14275a 58%,#2a4586 100%)', cor: '#e3ecff', brilho: 'rgba(156,194,255,.85)', grito: 'AUUUUUU!', som: 'lobo', pulso: 'rgba(170,205,255,.55)' },
    tubarao: { fundo: 'linear-gradient(180deg,#0b3a63 0%,#0e6ea8 55%,#08284a 100%)', cor: '#e9f6ff', brilho: 'rgba(120,200,255,.8)', grito: 'DUN-DUN… DUN-DUN!', som: 'tubarao', pulso: 'rgba(227,73,72,.45)' },
    aguia: { fundo: 'linear-gradient(180deg,#ff9f43 0%,#ffe0a0 42%,#bfe3ff 100%)', cor: '#5a3a12', brilho: 'rgba(255,215,120,.95)', grito: 'SKREEEEE!', gritoCor: '#7a3d00', som: 'aguia', pulso: 'rgba(255,230,150,.7)' },
    gato: { fundo: 'linear-gradient(180deg,#14543d 0%,#2e9e6b 55%,#bde8d0 100%)', cor: '#ffffff', brilho: 'rgba(200,255,225,.85)', grito: 'MIAU… prrrr', som: 'gato', pulso: 'rgba(220,255,235,.5)' },
    equilibrio: { fundo: 'linear-gradient(135deg,#3b2a7a 0%,#1f6fb8 55%,#1f8aa8 100%)', cor: '#ffffff', brilho: 'rgba(200,220,255,.8)', grito: 'Os quatro!', som: 'equilibrio', pulso: 'rgba(200,220,255,.45)' },
};

const CSS = `
.rel{position:absolute;inset:0;z-index:8;overflow:hidden;color:#fff;font-family:system-ui,"Segoe UI",sans-serif;background:#0d2b4e}
.rel *{box-sizing:border-box}
.rel-fundo{position:absolute;inset:0;background:var(--fundo)}
.rel-fundo>*{position:absolute}
.rel-pulso{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 46%,var(--pulso) 0%,transparent 68%)}
.rel.revelado .rel-pulso{animation:rel-pulso 1.3s ease-out 3 .25s}
.rel-aneis{position:absolute;left:50%;top:44%;width:0;height:0;pointer-events:none}
.rel-aneis i{position:absolute;left:0;top:0;width:min(46vmin,420px);height:min(46vmin,420px);border-radius:50%;border:3px solid var(--brilho);opacity:0}
.rel.revelado .rel-aneis i{animation:rel-anel 2.4s ease-out 2}
.rel.revelado .rel-aneis i:nth-child(2){animation-delay:.6s}
.rel.revelado .rel-aneis i:nth-child(3){animation-delay:1.2s}
.rel-palco{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:inset .9s cubic-bezier(.5,0,.2,1),width .9s,height .9s}
.rel-suspense{position:absolute;font-size:clamp(1.2rem,3.6vmin,2rem);font-weight:600;letter-spacing:.02em;text-shadow:0 2px 12px rgba(0,0,0,.35);transition:opacity .4s}
.rel-suspense span{animation:rel-ponto 1.2s infinite}
.rel-suspense span:nth-child(2){animation-delay:.2s}
.rel-suspense span:nth-child(3){animation-delay:.4s}
.rel.revelado .rel-suspense{opacity:0}
.rel-dupla{display:flex;align-items:flex-end;justify-content:center;gap:3%;opacity:0;transform:scale(.3);width:92%}
.rel.revelado .rel-dupla{animation:rel-entrada 1.1s cubic-bezier(.2,1.3,.4,1) forwards}
.rel--aguia.revelado .rel-dupla{animation:rel-mergulho 1.5s cubic-bezier(.2,.9,.3,1) forwards}
.rel-animal{width:min(40vmin,330px);color:var(--cor);filter:drop-shadow(0 0 24px var(--brilho));animation:rel-flutua 3.4s ease-in-out infinite}
.rel-animal svg{display:block;width:100%;height:auto}
.rel--gato .rel-animal{animation:rel-respira 2.6s ease-in-out infinite}
.rel-avatar{height:min(46vmin,360px);width:auto;filter:drop-shadow(0 8px 14px rgba(0,0,0,.28))}
.rel-secundario{width:min(14vmin,110px);color:var(--cor-sec,#fff);opacity:.9;filter:drop-shadow(0 0 10px var(--brilho));align-self:flex-start;margin-top:6%}
.rel-secundario svg{display:block;width:100%;height:auto}
.rel-grito{position:absolute;left:50%;top:10%;transform:translate(-50%,0);font-size:clamp(1.6rem,6.5vmin,3.4rem);font-weight:800;letter-spacing:.04em;white-space:nowrap;color:var(--grito,#fff);text-shadow:0 3px 0 rgba(0,0,0,.25),0 0 22px var(--brilho);opacity:0;pointer-events:none}
.rel.revelado .rel-grito{animation:rel-grito 2.6s ease-out .55s forwards}
.rel-orbita{position:relative;width:min(56vmin,420px);height:min(56vmin,420px);animation:rel-gira 16s linear infinite}
.rel-orbita div{position:absolute;width:34%;left:33%;top:33%;filter:drop-shadow(0 0 14px var(--brilho))}
.rel-orbita div svg{display:block;width:100%}
.rel-orbita div:nth-child(1){transform:translate(0,-135%)}
.rel-orbita div:nth-child(2){transform:translate(135%,0)}
.rel-orbita div:nth-child(3){transform:translate(0,135%)}
.rel-orbita div:nth-child(4){transform:translate(-135%,0)}

.rel-conteudo{position:absolute;inset:0 0 0 42%;overflow:auto;padding:22px 24px 80px;opacity:0;transform:translateY(24px);pointer-events:none;transition:opacity .8s .5s,transform .8s .5s;color:#0f1f33}
.rel.com-conteudo .rel-palco{inset:0 auto 0 0;width:42%}
.rel.com-conteudo .rel-conteudo{opacity:1;transform:none;pointer-events:auto}
.rel.com-conteudo .rel-grito{display:none}
.rel.com-conteudo .rel-dupla{width:96%}
.rel-cartao{background:rgba(255,255,255,.95);border-radius:16px;padding:18px 20px;margin-bottom:14px;box-shadow:0 10px 30px rgba(0,0,0,.18)}
.rel-cartao h2{margin:2px 0 6px;font-size:clamp(1.4rem,3.4vmin,2rem);font-weight:700;line-height:1.15}
.rel-cartao h3{margin:0 0 6px;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:#5b6b7f}
.rel-cartao p{margin:0 0 8px;line-height:1.5;color:#2c3d52}
.rel-slogan{font-style:italic;color:#0d2b4e!important;font-size:1.05rem}
.rel-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 6px;border-radius:999px;background:#eef3fa;font-weight:600;font-size:.9rem}
.rel-chip svg{width:20px;height:20px}
.rel-duplo{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rel-bloco{border-radius:12px;padding:12px 14px;background:#f4f8fd}
.rel-bloco.forte{background:#e9f7ef}
.rel-bloco.atencao{background:#fff3e6}
.rel-barra{display:grid;grid-template-columns:26px 74px 1fr 44px;align-items:center;gap:8px;margin:7px 0;font-size:.9rem;color:#2c3d52}
.rel-barra svg{width:24px;height:24px}
.rel-trilho{position:relative;height:12px;border-radius:99px;background:#e6edf6}
.rel-trilho b{position:absolute;left:0;top:0;bottom:0;border-radius:99px;transition:width 1.1s .3s}
.rel-trilho u{position:absolute;top:-4px;bottom:-4px;width:3px;background:#0d2b4e;border-radius:2px;text-decoration:none}
.rel-barra-val{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.rel-legenda{font-size:.78rem;color:#5b6b7f!important}
.rel-aviso p{font-size:.85rem;color:#44566d}
.rel-botoes{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.rel-botoes button,.rel-controles button{font:inherit;font-weight:600;border-radius:10px;cursor:pointer;padding:11px 20px;border:0}
.rel-botoes button{background:#1f6fb8;color:#fff}
.rel-botoes button:hover{background:#185a98}
.rel-controles{position:absolute;left:12px;top:12px;display:flex;gap:8px;z-index:3}
.rel-cartao h2:focus{outline:none}
.rel.com-conteudo .rel-dupla{flex-direction:column;align-items:center;gap:3%}
.rel.com-conteudo .rel-animal{width:min(28vmin,230px)}
.rel.com-conteudo .rel-avatar{height:min(36vmin,320px)}
.rel.com-conteudo .rel-secundario{align-self:center;width:min(11vmin,84px);margin-top:0}
.rel-orbita div svg{animation:rel-gira 16s linear infinite reverse}
.rel-controles button{background:rgba(13,43,78,.7);color:#fff;font-size:.8rem;padding:7px 12px}
.rel-controles button[aria-pressed=true]{background:#f08a3c}
.rel button:focus-visible{outline:3px solid #f08a3c;outline-offset:2px}
.rel-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* temas */
.rel-estrelas i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:rel-estrela 3s ease-in-out infinite}
.rel-lua{right:9%;top:8%;width:min(20vmin,170px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 38% 36%,#fffbe6,#f4e8b6 62%,#d9c98f);box-shadow:0 0 60px 20px rgba(255,248,210,.35)}
.rel-ondas{left:0;right:0;bottom:0;height:34%;overflow:hidden}
.rel-ondas svg{position:absolute;bottom:0;left:0;width:200%;height:100%;animation:rel-onda 9s linear infinite}
.rel-ondas svg+svg{animation-duration:14s;animation-direction:reverse;opacity:.7}
.rel-bolhas i{position:absolute;bottom:-10%;border-radius:50%;border:2px solid rgba(255,255,255,.7);background:rgba(255,255,255,.12);animation:rel-bolha 6s linear infinite}
.rel-nadadeira{left:-30%;top:58%;width:20%;color:#0a2e4f;opacity:0}
.rel.revelado .rel-nadadeira{animation:rel-nadadeira 3.2s linear 1}
.rel-nadadeira svg{display:block;width:100%}
.rel-sol{left:50%;top:16%;width:min(42vmin,340px);aspect-ratio:1;border-radius:50%;transform:translateX(-50%);background:radial-gradient(circle,rgba(255,244,196,.95),rgba(255,214,120,.45) 55%,transparent 72%)}
.rel-nuvem{height:9%;border-radius:99px;background:rgba(255,255,255,.85);filter:blur(1px);animation:rel-nuvem linear infinite}
.rel-nuvem::before{content:"";position:absolute;left:18%;top:-70%;width:38%;height:160%;border-radius:50%;background:inherit}
.rel-nuvem::after{content:"";position:absolute;left:46%;top:-45%;width:30%;height:130%;border-radius:50%;background:inherit}
.rel-penas i{position:absolute;top:-8%;width:12px;height:26px;border-radius:50% 50% 50% 50%/70% 70% 30% 30%;background:#b9824a;animation:rel-pena 6s linear infinite}
.rel-patas svg{position:absolute;width:44px;fill:rgba(255,255,255,.55);opacity:0;animation:rel-pata 6s ease-in-out infinite}
.rel-coracoes svg{position:absolute;bottom:-10%;width:26px;fill:rgba(255,200,220,.85);animation:rel-bolha 7s linear infinite}
.rel-aura{inset:0;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.18),transparent 60%)}

/* modo calmo: sem clarões, sem particulas, movimento minimo */
.rel--calmo .rel-pulso,.rel--calmo .rel-aneis,.rel--calmo .rel-nadadeira,.rel--calmo .rel-bolhas,.rel--calmo .rel-penas,.rel--calmo .rel-patas,.rel--calmo .rel-coracoes,.rel--calmo .rel-estrelas i,.rel--calmo .rel-orbita,.rel--calmo .rel-orbita div svg{animation:none!important}
.rel--calmo .rel-pulso,.rel--calmo .rel-aneis,.rel--calmo .rel-nadadeira,.rel--calmo .rel-bolhas,.rel--calmo .rel-penas,.rel--calmo .rel-patas,.rel--calmo .rel-coracoes{display:none}
.rel--calmo .rel-animal{animation:none}
.rel--calmo.revelado .rel-dupla,.rel--calmo.revelado.rel--aguia .rel-dupla{animation:rel-fade .6s forwards}
.rel--calmo.revelado .rel-grito{animation:rel-fade 1s forwards}
.rel--calmo .rel-ondas svg,.rel--calmo .rel-nuvem{animation:none}

@keyframes rel-entrada{0%{opacity:0;transform:scale(.3) translateY(60px)}60%{opacity:1;transform:scale(1.07)}100%{opacity:1;transform:scale(1)}}
@keyframes rel-mergulho{0%{opacity:0;transform:translate(46%,-70%) rotate(18deg) scale(.4)}35%{opacity:1}100%{opacity:1;transform:none}}
@keyframes rel-fade{from{opacity:0;transform:none}to{opacity:1;transform:none}}
@keyframes rel-flutua{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes rel-respira{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
@keyframes rel-pulso{0%{opacity:0}35%{opacity:1}100%{opacity:0}}
@keyframes rel-anel{0%{transform:translate(-50%,-50%) scale(.2);opacity:.75}100%{transform:translate(-50%,-50%) scale(2.6);opacity:0}}
@keyframes rel-grito{0%{opacity:0;transform:translate(-50%,0) scale(.4)}18%{opacity:1;transform:translate(-50%,0) scale(1.14)}65%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-26px) scale(1.04)}}
@keyframes rel-ponto{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes rel-estrela{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes rel-onda{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes rel-bolha{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:.85}100%{transform:translateY(-95vh) scale(1.1);opacity:0}}
@keyframes rel-nadadeira{0%{left:-30%;opacity:1}90%{opacity:1}100%{left:125%;opacity:0}}
@keyframes rel-nuvem{from{transform:translateX(-30vw)}to{transform:translateX(130vw)}}
@keyframes rel-pena{0%{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:1}50%{transform:translate(40px,55vh) rotate(160deg)}100%{transform:translate(-20px,108vh) rotate(320deg);opacity:.9}}
@keyframes rel-pata{0%,100%{opacity:0}20%,60%{opacity:1}}
@keyframes rel-gira{to{transform:rotate(360deg)}}

@media (max-width:760px){
.rel.com-conteudo .rel-palco{inset:0 0 auto 0;width:auto;height:36%}
.rel-conteudo{inset:36% 0 0 0;padding:14px 14px 80px}
.rel-duplo{grid-template-columns:1fr}
.rel-barra{grid-template-columns:24px 64px 1fr 40px}
.rel-animal{width:min(30vmin,200px)}
.rel-avatar{height:min(34vmin,220px)}
.rel.com-conteudo .rel-dupla{flex-direction:row;align-items:flex-end;gap:4%}
.rel.com-conteudo .rel-animal{width:min(24vmin,150px)}
.rel.com-conteudo .rel-avatar{height:min(30vmin,190px)}
}
`;

let estiloInjetado = false;

function injetarEstilo() {
    if (estiloInjetado) {
        return;
    }

    const estilo = document.createElement('style');
    estilo.textContent = CSS;
    document.head.appendChild(estilo);
    estiloInjetado = true;
}

const svgAnimal = (animal) => `<svg viewBox="0 0 512 512" aria-hidden="true" fill="currentColor"><path d="${animal.svgPath}"/></svg>`;

const aleatorio = (min, max) => (min + Math.random() * (max - min)).toFixed(1);

/** Camadas de fundo e particulas de cada tema. */
function camadasDoTema(chave) {
    switch (chave) {
        case 'lobo':
            return `<div class="rel-lua"></div><div class="rel-estrelas">${Array.from({ length: 48 }, () => `<i style="left:${aleatorio(0, 100)}%;top:${aleatorio(0, 70)}%;animation-delay:${aleatorio(0, 3)}s;width:${aleatorio(2, 4)}px;height:${aleatorio(2, 4)}px"></i>`).join('')}</div>`;
        case 'tubarao': {
            const onda = (cor) => `<svg viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><path fill="${cor}" d="M0 60 Q150 10 300 60 T600 60 T900 60 T1200 60 V120 H0 Z"/></svg>`;

            return `<div class="rel-bolhas">${Array.from({ length: 18 }, () => { const t = aleatorio(10, 30); return `<i style="left:${aleatorio(2, 96)}%;width:${t}px;height:${t}px;animation-delay:${aleatorio(0, 6)}s;animation-duration:${aleatorio(5, 9)}s"></i>`; }).join('')}</div>
                <div class="rel-ondas">${onda('rgba(8,40,74,.75)')}${onda('rgba(14,110,168,.6)')}</div>
                <div class="rel-nadadeira">${svgAnimal(ANIMAIS.tubarao)}</div>`;
        }
        case 'aguia':
            return `<div class="rel-sol"></div>
                <div class="rel-nuvem" style="top:14%;left:0;width:22%;animation-duration:38s"></div>
                <div class="rel-nuvem" style="top:34%;left:0;width:28%;animation-duration:52s;animation-delay:-20s"></div>
                <div class="rel-nuvem" style="top:60%;left:0;width:20%;animation-duration:44s;animation-delay:-8s"></div>
                <div class="rel-penas">${Array.from({ length: 12 }, () => `<i style="left:${aleatorio(4, 96)}%;animation-delay:${aleatorio(0.5, 6)}s;animation-duration:${aleatorio(5, 9)}s"></i>`).join('')}</div>`;
        case 'gato': {
            const pata = '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="43" rx="15" ry="12"/><ellipse cx="12" cy="27" rx="6.5" ry="9"/><ellipse cx="25" cy="15" rx="6.5" ry="9"/><ellipse cx="39" cy="15" rx="6.5" ry="9"/><ellipse cx="52" cy="27" rx="6.5" ry="9"/></svg>';
            const coracao = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.4-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.6-8 11-8 11z"/></svg>';

            return `<div class="rel-patas">${Array.from({ length: 7 }, (_, i) => pata.replace('<svg', `<svg style="left:${6 + i * 13}%;top:${78 - i * 9}%;animation-delay:${i * 0.55}s;transform:rotate(${20 + (i % 2) * -20}deg)"`)).join('')}</div>
                <div class="rel-coracoes">${Array.from({ length: 10 }, () => coracao.replace('<svg', `<svg style="left:${aleatorio(4, 94)}%;animation-delay:${aleatorio(0, 7)}s;animation-duration:${aleatorio(6, 10)}s;width:${aleatorio(18, 34)}px"`)).join('')}</div>`;
        }
        default:
            return '<div class="rel-aura"></div>';
    }
}

function barras(natural, adaptado) {
    return ORDEM_FATORES.map((fator) => {
        const animal = ANIMAIS[FATOR_ANIMAL[fator]];
        const valor = Math.round(natural.percentual[fator] ?? 0);
        const marca = Math.round(adaptado.percentual[fator] ?? 0);

        return `<div class="rel-barra" style="color:#2c3d52">
            <span style="color:${animal.cor}">${svgAnimal(animal)}</span>
            <span>${animal.nome}</span>
            <div class="rel-trilho"><b style="width:${valor}%;background:${animal.cor}"></b><u style="left:calc(${marca}% - 1px)" title="No trabalho: ${marca}%"></u></div>
            <span class="rel-barra-val">${valor}%</span>
        </div>`;
    }).join('');
}

function textoDiaATrabalho(nat, adp) {
    if (!nat.principal) {
        return 'No dia a dia, as suas escolhas ficaram equilibradas entre os quatro animais. Isso costuma mostrar flexibilidade, ou um momento de transição.';
    }

    if (!adp.principal) {
        return `No dia a dia você é ${nat.principal.artigo} ${nat.principal.nome}. No trabalho, as suas escolhas ficaram equilibradas entre os quatro animais: você parece transitar entre vários jeitos de agir.`;
    }

    if (nat.principal.chave === adp.principal.chave) {
        return `Você é ${nat.principal.artigo} ${nat.principal.nome} nos dois momentos: o que você mostra no trabalho combina com o que você é no dia a dia.`;
    }

    return `No dia a dia você é ${nat.principal.artigo} ${nat.principal.nome}; no trabalho, o seu lado ${adp.principal.nome} fala mais alto. Vale pensar: o que você faz para se adaptar, e quanto isso custa de energia?`;
}

/**
 * @param {object} opcoes
 * @param {HTMLElement} opcoes.container elemento (position: relative) onde o relatorio e montado
 * @param {{percentual: Record<string, number>}} opcoes.natural resultado da etapa "como voce e"
 * @param {{percentual: Record<string, number>}} opcoes.adaptado resultado da etapa "como esperam de voce"
 * @param {string} [opcoes.retrato] imagem do avatar escolhido
 * @param {boolean} [opcoes.reduzirEfeitos] comeca no modo calmo
 * @param {Function} [opcoes.aoRejogar] clique no botao final (prototipo: jogar de novo)
 * @param {string} [opcoes.textoBotaoFinal] texto do botao final
 * @param {Function} [opcoes.aoFinalizar] clique no botao final; tem prioridade sobre aoRejogar
 * @returns {{fechar: () => void, tema: string}}
 */
export function mostrarRelatorio({
    container, natural, adaptado, retrato = '', reduzirEfeitos = false, aoRejogar, textoBotaoFinal = 'Jogar de novo', aoFinalizar,
}) {
    injetarEstilo();

    const nat = resolverAnimais(natural.percentual);
    const adp = resolverAnimais(adaptado.percentual);
    const principal = nat.principal;
    const chaveTema = principal?.chave ?? 'equilibrio';
    const tema = TEMAS[chaveTema];

    const titulo = principal
        ? `Você é ${principal.artigo} <strong style="color:${principal.cor}">${principal.nome}</strong>`
        : 'Os quatro animais vivem em você';
    const slogan = principal ? principal.slogan : 'Equilíbrio também é um estilo.';

    const palco = principal
        ? `<div class="rel-animal">${svgAnimal(principal)}</div>
           ${nat.secundario ? `<div class="rel-secundario" style="--cor-sec:${nat.secundario.cor}" title="Com traços de ${nat.secundario.nome}">${svgAnimal(nat.secundario)}</div>` : ''}`
        : `<div class="rel-orbita">${Object.values(ANIMAIS).map((a) => `<div style="color:${a.cor}">${svgAnimal(a)}</div>`).join('')}</div>`;

    const cartaoPrincipal = principal
        ? `<p class="rel-slogan">“${slogan}”</p>
           ${nat.secundario ? `<p>Com traços de <span class="rel-chip" style="color:${nat.secundario.cor}">${svgAnimal(nat.secundario)}<span style="color:#0f1f33">${nat.secundario.nome}</span></span>: suas escolhas ficaram próximas entre os dois estilos.</p>` : ''}
           <p>${principal.resumo}</p>
           <p><em>${principal.emTime}</em></p>
           <div class="rel-duplo">
               <div class="rel-bloco forte"><h3>Seu superpoder</h3><p>${principal.forte}</p></div>
               <div class="rel-bloco atencao"><h3>Para ficar de olho</h3><p>${principal.atencao}</p></div>
           </div>`
        : `<p class="rel-slogan">“${slogan}”</p>
           <p>Nesta jornada, as suas escolhas ficaram bem distribuídas entre os quatro estilos, sem um predominante. Isso costuma indicar flexibilidade, ou um momento de transição. Uma conversa com o analista ajuda a entender melhor.</p>`;

    container.insertAdjacentHTML('beforeend', `
<section class="rel rel--${chaveTema}${reduzirEfeitos ? ' rel--calmo' : ''}" aria-label="Seu animal" style="--fundo:${tema.fundo};--cor:${tema.cor};--brilho:${tema.brilho};--pulso:${tema.pulso};--grito:${tema.gritoCor ?? '#fff'}">
    <div class="rel-fundo">${camadasDoTema(chaveTema)}</div>
    <div class="rel-pulso"></div>
    <div class="rel-aneis" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="rel-palco">
        <div class="rel-suspense" aria-hidden="true">Descobrindo o seu animal<span>.</span><span>.</span><span>.</span></div>
        <div class="rel-dupla">${palco}${retrato ? `<img class="rel-avatar" src="${retrato}" alt="Seu avatar">` : ''}</div>
        <div class="rel-grito" aria-hidden="true">${tema.grito}</div>
    </div>
    <div class="rel-conteudo">
        <div class="rel-cartao">
            <h3>Seu animal na jornada</h3>
            <h2 tabindex="-1" id="rel-titulo">${titulo}</h2>
            ${cartaoPrincipal}
        </div>
        <div class="rel-cartao">
            <h3>Dia a dia e trabalho</h3>
            <p>${textoDiaATrabalho(nat, adp)}</p>
            ${barras(natural, adaptado)}
            <p class="rel-legenda">A barra mostra suas escolhas em “como você é”; o traço escuro marca o que apareceu em “como esperam de você”.</p>
        </div>
        <div class="rel-cartao rel-aviso">
            <h3>Antes de terminar</h3>
            <p>Esta é uma leitura lúdica das suas escolhas, no mesmo modelo dos animais usado no seu relatório. Não é um diagnóstico e não define quem você é: mostra tendências do momento, e as pessoas se adaptam e mudam.</p>
            <div class="rel-botoes"><button type="button" data-acao="rejogar">${textoBotaoFinal}</button></div>
        </div>
    </div>
    <div class="rel-controles">
        <button type="button" data-acao="pular">Pular animação</button>
        <button type="button" data-acao="calmo" aria-pressed="${reduzirEfeitos}">Reduzir efeitos</button>
    </div>
    <p class="rel-sr" aria-live="polite" data-anuncio></p>
</section>`);

    const rel = container.lastElementChild;
    const anuncio = rel.querySelector('[data-anuncio]');
    const botaoPular = rel.querySelector('[data-acao="pular"]');
    const botaoCalmo = rel.querySelector('[data-acao="calmo"]');
    const temporizadores = [];
    const calmo = () => rel.classList.contains('rel--calmo');

    function mostrarConteudo() {
        rel.classList.add('com-conteudo');
        botaoPular.hidden = true;
        rel.querySelector('#rel-titulo').focus({ preventScroll: true });
    }

    function revelar() {
        if (rel.classList.contains('revelado')) {
            return;
        }

        rel.classList.add('revelado');
        sons[tema.som]?.();
        anuncio.textContent = principal
            ? `Você é ${principal.artigo} ${principal.nome}. ${principal.slogan}`
            : 'Os quatro animais vivem em você. Equilíbrio também é um estilo.';
        temporizadores.push(setTimeout(mostrarConteudo, calmo() ? 1400 : 4600));
    }

    sons.suspense();
    temporizadores.push(setTimeout(revelar, calmo() ? 700 : 2500));

    botaoPular.addEventListener('click', () => {
        temporizadores.forEach(clearTimeout);
        revelar();
        temporizadores.forEach(clearTimeout);
        mostrarConteudo();
    });

    botaoCalmo.addEventListener('click', () => {
        const ativo = rel.classList.toggle('rel--calmo');
        botaoCalmo.setAttribute('aria-pressed', String(ativo));
    });

    rel.querySelector('[data-acao="rejogar"]').addEventListener('click', () => (aoFinalizar ?? aoRejogar)?.());

    return {
        tema: chaveTema,
        fechar() {
            temporizadores.forEach(clearTimeout);
            rel.remove();
        },
    };
}
