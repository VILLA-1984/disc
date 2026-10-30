import { AVATARES, CORES_ROUPA, gerarRetratos } from './avatars.js';
import { alternarMudo, estaMudo, iniciarAudio, iniciarMusica, pararMusica, sons } from './audio.js';
import { CENARIOS, MEIOS, avatarCabe, meioPadrao, regraDe, textosDe } from './cenarios.js';
import { paraHtml, textoDe } from '../lib/configuracao';
import { criarCiclo } from './ciclo.js';
import { criarJogo3D } from './game3d.js';
import { mostrarRelatorio } from './report.js';

/**
 * Rua das Palavras dentro do sistema (pagina pages::disc.take-game-test).
 *
 * Diferente do prototipo, aqui o servidor manda os portoes ja montados (so id e texto das palavras,
 * nunca o fator DISC) e recebe de volta apenas qual lado foi escolhido em cada um. A pontuacao e o
 * relatorio saem do que o servidor devolve em concluir().
 *
 * Carregado sob demanda pela propria pagina (import dinamico), para nao pesar as demais telas.
 */

// Modo ciclo (uma palavra por vez): a placa sem palavra diz "Deixar passar" e tem id 0.
const PASSAR = { id: 0, word: 'Deixar passar' };
const NOMES_CORES = ['Azul', 'Laranja', 'Verde', 'Roxo', 'Rosa', 'Marinho', 'Amarelo'];
// rotulo: o que aparece no botao, igual a etiqueta da placa no jogo; tecla: dica so para quem tem teclado.
const CONTROLES = {
    '3d': {
        cima: { rotulo: '← ESQUERDA', tecla: 'tecla ← ou A', nome: 'esquerda' },
        baixo: { rotulo: 'DIREITA →', tecla: 'tecla → ou D', nome: 'direita' },
        dica: 'toque na placa, use as setas ← → (ou A e D) ou os botões abaixo. Segure ↑ (ou W) para correr mais rápido',
        dicaToque: 'toque na placa ou nos botões abaixo. Para correr mais rápido, segure o botão escuro de baixo',
    },
    lateral: {
        cima: { rotulo: '↑ CIMA', tecla: 'tecla ↑ ou W', nome: 'pista de cima' },
        baixo: { rotulo: '↓ BAIXO', tecla: 'tecla ↓ ou S', nome: 'pista de baixo' },
        dica: 'toque na placa, use as setas ↑ ↓ (ou W e S) ou os botões abaixo. Segure → (ou D) para correr mais rápido',
        dicaToque: 'toque na placa ou nos botões abaixo. Para correr mais rápido, segure o botão escuro de baixo',
    },
};

const ESTRUTURA = `
<div id="palco">
    <div id="jogo" aria-hidden="true"></div>
    <div id="cartao" role="dialog" aria-modal="true" aria-labelledby="cartao-titulo">
        <div class="cartao-conteudo">
            <div class="sobretitulo" id="cartao-sobretitulo"></div>
            <h2 id="cartao-titulo"></h2>
            <div id="cartao-corpo"></div>
            <button type="button" class="principal" id="cartao-botao"></button>
        </div>
    </div>
    <button type="button" id="som" aria-pressed="true"></button>
</div>
<div id="controles" role="group" aria-label="Escolha uma das duas palavras">
    <button type="button" id="botao-cima" disabled><small class="lado"></small><strong>—</strong><span class="tecla"></span></button>
    <button type="button" id="botao-baixo" disabled><small class="lado"></small><strong>—</strong><span class="tecla"></span></button>
</div>
<button type="button" id="botao-turbo" hidden>Segure para correr mais rápido</button>
<p class="dica" id="dica"></p>
<div class="sr-only" aria-live="polite" id="anuncio"></div>`;

function temWebGL() {
    try {
        const canvas = document.createElement('canvas');

        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
        return false;
    }
}

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * @param {HTMLElement} raiz elemento .rua-app
 * @param {{etapas: object[][], concluir: (escolhas: object[]) => Promise<object>, aoFinalizar: (resposta: object) => void}} api
 *        etapas: portoes montados pelo servidor; concluir: envia as escolhas; aoFinalizar: clique no botao final do relatorio
 * @returns {{destruir: () => void}}
 */
