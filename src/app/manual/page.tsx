import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Manual de uso · Rua das Palavras',
    description: 'Passo a passo para jogar a Rua das Palavras e orientações para quem aplica o teste.',
};

type Passo = {
    titulo: string;
    imagem: string;
    legenda: string;
    texto: React.ReactNode;
};

const PASSOS: Passo[] = [
    {
        titulo: 'Abra o jogo no celular ou no computador',
        imagem: '00-abertura.jpg',
        legenda: 'Tela de abertura: cadastro à esquerda e QR code à direita.',
        texto: (
            <>
                <p>No computador, a abertura mostra um <strong>QR code</strong>. Quem quiser jogar no próprio celular aponta a câmera para ele e o jogo abre no aparelho.</p>
                <p>O celular precisa estar na <strong>mesma rede Wi-Fi</strong> do computador que mostra o QR code. No celular, o QR code não aparece: a pessoa já está jogando nele.</p>
            </>
        ),
    },
    {
        titulo: 'Escolha se quer receber o resultado',
        imagem: '01-cadastro.png',
        legenda: 'Com "Sim, quero receber", aparecem os campos de nome e WhatsApp. (O print mostra a tela de uma versão anterior.)',
        texto: (
            <>
                <p>Receber o resultado pelo WhatsApp é <strong>opcional</strong>. A tela pergunta <strong>“Quer receber o seu resultado pelo WhatsApp?”</strong>, e o botão só libera depois da sua escolha:</p>
                <ul>
                    <li><strong>Sim, quero receber:</strong> digite o seu nome e o número do WhatsApp com DDD. A máscara <strong>(65) 99999-9999</strong> aparece enquanto você digita. Só o nome e o número ficam guardados, para o resultado ser enviado no fim.</li>
                    <li><strong>Não, só quero jogar:</strong> nada é pedido nem guardado, e o botão vira <strong>Começar a jogar</strong>. Você vê o animal na tela e, no fim, ainda pode pedir o resultado pelo WhatsApp.</li>
                </ul>
                <p>Em qualquer caso, as suas escolhas no jogo <strong>não são gravadas</strong>.</p>
            </>
        ),
    },
    {
        titulo: 'Corrija o número se o aviso aparecer',
        imagem: '02-numero-incompleto.png',
        legenda: 'Aviso de número incompleto: faltou o 9 do celular.',
        texto: (
            <>
                <p>O WhatsApp precisa de <strong>DDD + 9 dígitos</strong> (11 números no total). Se faltar algo, a tela explica o que é, e o jogo só começa depois de o número estar certo.</p>
                <p>Digitou um número válido, mas errado? Sem problema: você poderá trocá-lo no final, antes de enviar.</p>
            </>
        ),
    },
    {
        titulo: 'Leia a apresentação',
        imagem: '03-apresentacao.jpg',
        legenda: 'Apresentação do jogo, com os controles e as regras.',
        texto: (
            <>
                <p>Você vai correr por uma rua, em duas etapas. Em cada portão aparece <strong>uma palavra</strong> de um lado e <strong>&quot;Deixar passar&quot;</strong> do outro: você pega a palavra se ela combina com você. Não há resposta certa ou errada.</p>
                <p>Não existe limite de tempo: o avatar espera pela sua escolha.</p>
            </>
        ),
    },
    {
        titulo: 'Escolha o avatar, a cor e a vista',
        imagem: '04-avatar.jpg',
        legenda: 'Escolha do avatar, da cor da roupa e do jeito de ver a rua.',
        texto: (
            <>
                <p>Todos os avatares jogam do mesmo jeito; o nome é só um apelido. Escolha também a cor da roupa.</p>
                <p>Em <strong>Onde você quer correr?</strong> escolha o cenário: a <strong>Rua</strong> (de cidade) ou o <strong>Rio</strong>, percorrido de barco, de colete salva-vidas. O cenário muda só o visual: as palavras, as regras e o resultado são os mesmos. Alguns avatares não vão em todos os cenários: <strong>moto e táxi não vão de barco</strong>, e ficam apagados na lista quando o Rio está marcado.</p>
                <p>Em <strong>Como você quer ver a rua?</strong> há duas opções: <strong>Vista 3D</strong> (o avatar corre para a frente) e <strong>Vista lateral</strong> (o avatar corre para o lado, como num jogo clássico). Em telas pequenas, role o cartão para ver essa opção e o botão <strong>Começar</strong>.</p>
            </>
        ),
    },
    {
        titulo: 'Entenda a etapa',
        imagem: '05-etapa.jpg',
        legenda: 'Cartão que explica o que pensar em cada etapa.',
        texto: (
            <>
                <p>O jogo tem duas etapas, e a pergunta em cada uma é diferente:</p>
                <ul>
                    <li><strong>Etapa 1 · Como você é:</strong> pense em como você é naturalmente, no dia a dia.</li>
                    <li><strong>Etapa 2 · Como esperam de você:</strong> pense em como você acredita que esperam que você seja no trabalho.</li>
                </ul>
                <p>Em cada etapa passam as <strong>48 palavras</strong> e você pega <strong>24</strong>. As palavras que você deixar passar <strong>voltam mais tarde</strong>, numa nova volta, até você completar as 24; as que você pegou não voltam. Se as palavras que restam forem exatamente as que faltam, elas entram sozinhas. O contador no alto mostra quantas você já pegou e em que volta está.</p>
                <p>Você só passa para a etapa seguinte depois de completar as 24. As duas etapas usam as mesmas palavras, mas com perguntas diferentes.</p>
                <p>O <strong>minimapa</strong>, no canto superior direito, mostra a largada, a chegada e a sua posição na etapa.</p>
            </>
        ),
    },
    {
        titulo: 'Pegue ou deixe passar em cada portão',
        imagem: '06-portao.jpg',
        legenda: 'Imagem de uma versão anterior, com duas palavras; hoje uma placa traz a palavra e a outra, "Deixar passar".',
        texto: (
            <>
                <p>Cada portão tem <strong>duas placas</strong>: uma com a palavra e outra com <strong>Deixar passar</strong>. A palavra alterna de lado a cada portão. Cada placa traz uma etiqueta do lado: <strong>← ESQUERDA</strong>, em azul, na placa da esquerda, e <strong>DIREITA →</strong>, em laranja, na da direita. Os botões embaixo do jogo têm as <strong>mesmas cores e ficam do mesmo lado</strong>: o azul à esquerda e o laranja à direita.</p>
                <p>Quando o avatar chega ao portão e as palavras aparecem, escolha de um destes jeitos:</p>
                <ul>
                    <li><strong>Toque ou clique na placa</strong> da palavra escolhida;</li>
                    <li>use as setas <strong>← →</strong> do teclado (ou as teclas <strong>A</strong> e <strong>D</strong>);</li>
                    <li>ou use os <strong>dois botões</strong> embaixo do jogo.</li>
                </ul>
                <p>Leia a palavra antes de decidir: depois de decidir, não dá para trocar. Se você deixar passar, ela volta numa volta seguinte.</p>
                <p>Para correr mais rápido, segure <strong>↑</strong> (ou <strong>W</strong>) na vista 3D. Na vista lateral, as escolhas usam ↑ ↓ (cima e baixo) e se corre com →.</p>
                <p>No alto da tela ficam a etapa, a barra de progresso e o clima da rua. O botão <strong>Som</strong>, no canto, liga e desliga o som.</p>
            </>
        ),
    },
    {
        titulo: 'No celular',
        imagem: '11-celular-portao.jpg',
        legenda: 'No celular: botões lado a lado e botão para correr mais rápido.',
        texto: (
            <>
                <p>Segure o aparelho em pé. A rua ocupa a tela e as duas palavras aparecem em <strong>dois botões grandes, lado a lado</strong>: azul à esquerda e laranja à direita.</p>
                <p>Como o celular não tem a tecla ↑, existe o botão <strong>Segure para correr mais rápido</strong>: o avatar acelera enquanto você mantém o dedo nele. Para escolher, toque na placa ou em um dos botões.</p>
            </>
        ),
    },
    {
        titulo: 'Conclua a primeira etapa',
        imagem: '07-etapa-concluida.jpg',
        legenda: 'Aviso ao terminar a etapa 1.',
        texto: (
            <p>Ao completar as 24 palavras, aparece este aviso. Toque em <strong>Continuar para a etapa 2</strong>; as palavras são as mesmas, mas a pergunta muda.</p>
        ),
    },
    {
        titulo: 'Descubra o seu animal',
        imagem: '08-resultado.jpg',
        legenda: 'Resultado: o animal, o superpoder, o ponto de atenção e as barras por animal.',
        texto: (
            <>
                <p>Ao terminar a etapa 2, toque em <strong>Descobrir meu animal</strong>. Depois de uma pequena animação, o resultado mostra:</p>
                <ul>
                    <li>o <strong>animal principal</strong> e, quando as escolhas ficaram próximas, <strong>traços de um segundo animal</strong>;</li>
                    <li>o <strong>superpoder</strong> e o <strong>ponto de atenção</strong> desse estilo;</li>
                    <li>as <strong>barras por animal</strong>: a barra colorida mostra “como você é” e o traço escuro marca “como esperam de você”.</li>
                </ul>
                <p>Se as escolhas ficaram bem distribuídas, o resultado é <strong>equilibrado</strong>: nenhum animal predomina. Isso costuma indicar flexibilidade ou um momento de transição.</p>
                <p>Os botões <strong>Pular animação</strong> e <strong>Reduzir efeitos</strong> ficam no canto da tela.</p>
            </>
        ),
    },
    {
        titulo: 'Confira o número e envie pelo WhatsApp',
        imagem: '09-enviar.png',
        legenda: 'Tela de envio, com o número digitado no início.',
        texto: (
            <>
                <p>Na tela final, confira o número. É o momento de corrigir se você digitou errado no início.</p>
                <p>Toque em <strong>Enviar pelo WhatsApp</strong>: o WhatsApp abre na conversa com esse número, com a mensagem do resultado pronta. Basta tocar em enviar dentro do WhatsApp.</p>
            </>
        ),
    },
    {
        titulo: 'Número corrigido',
        imagem: '10-numero-corrigido.png',
        legenda: 'Aviso de que o número foi atualizado.',
        texto: (
            <>
                <p>Se você trocou o número, o aviso <strong>Número atualizado</strong> confirma que o cadastro foi corrigido antes de abrir o WhatsApp.</p>
                <p>O WhatsApp não abriu? Use o link <strong>Toque aqui para abrir</strong>, ou o botão <strong>Copiar a mensagem</strong> e cole a mensagem na conversa.</p>
                <p>Jogou sem cadastro? A tela final pergunta <strong>“Quer receber o resultado?”</strong>: informe o nome e o número para receber (o cadastro só é criado nesse momento) ou toque em <strong>Não, obrigado · próxima pessoa</strong>, e nada seu fica guardado.</p>
                <p>Terminou? O botão <strong>Próxima pessoa</strong> volta à abertura, limpa a tela e deixa o jogo pronto para quem vem a seguir.</p>
            </>
        ),
    },
];

