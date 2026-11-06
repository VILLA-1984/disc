'use client';

import { useEffect, useMemo, useState } from 'react';
import { LIMITES, type ChaveTexto, type Configuracao, type TextoDefinicao } from '@/lib/configuracao';
import type { Catalogo } from '@/server/configuracao';
import AdminLogo from './AdminLogo';

type Props = {
    configInicial: Configuracao;
    catalogo: Catalogo;
    textos: TextoDefinicao[];
    escolhaLogo: string;
    versaoLogo: number | null;
};

const ROTULO_MOBILIDADE: Record<string, string> = {
    anda: 'anda',
    bengala: 'usa bengala',
    andador: 'usa andador',
    cadeira: 'usa cadeira de rodas',
    'cadeira-corrida': 'cadeira de corrida',
    moto: 'de moto',
    taxi: 'de táxi',
};

type Lista = 'avatares' | 'cenarios' | 'meios';
type Mensagem = { tipo: 'ok' | 'erro' | 'pendente'; texto: string };

/** Area de gerenciamento: o que fica liberado, o que fica visivel, quantas palavras marcar e os textos do jogo. */
export default function Admin({ configInicial, catalogo, textos, escolhaLogo, versaoLogo }: Props) {
    const [config, setConfig] = useState<Configuracao>(configInicial);
    const [salvo, setSalvo] = useState<Configuracao>(configInicial);
    const [ocupado, setOcupado] = useState(false);
    const [mensagem, setMensagem] = useState<Mensagem | null>(null);

    const alterado = JSON.stringify(config) !== JSON.stringify(salvo);

    // Icones dos avatares de formas simples: desenhados no navegador (o mesmo desenho da tela de escolha do jogo).
    const [icones, setIcones] = useState<Record<string, string>>({});

    useEffect(() => {
        let ativo = true;

        import('@/jogo/avatars.js').then(({ AVATARES, gerarRetratos }) => {
            if (!ativo) {
                return;
            }

            const mapa = gerarRetratos(AVATARES.filter((a) => !a.retrato), { largura: 110, altura: 140 });
            setIcones(Object.fromEntries(mapa));
        }).catch(() => undefined);

        return () => { ativo = false; };
    }, []);

    function alternar(lista: Lista, id: string) {
        setConfig((atual) => ({ ...atual, [lista]: atual[lista].includes(id) ? atual[lista].filter((x) => x !== id) : [...atual[lista], id] }));
        setMensagem(null);
    }

    function definirNomeAvatar(id: string, nome: string) {
        setConfig((atual) => {
            const nomes = { ...atual.nomesAvatares };

            if (nome.trim() === '') {
                delete nomes[id];
            } else {
                nomes[id] = nome;
            }

            return { ...atual, nomesAvatares: nomes };
        });
        setMensagem(null);
    }

    function definirLista(lista: Lista, ids: string[]) {
        setConfig((atual) => ({ ...atual, [lista]: ids }));
        setMensagem(null);
    }

    function definir<K extends keyof Configuracao>(campo: K, valor: Configuracao[K]) {
        setConfig((atual) => ({ ...atual, [campo]: valor }));
        setMensagem(null);
    }

    const emPares = config.modoPlacas === 'pares';
    const maximo = emPares ? LIMITES.portoesMax : LIMITES.palavrasMax;

    // Ao trocar de modo, o numero acompanha o limite do novo modo (duas palavras por portao tem maximo menor).
    function mudarModo(modo: Configuracao['modoPlacas']) {
        setConfig((atual) => ({
            ...atual,
            modoPlacas: modo,
            palavrasPorEtapa: Number.isFinite(atual.palavrasPorEtapa) && modo === 'pares'
                ? Math.min(atual.palavrasPorEtapa, LIMITES.portoesMax)
                : atual.palavrasPorEtapa,
        }));
        setMensagem(null);
    }

    // Combinacoes que o servidor recusaria, avisadas na hora (a validacao de verdade e a do servidor).
    const avisos = useMemo(() => {
        const lista: { onde: string; texto: string }[] = [];

        if (config.avatares.length === 0) {
            lista.push({ onde: 'avatares', texto: 'Libere pelo menos um avatar.' });
        }

        if (config.cenarios.length === 0) {
            lista.push({ onde: 'cenarios', texto: 'Libere pelo menos um cenário.' });
        }

        for (const cenario of catalogo.cenarios.filter((c) => config.cenarios.includes(c.chave))) {
            const meios = catalogo.meios.filter((m) => m.cenario === cenario.chave);

            if (meios.length === 0) {
                if (!config.avatares.some((id) => cenario.avatares.includes(id))) {
                    lista.push({ onde: cenario.chave, texto: `Nenhum avatar liberado pode ir no cenário ${cenario.nome}.` });
                }

                continue;
            }

            const liberados = meios.filter((m) => config.meios.includes(m.chave));

            if (liberados.length === 0) {
                lista.push({ onde: cenario.chave, texto: `Libere pelo menos um meio no cenário ${cenario.nome}, ou desmarque o cenário.` });
            }

            for (const meio of liberados) {
                if (!config.avatares.some((id) => meio.avatares.includes(id))) {
                    lista.push({ onde: cenario.chave, texto: `Nenhum avatar liberado pode usar ${meio.nome}. Libere um avatar compatível ou desmarque o meio.` });
                }
            }
        }

        return lista;
    }, [config, catalogo]);

    function valorDoTexto(definicao: TextoDefinicao): string {
        return config.textos[definicao.chave]?.texto ?? definicao.padrao;
    }

    function mudarTexto(definicao: TextoDefinicao, valor: string) {
        setConfig((atual) => {
            const textosNovos = { ...atual.textos };
            const anterior = textosNovos[definicao.chave] ?? {};

            if (valor.trim() === definicao.padrao || valor.trim() === '') {
                delete anterior.texto;
            } else {
                anterior.texto = valor;
            }

            if (anterior.texto === undefined && anterior.mostrar === undefined) {
                delete textosNovos[definicao.chave];
            } else {
                textosNovos[definicao.chave] = anterior;
            }

            return { ...atual, textos: textosNovos };
        });
        setMensagem(null);
    }

    function mudarMostrar(chave: ChaveTexto, mostrar: boolean) {
        setConfig((atual) => {
            const textosNovos = { ...atual.textos };
            const anterior = { ...(textosNovos[chave] ?? {}) };

            if (mostrar) {
                delete anterior.mostrar;
            } else {
                anterior.mostrar = false;
            }

            if (anterior.texto === undefined && anterior.mostrar === undefined) {
                delete textosNovos[chave];
            } else {
                textosNovos[chave] = anterior;
            }

            return { ...atual, textos: textosNovos };
        });
        setMensagem(null);
    }

    async function enviar(corpo: unknown): Promise<Configuracao | null> {
        setOcupado(true);
        setMensagem(null);

        try {
            const resposta = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corpo),
            });
            const dados = await resposta.json().catch(() => ({}));

            if (resposta.status === 401) {
                setMensagem({ tipo: 'erro', texto: 'Sua sessão terminou. Recarregue a página e entre de novo.' });

                return null;
            }

            if (!resposta.ok) {
                setMensagem({ tipo: 'erro', texto: dados?.erro ?? 'Não foi possível salvar.' });

                return null;
            }

            return dados.config as Configuracao;
        } catch {
            setMensagem({ tipo: 'erro', texto: 'Sem conexão. Tente de novo.' });

            return null;
        } finally {
            setOcupado(false);
        }
    }

    async function salvar() {
        const nova = await enviar({ config });

        if (nova) {
            setConfig(nova);
            setSalvo(nova);
            setMensagem({ tipo: 'ok', texto: 'Configuração salva. Vale para quem abrir o jogo a partir de agora.' });
        }
    }

    async function restaurar() {
        if (!window.confirm('Voltar tudo ao padrão de fábrica? Os textos editados e as opções salvas serão perdidos.')) {
            return;
        }

        const padrao = await enviar({ restaurar: true });

        if (padrao) {
            setConfig(padrao);
            setSalvo(padrao);
            setMensagem({ tipo: 'ok', texto: 'Tudo voltou ao padrão de fábrica.' });
        }
    }

    const avisosDe = (onde: string) => avisos.filter((a) => a.onde === onde);

    return (
        <div className="admin">
            <div className="admin-topo">
                <h1>Configurações do jogo</h1>
            </div>

            <AdminLogo escolhaInicial={escolhaLogo} versaoInicial={versaoLogo} />

            <section className="admin-secao" aria-labelledby="secao-cenarios">
                <h2 id="secao-cenarios">Cenários e meios de locomoção</h2>
                <p>Marque onde a pessoa pode jogar e de que jeito (barco, avião, esqui…). O cenário Rua não tem meios.</p>

                {catalogo.cenarios.map((cenario) => {
                    const ligado = config.cenarios.includes(cenario.chave);
                    const meios = catalogo.meios.filter((m) => m.cenario === cenario.chave);

                    return (
                        <div className="admin-cenario" key={cenario.chave}>
                            <label className={`admin-opcao${ligado ? ' marcada' : ''}`}>
                                <input type="checkbox" checked={ligado} onChange={() => alternar('cenarios', cenario.chave)} />
                                <span><strong>{cenario.nome}</strong><small>{cenario.descricao}</small></span>
                            </label>

                            {meios.length > 0 && (
                                <div className="admin-grade admin-meios">
                                    {meios.map((meio) => {
                                        const meioLigado = config.meios.includes(meio.chave);

                                        return (
                                            <label key={meio.chave} className={`admin-opcao${meioLigado && ligado ? ' marcada' : ''}${ligado ? '' : ' desabilitada'}`}>
                                                <input type="checkbox" checked={meioLigado} disabled={!ligado} onChange={() => alternar('meios', meio.chave)} />
                                                <span><strong>{meio.nome}</strong><small>{meio.descricao}</small></span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {ligado && avisosDe(cenario.chave).map((aviso) => <p className="admin-aviso-campo" role="alert" key={aviso.texto}>{aviso.texto}</p>)}
                        </div>
                    );
                })}

                {avisosDe('cenarios').map((aviso) => <p className="admin-aviso-campo" role="alert" key={aviso.texto}>{aviso.texto}</p>)}
            </section>

            <section className="admin-secao" aria-labelledby="secao-avatares">
                <h2 id="secao-avatares">Avatares</h2>
                <p>Marque quem aparece na escolha de avatar. Alguns avatares não vão em todos os meios (moto e táxi não vão de barco, por exemplo).</p>

                <div className="admin-acoes">
                    <button type="button" className="admin-link" onClick={() => definirLista('avatares', catalogo.avatares.map((a) => a.id))}>Liberar todos</button>
                    <button type="button" className="admin-link" onClick={() => definirLista('avatares', [])}>Desmarcar todos</button>
                </div>

                <p>Cada avatar tem o ícone e um campo para <strong>trocar o nome</strong> que aparece na escolha (deixe em branco para manter o original).</p>

                <div className="admin-grade admin-grade-avatares">
                    {catalogo.avatares.map((avatar) => {
                        const ligado = config.avatares.includes(avatar.id);
                        const icone = avatar.retrato ?? icones[avatar.id];
                        const bloco = avatar.grupo === 'humanos' ? 'humano 3D' : (avatar.grupo === 'cartun' ? 'cartun' : null);

                        return (
                            <div key={avatar.id} className={`admin-opcao admin-avatar${ligado ? ' marcada' : ''}`}>
                                <input type="checkbox" checked={ligado} aria-label={`Liberar ${config.nomesAvatares[avatar.id] ?? avatar.nome}`} onChange={() => alternar('avatares', avatar.id)} />
                                {icone ? <img className="admin-avatar-icone" src={icone} alt="" /> : <span className="admin-avatar-icone vazio" aria-hidden="true">{avatar.nome[0]}</span>}
                                <span>
                                    <input
                                        type="text"
                                        className="admin-avatar-nome"
                                        value={config.nomesAvatares[avatar.id] ?? ''}
                                        placeholder={avatar.nome}
                                        maxLength={LIMITES.nomeAvatarMax}
                                        aria-label={`Nome de ${avatar.nome} na escolha de avatar`}
                                        onChange={(e) => definirNomeAvatar(avatar.id, e.target.value)}
                                    />
                                    <small>{[avatar.rotulo ?? ROTULO_MOBILIDADE[avatar.mobilidade] ?? avatar.mobilidade, bloco].filter(Boolean).join(' · ')}</small>
                                </span>
                            </div>
                        );
                    })}
                </div>

                {avisosDe('avatares').map((aviso) => <p className="admin-aviso-campo" role="alert" key={aviso.texto}>{aviso.texto}</p>)}
            </section>

            <section className="admin-secao" aria-labelledby="secao-tela">
                <h2 id="secao-tela">O que aparece na tela</h2>
                <p>Escolha o que a pessoa vê na tela inicial e enquanto joga.</p>

                <div className="admin-grade">
                    <label className={`admin-opcao${config.mostrarTotaisInicio ? ' marcada' : ''}`}>
                        <input type="checkbox" checked={config.mostrarTotaisInicio} onChange={(e) => definir('mostrarTotaisInicio', e.target.checked)} />
                        <span><strong>Total geral e ranking na tela inicial</strong><small>abaixo do cartão de abertura: o total geral no alto e, por animal, o ícone, o nome e a quantidade de pessoas</small></span>
                    </label>
                    <label className={`admin-opcao${config.mostrarTotais ? ' marcada' : ''}`}>
                        <input type="checkbox" checked={config.mostrarTotais} onChange={(e) => definir('mostrarTotais', e.target.checked)} />
                        <span><strong>Painel de totais dentro do jogo</strong><small>quantas pessoas já terminaram o jogo, no canto da tela enquanto joga</small></span>
                    </label>
                    <label className={`admin-opcao${config.mostrarRanking && config.mostrarTotais ? ' marcada' : ''}${config.mostrarTotais ? '' : ' desabilitada'}`}>
                        <input type="checkbox" checked={config.mostrarRanking} disabled={!config.mostrarTotais} onChange={(e) => definir('mostrarRanking', e.target.checked)} />
                        <span><strong>Lista por perfil dentro do jogo</strong><small>ranking dos animais, dentro do painel de totais do jogo (só aparece no computador)</small></span>
                    </label>
                    <label className={`admin-opcao${config.mostrarMinimapa ? ' marcada' : ''}`}>
                        <input type="checkbox" checked={config.mostrarMinimapa} onChange={(e) => definir('mostrarMinimapa', e.target.checked)} />
                        <span><strong>Minimapa</strong><small>largada, chegada e posição na etapa</small></span>
                    </label>
                    <label className={`admin-opcao${config.mostrarProgresso ? ' marcada' : ''}`}>
                        <input type="checkbox" checked={config.mostrarProgresso} onChange={(e) => definir('mostrarProgresso', e.target.checked)} />
                        <span><strong>Barra de progresso</strong><small>a barra no alto da tela (o contador de palavras continua)</small></span>
                    </label>
                </div>
            </section>

            <section className="admin-secao" aria-labelledby="secao-treino">
                <h2 id="secao-treino">Treino antes do jogo</h2>
                <p>Um treino rápido para a pessoa aprender como o jogo funciona: duas etapas de 4 portões (8 no total) com palavras de exemplo. Depois aparece “Agora é pra valer!” e o jogo começa. Nada do treino entra no resultado.</p>

                <div className="admin-grade">
                    <label className={`admin-opcao${config.demoInicial ? ' marcada' : ''}`}>
                        <input type="checkbox" checked={config.demoInicial} onChange={(e) => definir('demoInicial', e.target.checked)} />
                        <span><strong>Treino no início do jogo</strong><small>a pessoa faz 8 portões de exemplo antes de começar de verdade; os textos do treino ficam em “Títulos e textos”</small></span>
                    </label>
                </div>
            </section>

            <section className="admin-secao" aria-labelledby="secao-placas">
                <h2 id="secao-placas">Placas dos portões</h2>
                <p>Como as palavras aparecem em cada portão. A mudança vale para as próximas partidas.</p>

                <div className="admin-grade" role="radiogroup" aria-labelledby="secao-placas">
                    <label className={`admin-opcao${config.modoPlacas === 'ciclo' ? ' marcada' : ''}`}>
                        <input type="radio" name="modo-placas" checked={config.modoPlacas === 'ciclo'} onChange={() => mudarModo('ciclo')} />
                        <span>
                            <strong>Uma palavra e “Deixar passar”</strong>
                            <small>uma placa com a palavra e a outra com “Deixar passar”; a pessoa pega o que combina com ela e as palavras deixadas voltam depois</small>
                        </span>
                    </label>
                    <label className={`admin-opcao${config.modoPlacas === 'pares' ? ' marcada' : ''}`}>
                        <input type="radio" name="modo-placas" checked={config.modoPlacas === 'pares'} onChange={() => mudarModo('pares')} />
                        <span>
                            <strong>Duas palavras, uma em cada placa</strong>
                            <small>cada placa traz uma palavra diferente e a pessoa é obrigada a escolher uma delas (escolha forçada)</small>
                        </span>
                    </label>
                </div>
            </section>

            <section className="admin-secao" aria-labelledby="secao-palavras">
                <h2 id="secao-palavras">{emPares ? 'Portões por etapa' : 'Palavras por etapa'}</h2>
                <p>
                    {emPares
                        ? 'Quantos portões a pessoa atravessa em cada uma das duas etapas (uma escolha por portão). Quanto menor o número, mais curto o jogo.'
                        : 'Quantas palavras a pessoa marca em cada uma das duas etapas. Quanto menor o número, mais curto o jogo.'}
                </p>

                <div className="admin-numero">
                    <input
                        id="palavras-por-etapa"
                        type="number"
                        inputMode="numeric"
                        min={LIMITES.palavrasMin}
                        max={maximo}
                        step={1}
                        value={Number.isFinite(config.palavrasPorEtapa) ? config.palavrasPorEtapa : ''}
                        aria-label={emPares ? 'Portões por etapa' : 'Palavras por etapa'}
                        onChange={(e) => definir('palavrasPorEtapa', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                    />
                    <small>
                        De {LIMITES.palavrasMin} a {maximo}. O padrão é {LIMITES.palavrasPadrao}.{' '}
                        {emPares
                            ? 'Cada portão usa duas palavras diferentes, por isso o máximo é menor.'
                            : 'As palavras que a pessoa deixa passar voltam numa nova volta até ela completar esse número.'}
                    </small>
                </div>
            </section>

            <section className="admin-secao" aria-labelledby="secao-turbo">
                <h2 id="secao-turbo">Turbo</h2>
                <p>Quando a pessoa segura ↑ (ou W, ou toca no botão de acelerar), o avatar corre mais depressa e chega antes ao próximo portão. Aqui você escolhe quanto mais depressa.</p>

                <div className="admin-numero">
                    <input
                        id="turbo-forca"
                        type="number"
                        inputMode="decimal"
                        min={LIMITES.turboMin}
                        max={LIMITES.turboMax}
                        step={0.1}
                        value={Number.isFinite(config.turboForca) ? config.turboForca : ''}
                        aria-label="Força do turbo, em vezes a velocidade normal"
                        onChange={(e) => definir('turboForca', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                    />
                    <small>
                        De {LIMITES.turboMin} a {LIMITES.turboMax} vezes a velocidade normal; o padrão é {String(LIMITES.turboPadrao).replace('.', ',')}. Com 1 o turbo não acelera nada.
                        Quanto maior, menos tempo a pessoa tem para ler as palavras antes de decidir. Com “reduzir movimento” o efeito é menor.
                    </small>
                </div>
            </section>

            <section className="admin-secao" aria-labelledby="secao-animais">
                <h2 id="secao-animais">Animais na corrida</h2>
                <p>De tempos em tempos um animal (lobo, gato, águia ou tubarão) surge, nítido, ao lado do avatar e some. O animal é sorteado e <strong>não tem ligação com o resultado</strong>: é só um efeito.</p>

                <div className="admin-grade">
                    <label className={`admin-opcao${config.animaisNaCorrida ? ' marcada' : ''}`}>
                        <input type="checkbox" checked={config.animaisNaCorrida} onChange={(e) => definir('animaisNaCorrida', e.target.checked)} />
                        <span><strong>Mostrar os animais durante a corrida</strong><small>desligado por padrão; vale para as próximas partidas</small></span>
                    </label>
                </div>

                <div className="admin-numero">
                    <input
                        id="animais-a-cada"
                        type="number"
                        inputMode="numeric"
                        min={LIMITES.animaisACadaMin}
                        max={LIMITES.animaisACadaMax}
                        step={1}
                        disabled={!config.animaisNaCorrida}
                        value={Number.isFinite(config.animaisACada) ? config.animaisACada : ''}
                        aria-label="Mostrar um animal a cada quantas palavras"
                        onChange={(e) => definir('animaisACada', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                    />
                    <small>A cada quantas palavras pegas o animal aparece (de {LIMITES.animaisACadaMin} a {LIMITES.animaisACadaMax}; o padrão é {LIMITES.animaisACadaPadrao}). Ele não aparece na última palavra da etapa.</small>
                </div>

                <div className="admin-numero">
                    <input
                        id="animais-duracao"
                        type="number"
                        inputMode="decimal"
                        min={LIMITES.animaisDuracaoMin}
                        max={LIMITES.animaisDuracaoMax}
                        step={0.5}
                        disabled={!config.animaisNaCorrida}
                        value={Number.isFinite(config.animaisDuracao) ? config.animaisDuracao : ''}
                        aria-label="Quantos segundos o animal fica na tela"
                        onChange={(e) => definir('animaisDuracao', e.target.value === '' ? Number.NaN : Number(e.target.value))}
                    />
                    <small>Quantos segundos o animal fica na tela, do surgir ao sumir (de {LIMITES.animaisDuracaoMin} a {LIMITES.animaisDuracaoMax}; o padrão é {String(LIMITES.animaisDuracaoPadrao).replace('.', ',')}). Um quinto do tempo é para surgir e um quarto para sumir.</small>
                </div>
            </section>

            <section className="admin-secao" aria-labelledby="secao-textos">
                <h2 id="secao-textos">Títulos e textos de explicação</h2>
                <p>Edite o que aparece na tela. Deixe igual ao original para usar o texto padrão. Nas explicações, desmarque “Mostrar” para esconder o texto.</p>

                {textos.filter((definicao) => !definicao.modo || definicao.modo === config.modoPlacas).map((definicao) => {
                    const personalizado = config.textos[definicao.chave];
                    const mostrar = personalizado?.mostrar !== false;
                    const valor = valorDoTexto(definicao);
                    const editado = personalizado?.texto !== undefined;

                    return (
                        <div className={`admin-texto${mostrar ? '' : ' escondido'}`} key={definicao.chave}>
                            <div className="admin-texto-topo">
                                <strong>{definicao.rotulo}</strong>
                                {definicao.podeOcultar && (
                                    <label className="admin-link" style={{ textDecoration: 'none' }}>
                                        <input type="checkbox" checked={mostrar} onChange={(e) => mudarMostrar(definicao.chave, e.target.checked)} /> Mostrar
                                    </label>
                                )}
                            </div>
                            <p className="admin-texto-onde">{definicao.onde}</p>

                            {definicao.longo ? (
                                <textarea
                                    aria-label={definicao.rotulo}
                                    value={valor}
                                    maxLength={LIMITES.textoMax}
                                    onChange={(e) => mudarTexto(definicao, e.target.value)}
                                />
                            ) : (
                                <input
                                    type="text"
                                    aria-label={definicao.rotulo}
                                    value={valor}
                                    maxLength={LIMITES.textoMax}
                                    onChange={(e) => mudarTexto(definicao, e.target.value)}
                                />
                            )}

                            <div className="admin-texto-pe">
                                <span>
                                    {definicao.variaveis?.length
                                        ? <>Marcadores: {definicao.variaveis.map((v) => <span key={v.nome}><code>{`{${v.nome}}`}</code> = {v.descricao}; </span>)}</>
                                        : 'Sem marcadores.'}
                                </span>
                                <span>
                                    {editado && <button type="button" className="admin-link" onClick={() => mudarTexto(definicao, definicao.padrao)}>Restaurar o original</button>}
                                    {' '}
                                    {valor.length}/{LIMITES.textoMax}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </section>

            <div className="admin-barra">
                <div className="admin-barra-conteudo">
                    <button className="botao" type="button" onClick={salvar} disabled={ocupado || avisos.length > 0 || !alterado}>
                        {ocupado ? 'Salvando…' : 'Salvar'}
                    </button>
                    <button className="botao botao--discreto" type="button" onClick={restaurar} disabled={ocupado} style={{ width: 'auto' }}>
                        Voltar ao padrão
                    </button>
                    {mensagem ? (
                        <p className={`mensagem ${mensagem.tipo}`} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}>{mensagem.texto}</p>
                    ) : avisos.length > 0 ? (
                        <p className="mensagem erro" role="alert">Corrija os avisos em vermelho para poder salvar.</p>
                    ) : alterado ? (
                        <p className="mensagem pendente">Há alterações não salvas.</p>
                    ) : (
                        <p className="mensagem">Sem alterações.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
