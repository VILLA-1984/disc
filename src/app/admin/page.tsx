import type { Metadata } from 'next';
import Link from 'next/link';
import AdminLogin from '@/components/AdminLogin';
import { IcConfig, IcEventos, IcJogo, IcManual, IcResultados, IcTelao } from '@/components/IconesEquipe';
import NavAdmin from '@/components/NavAdmin';
import { ANIMAIS } from '@/jogo/animals.js';
import { adminAtivo, sessaoAdminValida } from '@/server/admin';
import { listarEnvios } from '@/server/envios';
import { listarEventos } from '@/server/eventos';
import { montarTotais } from '@/server/totais';

// Sempre fresca (o resumo muda a cada partida) e fora dos buscadores.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
    title: 'Painel da equipe · Teste de Perfil DISC',
    robots: { index: false, follow: false },
};

type Ficha = { chave: string; nome: string; cor: string; svgPath: string };
const PERFIS = Object.values(ANIMAIS as unknown as Record<string, Ficha>);

const plural = (n: number, singular: string, mais: string) => `${n} ${n === 1 ? singular : mais}`;

/**
 * Painel da equipe: o ponto de partida. Um resumo do que esta acontecendo e um botao para cada area (configuracoes do
 * jogo, eventos, envio de resultados, o jogo e o manual), mais os links dos eventos que estao ligados.
 */
export default async function PaginaPainel() {
    if (!adminAtivo()) {
        return (
            <main className="pagina">
                <section className="painel" aria-labelledby="titulo-admin-desativado">
                    <h2 id="titulo-admin-desativado">Área da equipe desativada</h2>
                    <p>Para usar esta área, defina as variáveis de ambiente <code>USER_AREA_ADM</code> e <code>PASS_AREA_ADM</code> com o usuário e a senha de acesso e publique de novo.</p>
                </section>
            </main>
        );
    }

    if (!(await sessaoAdminValida())) {
        return (
            <main className="pagina">
                <AdminLogin titulo="Painel da equipe" texto="Digite o usuário e a senha para entrar na área da equipe." />
            </main>
        );
    }

    // O painel abre mesmo se uma das consultas falhar: o numero que faltou aparece como "–".
    const [eventos, envios, semEvento] = await Promise.all([
        listarEventos().catch(() => null),
        listarEnvios().catch(() => null),
        montarTotais(null).catch(() => null),
    ]);

    const ligados = eventos?.filter((e) => e.ativo) ?? [];
    const aEnviar = envios ? envios.cadastrados.filter((c) => c.enviadoEm === null).length : null;
    const semCadastro = envios ? envios.anonimos.length : null;

    const resumo = [
        { rotulo: 'Eventos ligados', valor: eventos ? `${ligados.length} de ${eventos.length}` : '–' },
        { rotulo: 'Resultados a enviar', valor: aEnviar === null ? '–' : String(aEnviar) },
        { rotulo: 'Sem cadastro agora', valor: semCadastro === null ? '–' : String(semCadastro) },
        { rotulo: 'Partidas antigas (sem evento)', valor: semEvento ? String(semEvento.total) : '–' },
    ];

    const areas = [
        {
            href: '/admin/jogo',
            titulo: 'Configurações do jogo',
            texto: 'Avatares, cenários e meios, o que aparece na tela, as placas dos portões, a logo e os textos.',
            icone: <IcConfig tamanho={30} />,
            detalhe: null,
        },
        {
            href: '/eventos',
            titulo: 'Eventos',
            texto: 'Crie os eventos, cada um com o seu ranking, link, QR code e telão. Ligue e desligue quando quiser.',
            icone: <IcEventos tamanho={30} />,
            detalhe: eventos ? `${ligados.length} ligado${ligados.length === 1 ? '' : 's'} de ${eventos.length}` : null,
        },
        {
            href: '/whatsapp',
            titulo: 'Envio de resultados',
            texto: 'Envie o resultado pelo WhatsApp para quem se cadastrou e para quem pediu pelo ID.',
            icone: <IcResultados tamanho={30} />,
            detalhe: aEnviar === null ? null : `${aEnviar} a enviar · ${semCadastro ?? 0} sem cadastro`,
        },
        {
            href: '/',
            titulo: 'Abrir o jogo',
            texto: 'A tela em que as pessoas escolhem o evento. Abre em outra aba.',
            icone: <IcJogo tamanho={30} />,
            detalhe: null,
            novaAba: true,
        },
        {
            href: '/manual',
            titulo: 'Manual',
            texto: 'O passo a passo para quem aplica o teste. Abre em outra aba.',
            icone: <IcManual tamanho={30} />,
            detalhe: null,
            novaAba: true,
        },
    ];

    return (
        <>
            <NavAdmin />
            <main className="pagina">
                <div className="equipe">
                    <section className="equipe-topo" aria-labelledby="titulo-painel">
                        <div>
                            <h1 id="titulo-painel">Painel da equipe</h1>
                            <p>Tudo do Teste de Perfil DISC num só lugar: configure o jogo, crie eventos, envie os resultados e abra os telões.</p>
                        </div>
                        <ul className="equipe-perfis" aria-label="Os quatro perfis do teste">
                            {PERFIS.map((perfil) => (
                                <li key={perfil.chave} style={{ '--cor': perfil.cor } as React.CSSProperties}>
                                    <svg viewBox="0 0 512 512" aria-hidden="true" fill={perfil.cor}><path d={perfil.svgPath} /></svg>
                                    <span>{perfil.nome}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <ul className="equipe-resumo" aria-label="Resumo">
                        {resumo.map((item) => (
                            <li key={item.rotulo}>
                                <strong>{item.valor}</strong>
                                <span>{item.rotulo}</span>
                            </li>
                        ))}
                    </ul>

                    <ul className="equipe-areas" aria-label="Áreas do sistema">
                        {areas.map((area) => (
                            <li key={area.href}>
                                {area.novaAba ? (
                                    <a className="equipe-area" href={area.href} target="_blank" rel="noopener noreferrer">
                                        <span className="equipe-area-icone">{area.icone}</span>
                                        <strong>{area.titulo}</strong>
                                        <span>{area.texto}</span>
                                    </a>
                                ) : (
                                    <Link className="equipe-area" href={area.href}>
                                        <span className="equipe-area-icone">{area.icone}</span>
                                        <strong>{area.titulo}</strong>
                                        <span>{area.texto}</span>
                                        {area.detalhe && <em>{area.detalhe}</em>}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>

                    <section className="admin-secao" aria-labelledby="titulo-eventos-ligados">
                        <h2 id="titulo-eventos-ligados">Links dos eventos ligados</h2>
                        {eventos === null ? (
                            <p className="envios-vazio">Não foi possível carregar os eventos agora.</p>
                        ) : ligados.length === 0 ? (
                            <p className="envios-vazio">Nenhum evento ligado. Crie ou ligue um em <Link href="/eventos">Eventos</Link>.</p>
                        ) : (
                            <ul className="equipe-eventos">
                                {ligados.map((evento) => (
                                    <li key={evento.id}>
                                        <div>
                                            <strong>{evento.nome}</strong>
                                            <span>{plural(evento.total, 'partida', 'partidas')}</span>
                                        </div>
                                        <div className="equipe-eventos-links">
                                            <a className="nav-botao nav-botao--claro" href={`/e/${evento.slug}`} target="_blank" rel="noopener noreferrer"><IcJogo /><span>Jogo</span></a>
                                            <a className="nav-botao nav-botao--claro" href={`/e/${evento.slug}/telao`} target="_blank" rel="noopener noreferrer"><IcTelao /><span>Telão</span></a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
