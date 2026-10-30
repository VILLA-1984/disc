import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Manual de uso · Teste de Perfil DISC',
    description: 'Passo a passo para fazer o Teste de Perfil DISC e orientações para quem aplica o teste.',
};

type Passo = {
    titulo: string;
    imagem: string;
    legenda: string;
    texto: React.ReactNode;
};

const PASSOS: Passo[] = [
    {
        titulo: 'Abra o jogo pelo link ou pelo QR code do evento',
        imagem: '00-abertura.jpg',
        legenda: 'Abertura de um evento: cadastro à esquerda, QR code do evento à direita e o ranking do evento embaixo.',
        texto: (
            <>
                <p>O jogo <strong>sempre acontece dentro de um evento</strong>. Cada evento tem o seu link e o seu <strong>QR code</strong>: aponte a câmera do celular para ele e o jogo abre no aparelho, já no evento certo. No computador, a abertura do evento mostra esse QR code. Se você abrir o endereço principal, a tela só mostra os eventos disponíveis; toque em <strong>Participar</strong> no seu.</p>
                <p>O celular precisa estar na <strong>mesma rede Wi-Fi</strong> do computador que mostra o QR code. No celular, o QR code não aparece: a pessoa já está jogando nele.</p>
            </>
        ),
    },
    {
        titulo: 'Escolha se quer receber o resultado',
        imagem: '01-cadastro.png',
        legenda: 'Com "Sim, quero receber", aparecem os campos de nome e WhatsApp.',
        texto: (
            <>
                <p>Receber o resultado pelo WhatsApp é <strong>opcional</strong>. A tela pergunta <strong>“Quer receber o seu resultado pelo WhatsApp?”</strong>, e o botão só libera depois da sua escolha:</p>
                <ul>
                    <li><strong>Sim, quero receber:</strong> digite o seu nome e o número do WhatsApp com DDD. A máscara <strong>(65) 99999-9999</strong> aparece enquanto você digita. Só o nome e o número ficam guardados, para a equipe enviar o resultado no fim.</li>
                    <li><strong>Não, só quero jogar:</strong> nenhum nome nem telefone é pedido, e o botão vira <strong>Começar a jogar</strong>. Você vê o animal na tela e, no fim, recebe um <strong>ID</strong>: se mudar de ideia, diga o ID e o seu número à equipe em até 5 minutos.</li>
                </ul>
                <p>Em qualquer caso, as palavras que você escolhe <strong>não são gravadas</strong>: só um resumo do resultado, que a equipe usa para o envio.</p>
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
                <p>Digitou um número válido, mas errado? Sem problema: avise a equipe, que corrige o número antes de enviar o resultado.</p>
            </>
        ),
    },
    {
        titulo: 'Leia a apresentação',
        imagem: '03-apresentacao.jpg',
        legenda: 'Apresentação do jogo, com os controles e as regras.',
        texto: (
            <>
                <p>Você vai percorrer um cenário, em duas etapas. Em cada portão aparece <strong>uma palavra</strong> de um lado e <strong>&quot;Deixar passar&quot;</strong> do outro: você pega a palavra se ela combina com você. Não há resposta certa ou errada. (Em alguns eventos a equipe prefere <strong>duas palavras diferentes</strong> por portão: aí você escolhe uma das duas.)</p>
                <p>Não existe limite de tempo: o avatar espera pela sua escolha.</p>
            </>
        ),
    },
    {
        titulo: 'Escolha o avatar, a cor e a vista',
        imagem: '04-avatar.jpg',
        legenda: 'Escolha do avatar, da cor da roupa, do cenário, de como ir (aqui, no Rio) e do jeito de ver o cenário.',
        texto: (
            <>
                <p>Todos os avatares jogam do mesmo jeito; o nome é só um apelido. Escolha também a cor da roupa.</p>
                <p>Em <strong>Onde você quer correr?</strong> escolha o cenário: a <strong>Rua</strong> (de cidade), o <strong>Rio</strong>, o <strong>Céu</strong>, a <strong>Neve</strong> ou os <strong>Trilhos</strong>. Onde há mais de um jeito de ir, aparece <strong>Como você quer ir?</strong>: no rio, por exemplo, de barco, veleiro, caiaque, moto aquática, boia de pato ou a nado; no céu, de avião, jato, helicóptero, asa delta ou parapente; na neve, de esqui, sit-ski ou trenó; nos trilhos, de locomotiva ou draisina. O cenário muda só o visual: as palavras, as regras e o resultado são os mesmos. Nem todo avatar vai em todo cenário ou meio (<strong>moto e táxi, por exemplo, não vão de barco nem pelo céu</strong>), e eles ficam apagados na lista. A equipe também pode liberar só alguns cenários e avatares em cada evento.</p>
                <p>Em <strong>Como você quer ver o cenário?</strong> há duas opções: <strong>Vista 3D</strong> (o avatar corre para a frente) e <strong>Vista lateral</strong> (o avatar corre para o lado, como num jogo clássico). Em telas pequenas, role o cartão para ver essa opção e o botão <strong>Começar</strong>.</p>
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
                <p>Em cada etapa passam as <strong>48 palavras</strong> e você pega um número fixo delas (<strong>12</strong> no padrão; quem aplica o teste pode mudar). As palavras que você deixar passar <strong>voltam mais tarde</strong>, numa nova volta, até você completar esse número; as que você pegou não voltam. Se as palavras que restam forem exatamente as que faltam, elas entram sozinhas. O contador no alto mostra quantas você já pegou e em que volta está.</p>
                <p>Você só passa para a etapa seguinte depois de completar o número de palavras da etapa. As duas etapas usam as mesmas palavras, mas com perguntas diferentes.</p>
                <p>O <strong>minimapa</strong>, no canto superior direito, mostra a largada, a chegada e a sua posição na etapa.</p>
            </>
        ),
    },
    {
        titulo: 'Pegue ou deixe passar em cada portão',
        imagem: '06-portao.jpg',
        legenda: 'Um portão: de um lado a palavra, do outro "Deixar passar".',
        texto: (
            <>
                <p>Normalmente, cada portão tem <strong>duas placas</strong>: uma com a palavra e outra com <strong>Deixar passar</strong> (se a equipe escolheu o modo de duas palavras, cada placa traz uma palavra diferente e você escolhe uma delas). A palavra alterna de lado a cada portão. Cada placa traz uma etiqueta do lado: <strong>← ESQUERDA</strong>, em azul, na placa da esquerda, e <strong>DIREITA →</strong>, em laranja, na da direita. Os botões embaixo do jogo têm as <strong>mesmas cores e ficam do mesmo lado</strong>: o azul à esquerda e o laranja à direita.</p>
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
            <p>Ao completar as palavras da etapa, aparece este aviso. Toque em <strong>Continuar para a etapa 2</strong>; as palavras são as mesmas, mas a pergunta muda.</p>
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
        titulo: 'Fim do jogo: quem envia é a equipe',
        imagem: '09-enviar.png',
        legenda: 'Fim do jogo de quem se cadastrou. Quem joga sem cadastro vê o ID no lugar do aviso de envio.',
        texto: (
            <>
                <p>Depois do resultado, toque em <strong>Continuar</strong>. O jogador <strong>não envia nada pelo próprio celular</strong>: quem envia é a equipe, na tela <strong>/whatsapp</strong>.</p>
                <ul>
                    <li><strong>Quem se cadastrou:</strong> a tela diz que a equipe vai enviar o resultado para o WhatsApp informado (só o DDD e os quatro últimos dígitos aparecem). A equipe vê o resultado na lista e envia.</li>
                    <li><strong>Quem jogou sem cadastro:</strong> a tela mostra um <strong>ID</strong>, como <strong>ABC-123</strong>. Quem quiser receber o resultado diz o ID e o número à equipe. Se não quiser, é só seguir: o resultado é <strong>apagado sozinho em 5 minutos</strong>, e a tela mostra a contagem regressiva.</li>
                </ul>
                <p>Terminou? O botão <strong>Próxima pessoa</strong> volta à abertura do evento, limpa a tela e deixa o jogo pronto para quem vem a seguir.</p>
            </>
        ),
    },
];

const PERGUNTAS: { pergunta: string; resposta: React.ReactNode }[] = [
    {
        pergunta: 'Fechei a página antes de a equipe enviar. O resultado foi perdido?',
        resposta: 'Não, se você se cadastrou: o resultado fica guardado para a equipe enviar. Sem cadastro, o resultado fica disponível por 5 minutos, pelo ID que aparece no fim do jogo; depois disso ele é apagado e é preciso jogar de novo.',
    },
    {
        pergunta: 'O que é o quadro no canto esquerdo do jogo?',
        resposta: 'É o painel de totais do evento: mostra quantas pessoas já terminaram o jogo naquele evento e quantas ficaram com cada animal (Tubarão, Águia, Gato, Lobo ou Equilibrado). São só contadores: não mostram nome nem telefone, e contam também quem jogou sem cadastro. O mesmo ranking aparece na abertura do evento e no telão. No celular aparece só o total.',
    },
    {
        pergunta: 'Preciso informar nome e telefone para jogar?',
        resposta: 'Não. Na primeira tela, escolha “Não, só quero jogar”: nenhum nome nem telefone é pedido. No fim aparece um ID: se mudar de ideia, diga o ID e o número à equipe em até 5 minutos.',
    },
    {
        pergunta: 'Digitei o número errado no começo.',
        resposta: 'Avise a equipe: na tela /whatsapp o número pode ser corrigido antes do envio, e o cadastro é atualizado.',
    },
    {
        pergunta: 'O WhatsApp não abriu na tela de envio (/whatsapp).',
        resposta: 'Use o link “Toque aqui para abrir o WhatsApp” que aparece no aviso da tela. Alguns navegadores bloqueiam a abertura de nova aba.',
    },
    {
        pergunta: 'Abri o endereço e não consigo jogar: só aparece uma lista (ou um aviso).',
        resposta: 'O jogo só abre dentro de um evento. Se aparece uma lista, toque em “Participar” no seu evento. Se aparece “Nenhum evento está recebendo participantes agora” ou “Este evento não está recebendo participantes”, o evento está desligado ou ainda não foi criado: procure a equipe.',
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
                <Link href="/">Escolher o evento</Link>
            </div>

            <p className="manual-intro">
                O <strong>Teste de Perfil DISC</strong> é uma versão em jogo do teste comportamental DISC do SENAC-MT. A pessoa percorre um cenário (rua, rio, céu, neve ou trilhos) e, em cada portão, escolhe entre as palavras que aparecem. No fim, descobre o seu animal e, se quiser, recebe o resultado pelo WhatsApp, enviado pela equipe.
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
                <h3>A área da equipe</h3>
                <ul>
                    <li>Entre em <strong>/admin</strong> com o usuário e a senha da equipe. O <strong>Painel da equipe</strong> mostra um resumo (eventos ligados, resultados a enviar, pessoas sem cadastro) e um botão para cada área. Uma barra no alto, com menu sanduíche no celular, leva a todas elas: <strong>Início</strong>, <strong>Configurações</strong>, <strong>Eventos</strong>, <strong>Envio de resultados</strong>, o jogo e este manual.</li>
                    <li><strong>Configurações</strong> (<strong>/admin/jogo</strong>): quais avatares, cenários e meios ficam liberados, o que aparece na tela (ranking, minimapa, barra de progresso), quantas palavras por etapa, se cada portão traz uma palavra e “Deixar passar” ou duas palavras, a logo e os textos.</li>
                    <li><strong>Eventos</strong> (<strong>/eventos</strong>): crie cada evento, com o seu ranking, link, QR code e telão, e ligue ou desligue quando quiser.</li>
                    <li><strong>Envio de resultados</strong> (<strong>/whatsapp</strong>): enviar o resultado pelo WhatsApp, descrito abaixo.</li>
                    <li>No <strong>telão</strong> (<strong>/e/nome-do-evento/telao</strong>, sem login), acrescente <code>?intervalo=30</code> ao endereço para mudar de quanto em quanto tempo um animal ganha a tela (de 5 a 300 segundos; o padrão é 20).</li>
                </ul>
            </div>

            <div className="manual-bloco">
                <h3>Montar o estande (QR code para jogar no celular)</h3>
                <ul>
                    <li>No computador do estande, rode <code>npm run feira</code>. Ele compila o jogo e o deixa acessível a outros aparelhos da rede, na porta 3000.</li>
                    <li>Entre na área da equipe (<code>http://localhost:3000/admin</code>), crie o evento em <strong>Eventos</strong> e abra o jogo dele nesse computador (<code>/e/nome-do-evento</code>). O QR code da abertura usa sozinho o endereço do computador na rede (por exemplo <code>http://192.168.0.20:3000/e/nome-do-evento</code>).</li>
                    <li>Computador e celulares precisam estar na <strong>mesma rede Wi-Fi</strong>. Redes de eventos costumam isolar os aparelhos entre si: teste antes com um celular. Uma alternativa segura é levar um roteador próprio ou usar o ponto de acesso de um celular.</li>
                    <li>Na primeira execução, o Windows pergunta se o Node.js pode receber conexões: permita na <strong>rede privada</strong>. Sem isso, o celular não consegue abrir o endereço.</li>
                    <li>Se o jogo estiver hospedado na internet, defina <code>RUA_URL_PUBLICA</code> com o endereço real e o QR code passa a usá-lo.</li>
                    <li>Se a rede mudar (outro Wi-Fi), o endereço muda: reabra a página do evento no computador para o QR code ser gerado de novo.</li>
                </ul>
            </div>

            <div className="manual-bloco">
                <h3>No dia da aplicação</h3>
                <ul>
                    <li>Use um navegador atual com WebGL (o jogo foi testado no Edge, no computador). O jogo aceita toque, mas teste antes no aparelho que será usado. Peça para ligar o som.</li>
                    <li><strong>O jogo só abre dentro de um evento.</strong> Se alguém abrir o endereço principal, vê apenas a escolha dos eventos ligados. Crie e ligue o evento antes de começar.</li>
                    <li>Para cada evento, crie-o em <strong>/eventos</strong>: ele ganha o seu link com QR code (<strong>/e/nome-do-evento</strong>), o seu ranking e uma tela de <strong>telão</strong> (<strong>/e/nome-do-evento/telao</strong>), que fica aberta mostrando o ranking e, de tempos em tempos, um animal em destaque com animação. Desligue o evento ao terminar.</li>
                    <li>Deixe a tela <strong>/whatsapp</strong> aberta em um aparelho da equipe (entre com o mesmo usuário e senha do gerenciamento). Ela lista quem terminou o jogo; o botão <strong>Enviar pelo WhatsApp</strong> abre a conversa com a mensagem pronta e <strong>quem toca em Enviar é a equipe</strong>, na conta do aparelho usado. O WhatsApp não permite envio automático sem a API paga da Meta.</li>
                    <li>Quem se cadastrou aparece em <strong>Com cadastro</strong>, com o botão de marcar como enviado. Quem jogou sem cadastro aparece em <strong>Sem cadastro</strong>, pelo ID, com uma barra que mostra quanto falta para o resultado ser apagado (5 minutos). Se a pessoa não quiser receber, use <strong>Descartar resultado</strong>.</li>
                </ul>
            </div>

            <div className="manual-bloco">
                <h3>Dados guardados</h3>
                <ul>
                    <li>Ficam salvos <strong>nome e WhatsApp</strong>, e só de quem escolhe receber o resultado, com as datas de cadastro e de correção, e o <strong>resumo do resultado</strong> (as porcentagens por fator, sem as palavras escolhidas) para a equipe enviar. O banco é o <strong>Turso</strong> (nuvem; é o que o Vercel usa) ou um SQLite embutido no servidor (<code>data/participantes.db</code>, o modo da feira).</li>
                    <li>Quem joga sem cadastro não deixa registro de pessoa: guarda-se só o resumo do resultado e um ID, por <strong>5 minutos</strong>, e depois tudo é apagado. O número que a equipe digita para enviar a um anônimo <strong>nunca é gravado</strong>.</li>
                    <li>O painel de totais do jogo usa um contador à parte: para cada partida concluída guarda só um <strong>código aleatório</strong> (para ela não contar duas vezes), o <strong>evento</strong> e o <strong>animal</strong> do resultado, com ou sem cadastro. Nada disso identifica alguém. A lista pública está em <code>/api/totais</code>.</li>
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
                <Link className="botao" href="/">Escolher o evento e jogar</Link>
            </p>
        </main>
    );
}