const PERGUNTAS: { pergunta: string; resposta: React.ReactNode }[] = [
    {
        pergunta: 'Fechei a página antes de enviar. O resultado foi perdido?',
        resposta: 'Sim. O resultado não é gravado: aparece na tela e segue na mensagem do WhatsApp. Se a página for fechada antes do envio, é preciso jogar de novo.',
    },
    {
        pergunta: 'O que é o quadro no canto esquerdo do jogo?',
        resposta: 'É o painel de totais: mostra quantas pessoas já terminaram o jogo e quantas ficaram com cada animal (Tubarão, Águia, Gato, Lobo ou Equilibrado). São só contadores: não mostram nome nem telefone, e contam também quem jogou sem cadastro. No celular aparece só o total.',
    },
    {
        pergunta: 'Preciso informar nome e telefone para jogar?',
        resposta: 'Não. Na primeira tela, escolha “Não, só quero jogar”: nada pessoal é pedido nem guardado. Se mudar de ideia, a tela final deixa pedir o resultado pelo WhatsApp.',
    },
    {
        pergunta: 'Digitei o número errado no começo.',
        resposta: 'Corrija na tela final, antes de tocar em Enviar pelo WhatsApp. O cadastro é atualizado com o número novo.',
    },
    {
        pergunta: 'O WhatsApp não abriu.',
        resposta: 'Use o link “Toque aqui para abrir” que aparece na tela, ou copie a mensagem e cole na conversa. Alguns navegadores bloqueiam a abertura de nova aba.',
    },
    {
        pergunta: 'Aparece que o navegador não consegue exibir o jogo.',
        resposta: 'O jogo usa gráficos 3D (WebGL). Abra a página em outro navegador ou em outro aparelho.',
    },
    {
        pergunta: 'O resultado mostrou “perfil equilibrado”. Está errado?',
        resposta: 'Não. Significa que as escolhas ficaram distribuídas entre os quatro animais, sem um estilo dominante.',
    },
    {
        pergunta: 'O resultado é um diagnóstico? Posso comparar pessoas?',
        resposta: 'Não. É uma leitura lúdica das escolhas do momento, baseada no modelo DISC de quatro fatores. Como cada pessoa escolhe entre duas palavras, os percentuais mostram a proporção dentro dela mesma, e por isso não servem para ranquear ou comparar pessoas entre si.',
    },
];

