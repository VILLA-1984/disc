import Link from 'next/link';
import { textoDe } from '@/lib/configuracao';
import { carregarConfiguracao } from '@/server/configuracao';
import { listarEventos } from '@/server/eventos';
import { logoEmUso } from '@/server/logo';

// Os eventos sao ligados e desligados a qualquer hora: nada de pagina guardada em cache.
export const dynamic = 'force-dynamic';

/**
 * Tela inicial: o jogo nunca abre solto, so dentro de um evento. Aqui a pessoa escolhe o evento (so aparecem os que
 * estao ligados); o link ou o QR code de cada evento leva direto a ele.
 */
export default async function Pagina() {
    const [config, logo, eventos] = await Promise.all([carregarConfiguracao(), logoEmUso(), listarEventos().catch(() => null)]);
    const titulo = textoDe(config.textos, 'titulo_geral');
    const ligados = eventos?.filter((evento) => evento.ativo) ?? [];

    return (
        <main className="pagina">
            <div className="abertura abertura--escolha">
                {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={`logo-abertura${logo.escuro ? ' logo-sobre-escuro' : ''}`} src={logo.src} alt={titulo} />
                )}

                <section className="painel" aria-labelledby="titulo-escolha">
                    <h2 id="titulo-escolha">{titulo}</h2>

                    {eventos === null ? (
                        <p className="aviso-dados">Não foi possível carregar os eventos agora. Recarregue a página em instantes.</p>
                    ) : ligados.length === 0 ? (
                        <>
                            <p>Nenhum evento está recebendo participantes agora.</p>
                            <p className="aviso-dados">Procure a equipe para saber quando o teste estará disponível.</p>
                        </>
                    ) : (
                        <>
                            <p>Escolha o evento em que você vai participar.</p>
                            <ul className="eventos-escolha">
                                {ligados.map((evento) => (
                                    <li key={evento.id}>
                                        <Link className="evento-escolha" href={`/e/${evento.slug}`}>
                                            <span>{evento.nome}</span>
                                            <b aria-hidden="true">Participar →</b>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}