export function montar(raiz, api) {
    const ciclo = api.ciclo ?? null; // {escolher, etapas: ordens por etapa e volta, palavras: {id: texto}}

    // Configuracao da area de gerenciamento (so o Next.js a envia): o que esta liberado e visivel, e os textos.
    const config = api.config ?? null;
    const avataresLivres = (() => {
        const lista = AVATARES.filter((a) => !config?.avatares || config.avatares.includes(a.id));

        return lista.length ? lista : AVATARES;
    })();
    const cenariosLivres = (() => {
        const lista = Object.keys(CENARIOS).filter((chave) => !config?.cenarios || config.cenarios.includes(chave));

        return lista.length ? lista : ['rua'];
    })();
    const meioLiberado = (chave) => !config?.meios || config.meios.includes(chave);
    const T = (chave, variaveis) => textoDe(config?.textos, chave, variaveis);
    const paragrafo = (chave, variaveis) => {
        const texto = T(chave, variaveis);

        return texto ? `<p>${paraHtml(texto)}</p>` : '';
    };
    const etapas = api.etapas ?? [];
    const totalEtapas = ciclo ? ciclo.etapas.length : etapas.length;
    const escolhasPorEtapa = ciclo ? ciclo.escolher : etapas[0].length;
    const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

    raiz.innerHTML = ESTRUTURA;

    // Elementos da tela que a area de gerenciamento pode esconder (as regras estao em globals.css).
    if (config?.mostrarMinimapa === false) {
        raiz.dataset.semMinimapa = '';
    }

    if (config?.mostrarProgresso === false) {
        raiz.dataset.semProgresso = '';
    }

    const el = (id) => raiz.querySelector(`#${id}`);
    const palco = el('palco');
    const cartao = el('cartao');
    const botaoCima = el('botao-cima');
    const botaoBaixo = el('botao-baixo');
    const anuncio = el('anuncio');
    const botaoSom = el('som');

    const escolhas = [];
    let jogo = null;
    let modo = '3d';
    let cenario = cenariosLivres[0];
    let meio = null; // meio de locomocao do cenario (so o rio tem)
    let avatarId = avataresLivres[0].id;
    let corRoupa = null; // null = cor original do avatar
    let retratoAtual = '';
    let ultimoPasso = 0;
    let destruido = false;
    let estadoCiclo = null;
    let vezes = 0; // quantas palavras ja passaram na etapa: alterna o lado em que a proxima aparece

    try {
        const lembrado = localStorage.getItem('rua_avatar');

        if (avataresLivres.some((a) => a.id === lembrado)) {
            avatarId = lembrado;
        }
    } catch {
        // sem localStorage: usa o avatar padrao
    }

    // ------------------------------------------------------------ painel de totais
    // So aparece quando quem monta o jogo oferece api.totais (aqui, o Next.js): quantas pessoas ja jogaram e quantas
    // deram cada animal. Sao contadores, sem nome nem telefone. Se nao carregar, o painel simplesmente nao aparece.
    let temporizadorTotais = null;

    if (api.totais) {
        const painelTotais = document.createElement('aside');
        painelTotais.className = 'rua-totais';
        painelTotais.setAttribute('aria-label', 'Quantas pessoas já jogaram');
        painelTotais.hidden = true;
        palco.appendChild(painelTotais);

        const atualizarTotais = async () => {
            try {
                const dados = await api.totais();

                if (destruido || !dados || !Array.isArray(dados.animais)) {
                    return;
                }

                // Ranking: do perfil com mais pessoas para o com menos (a area de gerenciamento pode esconder a lista).
                const ordenados = [...dados.animais].sort((a, b) => b.total - a.total);
                const lista = config?.mostrarRanking === false ? '' : `<ul>${ordenados.map((a) => `<li><i style="background:${escapar(a.cor)}"></i><span>${escapar(a.nome)}</span><b>${Number(a.total)}</b></li>`).join('')}</ul>`;

                painelTotais.innerHTML = `<div class="rua-totais-topo"><span>Já jogaram</span><strong>${Number(dados.total)}</strong></div>${lista}`;
                painelTotais.hidden = false;
            } catch {
                // sem totais: nada a mostrar
            }
        };

        atualizarTotais();
        temporizadorTotais = setInterval(atualizarTotais, 30000);
    }

    // ------------------------------------------------------------------- som
    function atualizarBotaoSom() {
        const mudo = estaMudo();
        botaoSom.setAttribute('aria-pressed', String(!mudo));
        botaoSom.setAttribute('aria-label', mudo ? 'Ligar o som' : 'Desligar o som');
        botaoSom.innerHTML = mudo
            ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg> Som desligado'
            : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg> Som ligado';
    }

    botaoSom.addEventListener('click', () => {
        iniciarAudio();
        alternarMudo();
        atualizarBotaoSom();
    });
    atualizarBotaoSom();

    botaoCima.addEventListener('click', () => jogo?.escolher('cima'));
    botaoBaixo.addEventListener('click', () => jogo?.escolher('baixo'));

    // Sem teclado (celular), correr mais rapido e um botao que se mantem pressionado.
    const botaoTurbo = el('botao-turbo');
    const comToque = matchMedia('(pointer: coarse)').matches;
    const soltarTurbo = () => {
        jogo?.acelerar(false);
        botaoTurbo.classList.remove('ativo');
    };

    botaoTurbo.addEventListener('pointerdown', (evento) => {
        evento.preventDefault();
        botaoTurbo.setPointerCapture?.(evento.pointerId);
        botaoTurbo.classList.add('ativo');
        iniciarAudio();
        jogo?.acelerar(true);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((nome) => botaoTurbo.addEventListener(nome, soltarTurbo));
    botaoTurbo.addEventListener('contextmenu', (evento) => evento.preventDefault());

    // ----------------------------------------------------------------- cartoes
    function mostrarCartao({ sobretitulo, titulo, corpoHtml, botao, aoClicar, largo = false, aoRenderizar }) {
        el('cartao-sobretitulo').textContent = sobretitulo;
        el('cartao-titulo').textContent = titulo;
        el('cartao-corpo').innerHTML = corpoHtml;
        cartao.querySelector('.cartao-conteudo').classList.toggle('largo', largo);
        const botaoCartao = el('cartao-botao');
        botaoCartao.textContent = botao;
        botaoCartao.disabled = false;
        botaoCartao.onclick = () => {
            iniciarAudio();
            aoClicar(botaoCartao);
        };
        aoRenderizar?.(el('cartao-corpo'));
        cartao.classList.add('aberto');
        botaoCartao.focus();
    }

    const fecharCartao = () => cartao.classList.remove('aberto');

    function travarBotoes() {
        botaoCima.disabled = true;
        botaoBaixo.disabled = true;
    }

    function ajustarControles() {
        const c = CONTROLES[modo];
        botaoCima.querySelector('.lado').textContent = c.cima.rotulo;
        botaoBaixo.querySelector('.lado').textContent = c.baixo.rotulo;
        botaoCima.querySelector('.tecla').textContent = c.cima.tecla;
        botaoBaixo.querySelector('.tecla').textContent = c.baixo.tecla;
        botaoTurbo.hidden = !comToque;
        const instrucao = ciclo
            ? 'Em cada portão há uma palavra de um lado e "Deixar passar" do outro. Vá para o lado da palavra se ela combina com você'
            : 'Em cada portão, escolha a palavra que mais combina com você';
        const complemento = (comToque ? c.dicaToque : c.dica).replaceAll('correr mais rápido', textosDe(cenario, meio).acelerar);
        botaoTurbo.textContent = `Segure para ${textosDe(cenario, meio).acelerar}`;
        el('dica').textContent = `${instrucao}: ${complemento}.`;
    }

    // ------------------------------------------------------------------- ciclo
    function prepararCiclo(indice) {
        estadoCiclo = criarCiclo(ciclo.etapas[indice], ciclo.escolher);
        vezes = 0;
        progressoDoCiclo(indice);
    }

    function progressoDoCiclo(indice) {
        estadoCiclo.proximo(); // avanca ate a proxima palavra (ou encerra e completa as automaticas)
        const { escolhidas, volta } = estadoCiclo.estado();
        const feitas = escolhidas.length;
        const percentual = Math.round(((indice * ciclo.escolher + feitas) / (totalEtapas * ciclo.escolher)) * 100);

        jogo?.definirProgresso({
            feitas,
            total: ciclo.escolher,
            percentual,
            texto: `Escolhidas ${feitas}/${ciclo.escolher} · volta ${volta} · ${percentual}%`,
        });
    }

    function proximoPortao() {
        const id = estadoCiclo.proximo();

        if (id === null) {
            return null;
        }

        const palavra = { id, word: ciclo.palavras[id] };

        // As palavras alternam de lado: uma na esquerda (cima), a seguinte na direita (baixo).
        return vezes % 2 === 0 ? { cima: palavra, baixo: PASSAR } : { cima: PASSAR, baixo: palavra };
    }

    // ------------------------------------------------------------------ avatar
    function especificacaoEscolhida() {
        const base = avataresLivres.find((a) => a.id === avatarId) ?? avataresLivres[0];

        return corRoupa ? { ...base, roupa: corRoupa } : { ...base };
    }

    function escolherAvatar() {
        const retratos = gerarRetratos(avataresLivres, { largura: 220, altura: 280 });

        mostrarCartao({
            sobretitulo: 'Antes de começar',
            titulo: T('avatar_titulo'),
            largo: true,
            botao: 'Começar',
            corpoHtml: `${paragrafo('avatar_texto')}
                <p class="rolar-aviso">↓ Role até o fim: depois dos avatares há mais escolhas (cenário, meio e vista) e só então o botão Começar.</p>
                <div class="avatares" role="radiogroup" aria-label="Avatar">${avataresLivres.map((a) => `
                    <button type="button" class="avatar-op" role="radio" aria-checked="${a.id === avatarId}" data-id="${a.id}" ${avatarCabe(a, cenario, meio) ? '' : 'disabled'}>
                        ${retratos.get(a.id) ? `<img src="${retratos.get(a.id)}" alt="">` : `<span class="avatar-ini" style="background:${a.roupa}">${a.nome[0]}</span>`}
                        <span>${a.nome}</span>
                    </button>`).join('')}</div>
                <div class="opcoes-linha">
                    <div class="cores" role="group" aria-label="Cor da roupa"><span>Cor da roupa</span>
                        <button type="button" class="cor-op" data-cor="" aria-pressed="${corRoupa === null}" aria-label="Cor original" title="Cor original">★</button>
                        ${CORES_ROUPA.map((c, i) => `<button type="button" class="cor-op" data-cor="${c}" aria-pressed="${corRoupa === c}" aria-label="${NOMES_CORES[i]}" title="${NOMES_CORES[i]}" style="background:${c}"></button>`).join('')}
                    </div>
                    <fieldset class="vistas" ${cenariosLivres.length < 2 ? 'hidden' : ''}><legend>Onde você quer correr?</legend>
                        ${Object.entries(CENARIOS).filter(([chave]) => cenariosLivres.includes(chave)).map(([chave, c]) => `<label><input type="radio" name="cenario" value="${chave}" ${cenario === chave ? 'checked' : ''}> <span><strong>${c.nome}</strong><small>${c.descricao}</small></span></label>`).join('')}
                        <p class="cenario-aviso" aria-live="polite"></p>
                    </fieldset>
                    <fieldset class="vistas meios" hidden></fieldset>
                    <fieldset class="vistas"><legend>Como você quer ver o cenário?</legend>
                        <label><input type="radio" name="vista" value="3d" ${modo === '3d' ? 'checked' : ''}> <span><strong>Vista 3D</strong><small>o avatar avança para a frente, em direção ao topo da tela</small></span></label>
                        <label><input type="radio" name="vista" value="lateral" ${modo === 'lateral' ? 'checked' : ''}> <span><strong>Vista lateral</strong><small>o avatar segue para o lado, como num jogo clássico</small></span></label>
                    </fieldset>
                </div>`,
            aoRenderizar: (corpo) => {
                const botoes = [...corpo.querySelectorAll('.avatar-op')];

                for (const botao of botoes) {
                    botao.addEventListener('click', () => {
                        avatarId = botao.dataset.id;
                        botoes.forEach((b) => b.setAttribute('aria-checked', String(b === botao)));
                    });
                }

                corpo.querySelectorAll('.cor-op').forEach((botao) => {
                    botao.addEventListener('click', () => {
                        corRoupa = botao.dataset.cor || null;
                        corpo.querySelectorAll('.cor-op').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
                        const spec = especificacaoEscolhida();
                        const novo = gerarRetratos([spec], { largura: 220, altura: 280 }).get(spec.id);
                        const imagem = corpo.querySelector(`.avatar-op[data-id="${spec.id}"] img`);

                        if (novo && imagem) {
                            imagem.src = novo;
                        }
                    });
                });

                corpo.querySelectorAll('input[name="vista"]').forEach((radio) => {
                    radio.addEventListener('change', () => { modo = radio.value; });
                });

                // Cada cenario aceita certos avatares (o criterio e o meio de locomocao de cada um).
                const aplicarCenario = () => {
                    const aviso = corpo.querySelector('.cenario-aviso');

                    for (const botao of botoes) {
                        const cabe = avatarCabe(avataresLivres.find((a) => a.id === botao.dataset.id), cenario, meio);
                        botao.disabled = !cabe;
                        botao.title = cabe ? '' : regraDe(cenario, meio).motivo;
                    }

                    if (!avatarCabe(avataresLivres.find((a) => a.id === avatarId), cenario, meio)) {
                        avatarId = avataresLivres.find((a) => avatarCabe(a, cenario, meio)).id;
                        botoes.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === avatarId)));
                    }

                    aviso.textContent = regraDe(cenario, meio).motivo ? `${regraDe(cenario, meio).motivo} Esses avatares ficam indisponíveis aqui.` : '';
                };

                // "Como voce quer ir?": so aparece quando o cenario tem mais de um meio de locomocao.
                const caixaMeios = corpo.querySelector('.meios');

                const desenharMeios = () => {
                    const lista = Object.entries(MEIOS).filter(([chave, m]) => m.cenario === cenario && meioLiberado(chave));
                    caixaMeios.hidden = lista.length < 2; // com um meio so, nao ha o que escolher

                    if (lista.length === 0) {
                        meio = null;

                        return;
                    }

                    if (!lista.some(([chave]) => chave === meio)) {
                        // Prefere o primeiro meio que aceita o avatar ja escolhido (assim quem usa cadeira nao
                        // perde o avatar ao entrar na neve, por exemplo).
                        const mobilidadeAtual = avataresLivres.find((a) => a.id === avatarId)?.mobilidade ?? 'anda';
                        meio = (lista.find(([, m]) => m.aceita(mobilidadeAtual)) ?? lista[0])[0];
                    }

                    caixaMeios.innerHTML = `<legend>Como você quer ir?</legend>${lista.map(([chave, m]) => `<label><input type="radio" name="meio" value="${chave}" ${meio === chave ? 'checked' : ''}> <span><strong>${m.nome}</strong><small>${m.descricao}</small></span></label>`).join('')}`;
                    caixaMeios.querySelectorAll('input[name="meio"]').forEach((radio) => {
                        radio.addEventListener('change', () => {
                            meio = radio.value;
                            aplicarCenario();
                        });
                    });
                };

                corpo.querySelectorAll('input[name="cenario"]').forEach((radio) => {
                    radio.addEventListener('change', () => {
                        cenario = radio.value;
                        desenharMeios();
                        aplicarCenario();
                    });
                });

                desenharMeios();
                aplicarCenario();
            },
            aoClicar: () => {
                fecharCartao();

                try {
                    localStorage.setItem('rua_avatar', avatarId);
                } catch {
                    // sem localStorage: segue sem lembrar a escolha
                }

                iniciarJogo();
            },
        });
    }

    // -------------------------------------------------------------------- jogo
    function apresentarEtapa(indice) {
        mostrarCartao({
            sobretitulo: `Etapa ${indice + 1} de ${totalEtapas}`,
            titulo: indice === 0 ? T('etapa1_titulo') : T('etapa2_titulo'),
            corpoHtml: ciclo
                ? `${paragrafo(indice === 0 ? 'etapa1_texto' : 'etapa2_texto')}${paragrafo('regra_texto', { n: escolhasPorEtapa })}`
                : `${paragrafo(indice === 0 ? 'etapa1_texto_pares' : 'etapa2_texto_pares')}${paragrafo('regra_texto_pares', { n: escolhasPorEtapa, percurso: textosDe(cenario, meio).percurso })}`,
            botao: textosDe(cenario, meio).comeco,
            aoClicar: () => {
                fecharCartao();

                if (ciclo) {
                    prepararCiclo(indice);
                }

                jogo.iniciarEtapa(indice);
            },
        });
    }

    function iniciarJogo() {
        const spec = especificacaoEscolhida();
        retratoAtual = gerarRetratos([spec], { largura: 320, altura: 400 }).get(spec.id) ?? '';
        ajustarControles();

        jogo = criarJogo3D({
            parent: el('jogo'),
            etapas,
            proximoPortao: ciclo ? proximoPortao : undefined,
            avatar: spec,
            modo,
            cenario,
            meio,
            rotulosEtapas: [`Etapa 1 de 2 · ${T('etapa1_titulo')}`, `Etapa 2 de 2 · ${T('etapa2_titulo')}`],
            reduzirMovimento,
            aoPasso: () => {
                const agora = performance.now();

                if (agora - ultimoPasso > 190) {
                    ultimoPasso = agora;
                    sons.passo();
                }
            },
            aoTurbo: ({ som }) => sons.turbo({ som }),
            aoPortao: ({ indice, total, cima, baixo }) => {
                sons.portao();
                botaoCima.querySelector('strong').textContent = cima.word;
                botaoBaixo.querySelector('strong').textContent = baixo.word;
                botaoCima.disabled = false;
                botaoBaixo.disabled = false;
                const [nomeCima, nomeBaixo] = [CONTROLES[modo].cima.nome, CONTROLES[modo].baixo.nome];

                if (ciclo) {
                    const palavraEmCima = cima.id !== 0;
                    anuncio.textContent = `Palavra: ${palavraEmCima ? cima.word : baixo.word}. Para pegar, vá para a ${palavraEmCima ? nomeCima : nomeBaixo}; para deixar passar, vá para a ${palavraEmCima ? nomeBaixo : nomeCima}.`;

                    return;
                }

                anuncio.textContent = `Portão ${indice + 1} de ${total}. Opção da ${nomeCima}: ${cima.word}. Opção da ${nomeBaixo}: ${baixo.word}.`;
            },
            aoEscolher: (escolha) => {
                sons.escolha();
                travarBotoes();

                if (ciclo) {
                    // O servidor refaz o ciclo com estas decisoes: so se pegou ou nao (take), na ordem.
                    const pegou = escolha.escolhida.id !== 0;
                    estadoCiclo.registrar(pegou);
                    vezes++;
                    escolhas.push({ stage: escolha.etapa, take: pegou, ms: escolha.tempoMs });
                    progressoDoCiclo(escolha.etapa);
                    anuncio.textContent = pegou ? `Você pegou ${escolha.escolhida.word}.` : 'Você deixou a palavra passar.';

                    return;
                }

                // So o lado e o tempo vao ao servidor: ele sabe quais palavras estavam em cada portao.
                escolhas.push({
                    stage: escolha.etapa,
                    gate: escolha.indice,
                    side: escolha.lado === 'cima' ? 'top' : 'bottom',
                    ms: escolha.tempoMs,
                });
                anuncio.textContent = `Você escolheu ${escolha.escolhida.word}.`;
            },
            aoConcluirEtapa: ({ etapa }) => {
                travarBotoes();

                if (etapa + 1 < totalEtapas) {
                    sons.etapa();
                    const automaticas = ciclo ? estadoCiclo.estado().automaticas.length : 0;
                    mostrarCartao({
                        sobretitulo: `Etapa ${etapa + 1} concluída`,
                        titulo: T('etapa_concluida_titulo'),
                        corpoHtml: ciclo
                            ? `${paragrafo('etapa_concluida_texto', { n: escolhasPorEtapa, proxima: etapa + 2 })}${automaticas ? `<p>As últimas ${automaticas} entraram sozinhas, porque eram as únicas que faltavam.</p>` : ''}`
                            : paragrafo('etapa_concluida_texto_pares', { n: escolhasPorEtapa, proxima: etapa + 2 }),
                        botao: `Continuar para a etapa ${etapa + 2}`,
                        aoClicar: () => {
                            fecharCartao();
                            apresentarEtapa(etapa + 1);
                        },
                    });

                    return;
                }

                sons.fanfarra();
                mostrarFim();
            },
        });

        apresentarEtapa(0);
    }

    function mostrarFim(mensagemErro = '') {
        mostrarCartao({
            sobretitulo: 'Fim da jornada',
            titulo: T('fim_titulo', { fim: textosDe(cenario, meio).fim }),
            corpoHtml: `${paragrafo('fim_texto')}${mensagemErro ? `<p class="erro-jogo" role="alert">${escapar(mensagemErro)}</p>` : ''}`,
            botao: mensagemErro ? 'Tentar de novo' : 'Descobrir meu animal',
            aoClicar: (botao) => concluir(botao),
        });
    }

    async function concluir(botao) {
        botao.disabled = true;
        botao.textContent = 'Calculando…';

        let resposta;

        try {
            resposta = await api.concluir(escolhas);
        } catch {
            if (!destruido) {
                mostrarFim('Não foi possível enviar as suas escolhas. Verifique a conexão e tente de novo.');
            }

            return;
        }

        if (destruido) {
            return;
        }

        if (resposta?.erro) {
            mostrarFim(resposta.erro);

            return;
        }

        revelarAnimal(resposta);
    }

    function revelarAnimal(resposta) {
        fecharCartao();
        jogo?.destruir();
        jogo = null;
        pararMusica();
        el('jogo').innerHTML = '';
        el('controles').hidden = true;
        botaoTurbo.hidden = true;
        el('dica').hidden = true;
        palco.classList.add('palco--relatorio');

        mostrarRelatorio({
            container: palco,
            natural: resposta.natural,
            adaptado: resposta.adaptado,
            retrato: retratoAtual,
            reduzirEfeitos: reduzirMovimento,
            textoBotaoFinal: 'Enviar meu resultado por WhatsApp',
            aoFinalizar: () => api.aoFinalizar(resposta),
        });
    }

    // ------------------------------------------------------------------- inicio
    if (!temWebGL()) {
        el('controles').hidden = true;
        el('dica').hidden = true;
        el('jogo').remove();
        el('som').remove();
        mostrarCartao({
            sobretitulo: 'Teste comportamental',
            titulo: 'Este navegador não consegue exibir o jogo',
            corpoHtml: '<p>O jogo precisa de gráficos 3D (WebGL), que não estão disponíveis aqui. Abra esta página em outro navegador ou em outro aparelho.</p>',
            botao: 'Tentar de novo',
            aoClicar: () => { location.reload(); },
        });
    } else {
        mostrarCartao({
            sobretitulo: 'Teste comportamental',
            titulo: T('titulo_geral'),
            corpoHtml: `${ciclo
                    ? paragrafo('abertura_texto', { n: escolhasPorEtapa, total: Object.keys(ciclo.palavras).length })
                    : paragrafo('abertura_texto_pares', { n: escolhasPorEtapa })}
                <ul><li>Toque na placa, use as setas do teclado ou os botões abaixo do jogo.</li>
                <li>O avatar espera por você: não há limite de tempo. Para acelerar, segure ↑ (ou W) na vista 3D, ou → (ou D) na vista lateral.</li>
                <li>O jogo tem som. Você pode desligá-lo a qualquer momento no botão no canto da tela.</li>
                <li>${ciclo ? `Você só passa para a etapa seguinte depois de pegar as ${escolhasPorEtapa} palavras.` : 'Você só passa para a etapa seguinte depois de completar todos os portões.'}</li></ul>`,
            botao: 'Vamos lá',
            aoClicar: () => {
                iniciarMusica();
                escolherAvatar();
            },
        });
    }

    return {
        destruir() {
            destruido = true;
            clearInterval(temporizadorTotais);
            jogo?.destruir();
            jogo = null;
            pararMusica();
        },
    };
}
