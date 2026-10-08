# Demonstração interativa msgX / msgGX

Abra `index.html` no navegador. Não há dependências, compilação ou chamadas de rede.
Para servir o projeto localmente:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Acesse `http://127.0.0.1:8000/`, executando o comando na pasta do simulador.

## Repositório

```bash
git clone https://github.com/mdo-br/msgx_simulator.git
cd msgx_simulator
python3 -m http.server 8000 --bind 127.0.0.1
```

Este repositório versiona somente o conteúdo da pasta `simulador` do projeto
de origem. O `index.html` fica na raiz do repositório, pronto para hospedagem
estática. Os arquivos do artigo e das figuras permanecem no projeto de origem.

Para publicar, basta enviar `index.html`, `style.css`, `app.js`, `flow-data.js`
e `operations.js` na mesma pasta. O artigo é acessado pela URL da SBC Open
Library; não é necessário publicar PDFs, arquivos `.drawio`, Markdown ou LaTeX.
Os links da interface não dependem de arquivos fora dessa pasta.

## Recursos

- A tela inicial de Alice mostra “Welcome, Alice” e “Register”. O registro
  fictício não pede dados: gera bundles independentes Γ e Σ, cada um com
  IK, EK, PQE e assinatura própria, e publica os bundles públicos no HS_A,
  com animação no diagrama e atualização do
  inspetor. Só então a lista de contatos fica disponível.
- Depois do registro, clique em Bob, escreva a mensagem e clique em Send ou
  pressione Enter. A mensagem aparece imediatamente como pendente.
- Os bundles Γ e Σ de Bob já estão publicados no HS_B ao iniciar. Suas
  chaves locais aparecem no inspetor; não há animação de geração/upload de Bob.
- O primeiro envio executa automaticamente consulta de pré-chaves,
  verificação, acordo de chaves, proteção e entrega do setup e envio do evento.
  Bob recebe a mensagem sem precisar confirmar operações do protocolo.
- Os envios seguintes reutilizam a sessão; a renovação por R acontece em
  segundo plano. A interface do aplicativo mostra apenas conversa e entrega.
- Bob pode desligar após a inicialização. Envelopes de mensagens e setups ficam
  em uma fila simbólica no HS_B; ao religar, são processados em ordem e os
  estados do receptor e os indicadores de entrega são atualizados.
- Percurso dos oito passos restantes, dividido nas quatro fases dos diagramas
  v4. A numeração original ②–⑨ é preservada; ① é uma precondição já cumprida.
- Diagrama e inspetor acompanham automaticamente as operações, com velocidade
  ajustável. Clique em um passo ou operação para consultar seus detalhes;
  a consulta permanece selecionada durante os envios, sem alterar o estado
  dos participantes. “Acompanhar execução” retorna à operação em andamento.
  Os títulos e operações também são acessíveis pelo teclado (Tab/Enter).
- Cada passo exibido é decomposto em operações automáticas: entradas,
  participante/local de execução, fórmula, saída e referência ao `main.pdf`.
  `operations.js` contém o detalhamento; `flow-data.js` preserva os diagramas.
  O intervalo controla a duração de cada operação individual: 3 segundos
  por padrão, com opções de 5 s, 1,5 s e 0,75 s. A rolagem mantém o passo
  inteiro visível quando cabe; em passos maiores, mantém a operação ativa
  visível com margem, usando as coordenadas da área rolável. A entrada de
  cada novo passo alinha seu cabeçalho no topo, mesmo em passos maiores
  que a janela. Atualizações do diagrama preservam a posição de rolagem.
- Percurso Alice → HS_A → HS_B → Bob, com resposta na direção inversa.
- Inspetor simbólico separado por participante e por ramo Γ / Σ.
- Mensagens de Alice, envelope em duas camadas e contagem de eventos.
- Renovação automática a cada R mensagens e timeout manual.
- G membros; R e G reiniciam o estado. O parâmetro PQ p fica desativado neste cenário sem nova T de Bob.

As fórmulas e direções foram extraídas dos arquivos `.drawio` do projeto de
origem. Para regenerar os dados em um clone independente, use:

```bash
python3 extract_flow.py --source-root /caminho/para/o/projeto-de-origem
```

No projeto de origem, `python3 simulador/extract_flow.py` continua funcionando.
Os diagramas originais são necessários somente para regenerar os dados.
`flow-data.js` é versionável e permite abrir o HTML diretamente, sem servidor.

## Fidelidade e limites

