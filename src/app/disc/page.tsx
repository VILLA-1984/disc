import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'O que é a metodologia DISC · Teste de Perfil DISC',
    description: 'Origem, os quatro fatores, como o jogo usa o DISC, limites da metodologia e as referências usadas.',
};

const FATORES = [
    {
        letra: 'D',
        nome: 'Dominância',
        animal: 'Tubarão',
        texto: 'Foco em resultado, desafio e controle do ambiente. Costuma ser direto, decidido e competitivo; pode soar impaciente.',
        palavras: 'Decidido, Corajoso, Direto, Assertivo',
    },
    {
        letra: 'I',
        nome: 'Influência',
        animal: 'Águia',
        texto: 'Foco em pessoas, comunicação e persuasão. Costuma ser entusiasmado, sociável e otimista; pode perder o foco nos detalhes.',
        palavras: 'Comunicativo, Animado, Persuasivo, Extrovertido',
    },
    {
        letra: 'S',
        nome: 'Estabilidade',
        animal: 'Gato',
        texto: 'Foco em cooperação, constância e segurança. Costuma ser paciente, leal e acolhedor; pode resistir a mudanças bruscas.',
        palavras: 'Paciente, Calmo, Leal, Cooperativo',
    },
    {
        letra: 'C',
        nome: 'Conformidade',
        animal: 'Lobo',
        texto: 'Foco em precisão, regras e qualidade. Costuma ser analítico, organizado e cauteloso; pode ser perfeccionista ou crítico demais.',
        palavras: 'Analítico, Preciso, Metódico, Organizado',
    },
];

const REFERENCIAS = [
    <>MARSTON, William Moulton. <em>Emotions of Normal People</em>. Londres: Kegan Paul, Trench, Trubner &amp; Co., 1928. <strong>Obra base do modelo</strong>: descreve os quatro fatores (dominance, inducement, submission, compliance) que depois viraram o D, I, S e C.</>,
    <>JUNG, Carl Gustav. <em>Psychological Types</em>. 1921 (trad. inglesa: Londres: Routledge &amp; Kegan Paul, 1923). Teoria dos tipos psicológicos, que influenciou as tipologias comportamentais do século XX.</>,
    <>MERENDA, Peter F. Toward a four-factor theory of temperament and/or personality. <em>Journal of Personality Assessment</em>, v. 51, n. 3, p. 367–374, 1987. Revisão de modelos de quatro fatores de temperamento, incluindo o DISC.</>,
    <>GEIER, John G.; DOWNEY, Dorothy E. <em>Energetics of Personality: Defining and Measuring the Human Dynamics of Behavior</em>. Minneapolis: Aristos Publishing House, 1989. Desenvolvimento do instrumento DISC (Personal Profile System) a partir de Marston.</>,
];

export default function Disc() {
    return (
        <main className="pagina manual">
            <div className="cabecalho">
                <h1>O que é a metodologia DISC</h1>
                <Link href="/">Escolher o evento</Link>
            </div>

            <p className="manual-intro">
                <strong>DISC</strong> é um modelo que descreve o <strong>comportamento observável</strong> de uma pessoa em quatro grandes fatores: <strong>D</strong>ominância, <strong>I</strong>nfluência, <strong>E</strong>stabilidade (<em>Steadiness</em>, S) e <strong>C</strong>onformidade. Ele não mede inteligência nem caráter: mostra <em>como</em> a pessoa tende a agir, decidir e se relacionar.
            </p>

            <nav className="manual-indice" aria-label="Nesta página">
                <a href="#origem">Origem</a>
                <a href="#fatores">Os quatro fatores</a>
                <a href="#jogo">No jogo</a>
                <a href="#limites">Limites</a>
                <a href="#referencias">Referências</a>
            </nav>

            <h2 id="origem">Origem</h2>
            <div className="manual-bloco">
                <p>O modelo parte do psicólogo norte-americano <strong>William Moulton Marston</strong>, que em <em>Emotions of Normal People</em> (1928) propôs que as pessoas respondem ao ambiente de quatro formas principais, conforme se percebam mais ou menos poderosas diante dele e o considerem favorável ou desfavorável.</p>
                <p>Marston não criou um teste. As letras DISC e os questionários com listas de adjetivos vieram depois, com autores como <strong>John Geier</strong>, que desenvolveu o <em>Personal Profile System</em> a partir da obra de Marston. Hoje existem várias versões comerciais, com métodos e nomes diferentes para os fatores.</p>
            </div>

            <h2 id="fatores">Os quatro fatores</h2>
            <div className="manual-faq">
                {FATORES.map((f) => (
                    <details key={f.letra} open>
                        <summary>{f.letra} · {f.nome} (animal do jogo: {f.animal})</summary>
                        <p>{f.texto}</p>
                        <p><strong>Palavras típicas:</strong> {f.palavras}.</p>
                    </details>
                ))}
            </div>
            <p style={{ marginTop: 12 }}>Ninguém é de um fator só: cada pessoa combina os quatro em intensidades diferentes. O fator mais forte dá o perfil predominante.</p>

            <h2 id="jogo">Como o jogo usa o DISC</h2>
            <div className="manual-bloco">
                <ul>
                    <li>Cada palavra do jogo pertence a um dos quatro fatores (por exemplo, “Decidido” é D e “Paciente” é S).</li>
                    <li>Em cada portão, a pessoa escolhe as palavras com que mais se identifica; as escolhas são somadas por fator.</li>
                    <li>O fator com mais escolhas define o animal: <strong>D = tubarão, I = águia, S = gato, C = lobo</strong>.</li>
                </ul>
                <p>Veja também o <Link href="/manual">manual de uso</Link>.</p>
            </div>

            <h2 id="limites">Limites</h2>
            <div className="manual-bloco">
                <ul>
                    <li>O DISC descreve <strong>preferências de comportamento</strong>, que mudam conforme o contexto e a fase da vida. Não é diagnóstico psicológico.</li>
                    <li>Instrumentos DISC comerciais têm graus variados de validação científica, e o modelo de Marston não é um dos principais da psicologia da personalidade atual (como o dos Cinco Grandes Fatores).</li>
                    <li>Este jogo é <strong>experimental</strong> e a lista de palavras ainda não foi validada por profissional com formação em DISC. Não use o resultado, sozinho, para decidir contratação ou promoção.</li>
                </ul>
            </div>

            <h2 id="referencias">Referências</h2>
            <ol className="manual-referencias">
                {REFERENCIAS.map((r, i) => (
                    <li key={i}>{r}</li>
                ))}
            </ol>
        </main>
    );
}
