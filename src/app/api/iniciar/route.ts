import { normalizarWhatsapp, problemaNoWhatsapp } from '@/lib/whatsapp';
import { escolherPorEtapa, montarCiclo, tamanhoDoPool } from '@/server/ciclo';
import { carregarConfiguracao } from '@/server/configuracao';
import { criarParticipante } from '@/server/db';
import { montarRodada, portoesPorEtapa, RodadaInvalida } from '@/server/gameRound';
import { PALAVRA_POR_ID, PALAVRAS } from '@/server/palavras';
import { assinar } from '@/server/token';

/**
 * Cadastra nome e WhatsApp, monta a partida no servidor e devolve so id e texto das palavras.
 * Modo padrao: ciclo (uma palavra por vez; RUA_MODO=pares volta aos portoes com duas palavras).
 */
export async function POST(request: Request) {
    const corpo = (await request.json().catch(() => null)) as { nome?: unknown; whatsapp?: unknown; anonimo?: unknown } | null;

    // Receber o resultado pelo WhatsApp e opcional: sem cadastro (anonimo) nada pessoal e pedido nem guardado.
    const anonimo = corpo?.anonimo === true;
    const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim().replace(/\s+/g, ' ') : '';
    const whatsappInformado = typeof corpo?.whatsapp === 'string' ? corpo.whatsapp : '';
    let whatsapp: string | null = null;

    if (!anonimo) {
        if (nome.length < 2 || nome.length > 80) {
            return Response.json({ erro: 'Informe o seu nome (entre 2 e 80 letras).' }, { status: 422 });
        }

        whatsapp = normalizarWhatsapp(whatsappInformado);

        if (!whatsapp) {
            return Response.json({ erro: problemaNoWhatsapp(whatsappInformado) }, { status: 422 });
        }
    }

    const emPares = process.env.RUA_MODO === 'pares';
    let rodada;
    let ciclo;

    try {
        if (emPares) {
            rodada = montarRodada(PALAVRAS, portoesPorEtapa(Number(process.env.RUA_PORTOES) || null));
        } else {
            // Quantas palavras marcar por etapa vem da area de gerenciamento (padrao 12); a lista toda passa na
            // partida, a menos que RUA_PALAVRAS peca um conjunto menor.
            const { palavrasPorEtapa } = await carregarConfiguracao();
            const tamanho = tamanhoDoPool(PALAVRAS.length, Number(process.env.RUA_PALAVRAS) || null);
            ciclo = montarCiclo(PALAVRAS, escolherPorEtapa(tamanho, palavrasPorEtapa), undefined, tamanho);
        }
    } catch (erro) {
        if (erro instanceof RodadaInvalida) {
            return Response.json({ erro: 'O teste ainda não está pronto. Avise o responsável.' }, { status: 503 });
        }

        throw erro;
    }

    // Id 0 = partida sem cadastro (nenhuma linha no banco). Se a pessoa quiser receber o resultado no fim,
    // /api/whatsapp cadastra nessa hora e devolve um token com o id novo.
    let participanteId = 0;

    try {
        if (!anonimo) {
            participanteId = await criarParticipante(nome, whatsapp as string);
        }
    } catch (erro) {
        // Banco indisponivel (por exemplo, Turso fora do ar ou token errado): nao deixa a pessoa sem saber o que houve.
        console.error('Falha ao gravar o cadastro:', erro);

        return Response.json({ erro: 'Não foi possível gravar o seu cadastro agora. Tente de novo em instantes.' }, { status: 503 });
    }

    if (ciclo) {
        // So as palavras desta partida vao ao navegador (cada volta traz todas elas, entao a primeira ordem as lista).
        const palavras = Object.fromEntries(ciclo.etapas[0][0].map((id) => [id, PALAVRA_POR_ID.get(id)!.word]));

        return Response.json({ token: assinar(participanteId, ciclo), ciclo: { ...ciclo, palavras } });
    }

    const palavra = (id: number) => ({ id, word: PALAVRA_POR_ID.get(id)!.word });
    const etapas = rodada!.map((portoes) => portoes.map((p) => ({ cima: palavra(p.top), baixo: palavra(p.bottom) })));

    return Response.json({ token: assinar(participanteId, rodada!), etapas });
}