Referência citada na interface: [artigo msgX · SBSeg 2026](https://sol.sbc.org.br/index.php/sbseg/article/view/44327).
As citações das operações incluem link para a página do artigo na SBC Open Library e seção/figura do artigo.
A leitura usou o `main.pdf` e os arquivos `.drawio` do projeto de origem.
Esses arquivos não integram este repositório e não são necessários para
executar ou publicar o simulador.
O detalhamento usa diretamente a seção 3 do PDF (pp. 5–9), suas Figuras 2–5,
e ressalvas da seção 4. O detalhamento está em `operations.js`, com as
referências ao artigo mostradas durante a simulação.

O registro de Alice é uma preparação didática adicional, identificada no
diagrama antes dos nove passos v4. Não representa autenticação real junto ao
homeserver. O registro gera os pares IK, EK e PQE de cada ramo e assina suas
pré-chaves com a identidade daquele ramo. O bundle publicado contém somente
IK pública, EK pública, PQE pública e assinatura; as chaves privadas ficam
no cliente. O primeiro envio estabelece a sessão com Bob. Reiniciar também
desfaz o registro simbólico.

A ordem das camadas segue os diagramas v4: Γ interna e Σ externa. Algumas
fórmulas de `anatomia-dois-ramos-msgX.md` usam a ordem inversa. No passo ③,
o diagrama aborta se qualquer verificação falhar:
`¬verify(Γ.Sig) ∨ ¬verify(Σ.Sig) → abort`. Nos diagramas, G é o tamanho da
sala e N aparece apenas como expoente PQ (`2^N·n`), como na §3.4 do artigo.
A PreKeyMessage explicita as identidades públicas de Alice, necessárias ao
DH₁ de Bob, e os identificadores das pré-chaves de Bob.

Todos os artefatos são simbólicos. O protótipo não implementa ECDH, KEM,
HKDF, HMAC, AES ou o transporte Matrix. Os estados msgX (controle) e msgGX
(grupo) são identificados separadamente. Não atribua garantias de segurança
a esta demonstração.

Somente Alice envia. Sem nova chave de ratchet T de Bob, cada renovação
msgGX avança apenas as cadeias msgX, conforme a §3.4 e a Figura 4:
Γ.C_i,j = HMAC(Γ.C_i,j−1, 0x2) e Σ.C_i,j = HMAC(Σ.C_i,j−1, 0x4).
As message keys são derivadas com 0x1/0x3 (Figura 5). As raízes permanecem
em R₀ e i = 0; j avança independentemente da sessão e do índice de mensagens
msgGX. Bob só atualiza seu estado ao receber cada setup, inclusive após
reconectar. Não há novo ECDH, preparação ou reinjeção PQ nas renovações;
o acordo inicial permanece híbrido. Esse avanço simétrico não demonstra
recuperação após comprometimento da cadeia. O parâmetro p está desativado.

Não são simulados avanços de raiz com nova T, alternância de papéis,
encapsulamento/retorno KEM nas renovações, mensagens fora de ordem,
falha de assinatura, autenticação de dispositivos ou entrada/saída de membros.

O tamanho da sala controla a contagem de G−1 canais; apenas Alice/Bob são
exibidos. Um evento é publicado pelo remetente, mas há distribuição federada.
O timeout é manual, por um controle externo ao aplicativo. Reiniciar limpa
a conversa e cancela operações pendentes. Alterar parâmetros também reinicia.
O histórico didático não representa o armazenamento seguro de chaves reais.
Os celulares mostram apenas Alice como remetente e Bob como destinatário,
conforme os diagramas. O cenário offline começa após o setup inicial e não
representa persistência real, retransmissão ou tratamento de perdas. Offline, os setups aguardam na fila e Bob reproduz os avanços de cadeia
somente ao recebê-los, em ordem.

## Inspiração

A interface e a proposta de visualização interativa foram inspiradas no
[Signal Protocol Interactive Demo, hospedado na Bilkent University](https://cs.bilkent.edu.tr/~talayhan/teaching/signal.html),
e adaptadas aos protocolos msgX e msgGX.

As citações usam a URL da SBC Open Library. A cópia local do PDF permanece
no projeto de origem como base do detalhamento.

O estado de cada participante separa `msgX: {i, j}` de
`msgGX: {session, index}`. A regra PQ usa somente `i`: preparação quando
`i > 0` e `i mod 2ᵖ = 2ᵖ − 1`; reinjeção quando `i > 0` e
`i mod 2ᵖ = 0`. Essas condições identificam etapas de avanço de raiz e
não substituem o intercâmbio de material necessário. `i = 0` não é reinjeção.

Alice mantém `EK_A_bundle` como pré-chave publicada para receber sessões.
No passo ③, gera uma nova `EK_A` por ramo para iniciar o acordo com Bob,
antes dos ECDH. A privada dessa efêmera de sessão é descartada após a
derivação; a pública é mantida para compor a PreKeyMessage. O inspetor
separa esses ciclos de vida. Todos esses identificadores são simbólicos.

No modelo, EK_B e PQE_B de ambos os ramos são pré-chaves de uso único:
o HS_B as retira do estoque durante o claim (passo ②), mantendo IK_B.
Bob conserva as privadas até concluir o acordo e autenticar o setup (passo ⑥),
quando elas são marcadas como apagadas. A identidade e os estados derivados
permanecem. O artigo descreve as efêmeras, mas não detalha a política de
estoque, reposição ou fallback PQ; tratar PQE como uso único é uma escolha
explícita desta demonstração. Não há reposição simulada. O descarte é simbólico
e ilustra uma condição para FS, sem garantir segurança do estado atual.

O inspetor distingue o par local T, a T pública do par, PQT e ct de renovação
(Figura 3) das EK/PQE/ct do acordo inicial. Como não há avanço de raiz no
cenário atual, esses campos indicam ausência de material de ratchet simulado.
A operação 8.5 mostra o envelope genérico com T e campos PQ opcionais de
ambos os ramos, separado do envelope efetivo de avanço somente de cadeia.
`setup_s` usa o número da sessão msgGX; `i` continua sendo a etapa de raiz.
As tuplas são notação didática, não uma serialização de wire especificada.

Com Bob offline, o envio anima somente as operações 7.1–7.3, até o transporte
para o HS_B. Ao reconectar, cada evento pendente anima apenas a entrega e
abertura (7.4), sem repetir o avanço, a cifra ou a publicação de Alice.
Os setups pendentes continuam usando as operações de recebimento do passo ⑨.