export default function Manual() {
    return (
        <main className="pagina manual">
            <div className="cabecalho">
                <h1>Manual de uso</h1>
                <Link href="/">Voltar ao jogo</Link>
            </div>

            <p className="manual-intro">
                A <strong>Rua das Palavras</strong> é uma versão em jogo do teste comportamental DISC do SENAC-MT. A pessoa corre por uma rua e, em cada portão, escolhe uma entre duas palavras. No fim, descobre o seu animal e recebe o resultado pelo WhatsApp.
            </p>

            <nav className="manual-indice" aria-label="Neste manual">
                <a href="#jogar">Para quem vai jogar</a>
                <a href="#aplicar">Para quem aplica o teste</a>
                <a href="#duvidas">Dúvidas frequentes</a>
            </nav>

            <h2 id="jogar">Para quem vai jogar</h2>

            <ol className="manual-passos">
                {PASSOS.map((passo) => (
                    <li key={passo.imagem}>
                        <h3>{passo.titulo}</h3>
                        <div className="manual-passo">
                            <figure>
                                <img src={`/manual/${passo.imagem}`} alt={passo.legenda} loading="lazy" />
                                <figcaption>{passo.legenda}</figcaption>
                            </figure>
                            <div className="manual-texto">{passo.texto}</div>
                        </div>
                    </li>
                ))}
            </ol>

            <h2 id="aplicar">Para quem aplica o teste</h2>

            <div className="manual-bloco">
                <h3>Antes de usar com candidatos</h3>
                <ul>
                    <li>A lista de palavras ainda é um <strong>rascunho, não validado por profissional com formação em DISC</strong>. Revise palavra por palavra antes de aplicar em candidato real.</li>
                    <li>O resultado é <strong>experimental</strong>: a escolha entre duas palavras não equivale à marcação livre de uma lista, então não deve ser tratado como o relatório oficial.</li>
                    <li>Faça uma primeira rodada com pessoas da equipe para ver se as telas e as palavras fazem sentido.</li>
                </ul>
            </div>

            <div className="manual-bloco">
                <h3>Montar o estande (QR code para jogar no celular)</h3>
                <ul>
                    <li>No computador do estande, rode <code>npm run feira</code>. Ele compila o jogo e o deixa acessível a outros aparelhos da rede, na porta 3000.</li>
                    <li>Abra <code>http://localhost:3000</code> nesse computador. O QR code da abertura usa sozinho o endereço do computador na rede (por exemplo <code>http://192.168.0.20:3000</code>).</li>
                    <li>Computador e celulares precisam estar na <strong>mesma rede Wi-Fi</strong>. Redes de eventos costumam isolar os aparelhos entre si: teste antes com um celular. Uma alternativa segura é levar um roteador próprio ou usar o ponto de acesso de um celular.</li>
                    <li>Na primeira execução, o Windows pergunta se o Node.js pode receber conexões: permita na <strong>rede privada</strong>. Sem isso, o celular não consegue abrir o endereço.</li>
                    <li>Se o jogo estiver hospedado na internet, defina <code>RUA_URL_PUBLICA</code> com o endereço real e o QR code passa a usá-lo.</li>
                    <li>Se a rede mudar (outro Wi-Fi), o endereço muda: reabra a página no computador para o QR code ser gerado de novo.</li>
                </ul>
            </div>

            <div className="manual-bloco">
                <h3>No dia da aplicação</h3>
                <ul>
                    <li>Use um navegador atual com WebGL (o jogo foi testado no Edge, no computador). O jogo aceita toque, mas teste antes no aparelho que será usado. Peça para ligar o som.</li>
                    <li>O WhatsApp abre <strong>na conta do aparelho usado</strong>, já na conversa com o número informado. Quem toca em Enviar é a pessoa que está com o aparelho: se o jogo for feito no seu celular, a mensagem sai da sua conta para o número do participante.</li>
                    <li>Peça que a pessoa só feche a página depois de enviar. O resultado não fica guardado.</li>
                </ul>
            </div>

            <div className="manual-bloco">
                <h3>Dados guardados</h3>
                <ul>
                    <li>Ficam salvos apenas <strong>nome e WhatsApp</strong>, e só de quem escolhe receber o resultado, com as datas de cadastro e de correção. O banco é o <strong>Turso</strong> (nuvem; é o que o Vercel usa) ou um SQLite embutido no servidor (<code>data/participantes.db</code>, o modo da feira). Quem joga sem cadastro não deixa nenhum registro de pessoa.</li>
                    <li>O painel de totais do jogo usa um contador à parte: para cada partida concluída guarda só um <strong>código aleatório</strong> (para ela não contar duas vezes) e o <strong>animal</strong> do resultado, com ou sem cadastro. Nada disso identifica alguém. A lista pública está em <code>/api/totais</code>.</li>
                    <li>Para exportar os cadastros: <code>npm run exportar &gt; participantes.csv</code>.</li>
                    <li>São dados pessoais (LGPD). Defina quem acessa o arquivo, por quanto tempo ele é mantido e faça backup da pasta <code>data</code> se os cadastros importarem.</li>
                </ul>
            </div>

            <h2 id="duvidas">Dúvidas frequentes</h2>

            <div className="manual-faq">
                {PERGUNTAS.map((item) => (
                    <details key={item.pergunta}>
                        <summary>{item.pergunta}</summary>
                        <p>{item.resposta}</p>
                    </details>
                ))}
            </div>

            <p className="manual-fim">
                <Link className="botao" href="/">Começar o jogo</Link>
            </p>
        </main>
    );
}
