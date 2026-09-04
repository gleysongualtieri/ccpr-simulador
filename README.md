# Rota Inteligente

PROMPT MESTRE

CONSTRUÇÃO DO SIMULADOR OPERACIONAL DE ROTA

SISTEMA DE INTELIGÊNCIA LOGÍSTICA CCPR — MÓDULO OPERACIONAL

0. INSTRUÇÃO MESTRA

Você é responsável por transformar o PRD fornecido neste projeto em uma aplicação web operacional profissional, destinada ao uso real por analistas, coordenadores e gestores de logística da CCPR.

O sistema não deve ser tratado como:

landing page;

protótipo;

mockup;

dashboard conceitual;

demonstração visual;

aplicativo SaaS genérico.

Trata-se de um sistema operacional de inteligência logística, que deverá trabalhar com dados reais de roteirização e apoiar decisões táticas sobre rotas existentes.

A aplicação deve unir quatro dimensões:

DADOS REAIS + MOTOR DE CÁLCULO + SIMULAÇÃO + EXPERIÊNCIA OPERACIONAL

1. DOCUMENTOS DE REFERÊNCIA

O PRD fornecido é a principal especificação funcional do sistema.

Ele define:

contexto;

objetivo;

escopo;

personas;

conceitos;

regras de negócio;

fórmulas;

modelo de dados;

fluxo de uso;

requisitos funcionais;

requisitos não funcionais;

critérios de aceite;

roadmap.

Respeite integralmente essas definições.

Não altere silenciosamente regras existentes.

Quando houver alguma informação ainda pendente no PRD, não invente.

Estruture o sistema para permitir configuração futura.

2. OBJETIVO DO SISTEMA

O sistema deve responder rapidamente à pergunta operacional:

"O que posso fazer agora para melhorar o custo desta rota ou região?"

O sistema trabalha com:

rotas reais;

produtores reais;

volumes reais;

quilômetros reais;

equipamentos reais;

jornadas reais;

regiões reais;

ciclos reais.

O usuário deve conseguir:

importar a roteirização;

visualizar a operação;

identificar rotas críticas;

abrir uma rota;

simular aumento de volume;

simular aumento de km;

simular troca de equipamento;

combinar ações;

comparar antes/depois;

verificar capacidade;

verificar jornada;

analisar impacto regional;

tomar uma decisão operacional.

3. PRINCÍPIO CENTRAL DE PRODUTO

O sistema não deve simplesmente apresentar números.

Ele deve transformar dados em decisão.

Para cada simulação, o usuário deve conseguir entender:

O QUE TENHO HOJE?

O QUE ESTOU TESTANDO?

O QUE MUDOU?

QUANTO MELHOROU OU PIOROU?

EXISTE ALGUMA RESTRIÇÃO?

ESSA ALTERAÇÃO É OPERACIONALMENTE VIÁVEL?

A interface deve facilitar essa leitura sem exigir conhecimento técnico de programação.

4. IDENTIDADE VISUAL — CCPR CONECTA

REGRA OBRIGATÓRIA

A aplicação deve parecer um módulo nativo do ecossistema CCPR CONECTA.

Não criar uma identidade visual de startup.

Não criar uma identidade visual independente.

Não criar uma estética futurista.

O usuário deve ter a sensação de que está entrando em uma nova funcionalidade do próprio CCPR CONECTA.

5. DNA VISUAL

A identidade visual deve ser:

CORPORATIVA + FUNCIONAL + MINIMALISTA + TECNOLÓGICA + LEVE + BAIXA DENSIDADE VISUAL

A interface deve transmitir:

confiabilidade;

organização;

eficiência;

tecnologia;

simplicidade;

controle operacional.

O design não deve tentar parecer sofisticado através de:

excesso de efeitos;

gradientes;

animações;

sombras fortes;

excesso de cores;

elementos decorativos.

A sofisticação deve vir de:

clareza + consistência + hierarquia visual + precisão.

6. PALETA INSTITUCIONAL

COR PRIMÁRIA — TEAL CCPR

#04AF9E


RGB:

4 / 175 / 158


Esta é a principal cor institucional.

Utilizar em:

header;

logo;

títulos;

botões principais;

ícones de ação;

indicadores ativos;

estados selecionados;

radio buttons selecionados;

controles interativos;

barras de destaque;

elementos de navegação;

scrollbar quando personalizada;

elementos importantes do simulador.

7. COR SECUNDÁRIA — VERDE-LIMÃO

#BDD13B


Utilizar como:

destaque secundário;

apoio visual;

pequenos indicadores;

elementos associados à identidade do logo;

situações específicas em que seja útil diferenciar uma informação.

Não utilizar como cor dominante.

Não utilizar grandes áreas de fundo com verde-limão.

O teal é a cor primária.

8. CORES NEUTRAS

TEXTO PRINCIPAL

Utilizar principalmente:

#4E4E4E


ou tonalidades próximas de:

#333333


Não utilizar preto puro como padrão.

A intenção é manter uma aparência leve e corporativa.

FUNDO PRINCIPAL

#FFFFFF


Predominância absoluta de branco.

FUNDO SECUNDÁRIO

#F5F5F5


Utilizar para:

áreas secundárias;

separação de seções;

áreas de filtros;

estados de fundo;

superfícies auxiliares.

BORDA

#DADADA


Utilizar bordas finas e discretas.

9. PROPORÇÃO VISUAL

Como orientação geral, a interface deve trabalhar aproximadamente com:

BRANCO / ESPAÇO NEGATIVO → predominante
TEAL → principal elemento de identidade
CINZA → estrutura e informação
VERDE-LIMÃO → pequenos destaques


Não transformar a aplicação em uma interface excessivamente colorida.

10. HEADER PRINCIPAL

O header é um dos elementos mais importantes para reproduzir a identidade do CONECTA.

Criar uma barra horizontal ocupando toda a largura.

Características:

Altura: aproximadamente 64 px
Fundo: #04AF9E


Estrutura:

┌─────────────────────────────────────────────────────────────┐
│ ☰   CCPR CONECTA                         Usuário      ⇥    │
└─────────────────────────────────────────────────────────────┘


À esquerda:

menu hambúrguer;

identificação/logo CCPR CONECTA.

À direita:

identificação do usuário;

opção de saída/logout.

Tudo deve estar verticalmente centralizado.

O header deve ser simples.

Não adicionar:

gradientes;

sombras fortes;

elementos decorativos;

banners.

11. NAVEGAÇÃO LATERAL

Quando aberto:

Fundo: #FFFFFF


Não utilizar sidebar teal.

A navegação deve transmitir a sensação de sistema empresarial.

Itens:

texto grafite;

ícone discreto;

espaçamento vertical confortável;

seta de expansão à direita quando aplicável.

Exemplo:

CADASTROS GERAIS                       ˅

CADASTRO DE LINHA                      ˅

FINANCEIRO                             ˅

CADASTRO DE TRANSPORTADORA             ˅

CAPTAÇÃO                               ˅

DADOS E RELATÓRIOS                     ˅


Para este módulo, criar navegação coerente com o conceito:

VISÃO GERAL

ROTEIRIZAÇÃO

RANKING DE ROTAS

ANÁLISE DE REGIÕES

SIMULADOR

IMPORTAÇÃO DE DADOS

EQUIPAMENTOS

RELATÓRIOS


Não adicionar menus que não possuam funcionalidade real.

12. TIPOGRAFIA

Utilizar:

ROBOTO

ou uma sans-serif visualmente equivalente.

Evitar:

fontes futuristas;

fontes decorativas;

fontes excessivamente pesadas.

Hierarquia recomendada:

ElementoTamanhoPesoTítulo da página30–32 px400Título de seção20–24 px400–500Texto normal14–16 px400Menu15–16 px400Tabela14 px400Cabeçalho de tabela14 px500Botão14–16 px500

A tipografia deve ser leve.

13. TÍTULOS

O padrão visual deve seguir:

HEADER TEAL
────────────────────────────────────

        Título da Página

────────────────────────────────────

        Área funcional


Título:

alinhado à esquerda;

30–32 px;

peso 400;

teal #04AF9E;

sem caixa colorida;

sem fundo;

bastante espaço negativo ao redor.

Exemplo:

Simulador Operacional de Rota

Não utilizar títulos gigantes.

14. LAYOUT

O layout deve utilizar:

grids limpos;

alinhamento consistente;

espaçamento generoso;

bastante espaço negativo;

baixa densidade visual;

hierarquia clara.

Não ocupar toda a tela com cards.

Não transformar todos os dados em "cards".

A interface deve parecer um sistema corporativo.

15. CARDS

Cards podem ser utilizados quando realmente ajudam na organização.

Características:

Fundo: #FFFFFF
Borda: #DADADA
Border-radius: 4–6 px
Sombra: extremamente discreta


Não utilizar:

cards excessivamente arredondados;

border-radius de 20–30 px;

sombras pesadas;

gradientes.

16. SOMBRAS

Utilizar sombras apenas para estabelecer hierarquia entre superfícies.

Regra:

Sombras suaves e discretas.

Evitar efeitos de profundidade exagerados.

17. BORDER RADIUS

Utilizar aproximadamente:

4–6 px


Não utilizar estética "pill" como padrão.

Botões, campos e cards devem ter cantos discretamente arredondados.

18. BOTÕES

Ação primária:

Fundo: #04AF9E
Texto: #FFFFFF


Características:

altura aproximada de 44–48 px;

cantos discretamente arredondados;

sombra discreta;

tipografia 14–16 px;

peso 500.

Exemplos:

+ Nova Simulação
Importar Dados
Simular
Aplicar
Salvar
Buscar


19. BOTÕES DE AÇÃO COMPACTOS

Para ações contextuais utilizar:

círculo teal
+
ícone branco


Exemplo:

   ●••


O padrão de três pontos pode ser utilizado para menus de ações de tabelas.

Manter consistência em toda a aplicação.

20. CAMPOS E FILTROS

Campos devem possuir:

Fundo: #FFFFFF
Borda: #DADADA
Altura: aproximadamente 44–48 px
Border-radius: 4–6 px


Exemplo:

Pesquisa avançada
┌──────────────────────────────────────────────┐
│ Digite para pesquisar                    ˅  │
└──────────────────────────────────────────────┘


21. ESTADOS SELECIONADOS

Estados selecionados devem utilizar:

#04AF9E


Estados não selecionados:

cinza neutro


Aplicar isso a:

radio buttons;

filtros;

tabs;

seletores;

indicadores;

elementos ativos.

Exemplo:

Buscar:

● Ativos
○ Inativos
○ Todos


O ponto selecionado deve utilizar teal.

22. ÍCONES

Utilizar uma única biblioteca consistente.

Preferencialmente:

Material Icons;

Material Symbols;

ou equivalente minimalista.

Os ícones devem ser:

lineares;

simples;

discretos;

funcionais.

Não utilizar:

ícones 3D;

ícones multicoloridos;

estilos diferentes misturados;

ilustrações decorativas desnecessárias.

23. TABELAS

As tabelas são componentes centrais deste sistema.

Utilizar:

Fundo branco
Bordas finas
Cabeçalho simples
Texto grafite
Linhas horizontais discretas
Espaçamento confortável


Não utilizar tabelas visualmente carregadas.

Estrutura conceitual:

┌────────────┬──────────────┬─────────┬──────────┐
│ Rota       │ Volume       │ R$/L    │ Ações    │
├────────────┼──────────────┼─────────┼──────────┤
│ 2858D      │ 5.420 L      │ 0,48    │   •••    │
├────────────┼──────────────┼─────────┼──────────┤
│ 2741D      │ 6.130 L      │ 0,45    │   •••    │
└────────────┴──────────────┴─────────┴──────────┘


24. TABELA DO RANKING

O ranking é um componente operacional crítico.

Colunas:

PosiçãoRotaRegiãoCicloEquipamentoVolumeKmCustoR$/LDensidadeJornadaStatus

Manter visual limpo.

O usuário deve conseguir escanear rapidamente a tabela.

25. STATUS OPERACIONAL

Utilizar cores com parcimônia.

O teal continua sendo a identidade principal.

Para situações de exceção, utilizar cores funcionais apenas quando necessário.

Exemplos:

Normal
Atenção
Crítico


Não transformar a interface em um semáforo permanente.

As cores de alerta devem aparecer apenas onde agregarem significado operacional.

26. DASHBOARD

O dashboard deve seguir o DNA do CONECTA.

Não criar um dashboard estilo:

fintech;

startup;

videogame;

cyberpunk;

SaaS americano.

Criar um dashboard empresarial.

Indicadores:

Rotas analisadas
Volume total
Km total
Custo total
R$/L
Densidade
Rotas críticas
Jornadas críticas


Os indicadores devem ser claros e compactos.

27. SIMULADOR

A área de simulação deve ser visualmente diferenciada, mas sem romper com o design institucional.

Utilizar:

branco
teal
cinza claro


A simulação deve ter destaque suficiente para ser percebida.

Mas não utilizar:

fundos neon;

gradientes;

animações exageradas;

grandes elementos decorativos.

28. COMPARAÇÃO ATUAL × SIMULADO

Criar uma comparação extremamente clara.

Exemplo:

┌──────────────────────┬──────────────────────┐
│       ATUAL          │      SIMULADO        │
├──────────────────────┼──────────────────────┤
│ Volume               │ Volume               │
│ Km                   │ Km                   │
│ Custo                │ Custo                │
│ R$/L                 │ R$/L                 │
│ Densidade            │ Densidade            │
│ Capacidade           │ Capacidade           │
└──────────────────────┴──────────────────────┘


A variação deve aparecer abaixo ou ao lado.

Exemplo:

R$/L

Atual       R$ 0,4800
Simulado    R$ 0,3900

↓ -18,75%


O teal deve ser utilizado para destacar ações e resultados positivos quando apropriado.

29. VISUALIZAÇÃO DE RESULTADOS

Priorizar:

números + tabelas + comparação direta.

Gráficos somente quando ajudarem efetivamente a compreender:

ranking;

distribuição;

evolução;

comparação.

Não inserir gráficos simplesmente para preencher espaço.

30. RESPONSIVIDADE

Prioridade:

desktop;

notebook;

tablet.

O sistema é essencialmente operacional e analítico.

Desktop deve receber a maior atenção.

31. RESTRIÇÕES VISUAIS ABSOLUTAS

NÃO utilizar:

❌ roxo como cor primária
❌ azul como cor primária
❌ gradientes
❌ fundo escuro como padrão
❌ cards excessivamente arredondados
❌ sombras pesadas
❌ excesso de cores
❌ fontes futuristas
❌ fontes decorativas
❌ ícones coloridos diferentes entre si
❌ estética exageradamente "startup"
❌ elementos decorativos grandes
❌ ilustrações que reduzam a área operacional
❌ efeitos visuais que prejudiquem a leitura de tabelas
❌ animações desnecessárias

32. ARQUITETURA FUNCIONAL

A aplicação deverá possuir, no mínimo:

Dashboard
│
├── Ranking de Rotas
│
├── Detalhe da Rota
│
├── Simulador
│
├── Análise Regional
│
├── Importação de Dados
│
├── Equipamentos
│
└── Relatórios


33. MOTOR DE CÁLCULO

Criar um motor centralizado.

Exemplo:

/calculations

equipment.ts
routeCost.ts
routeDensity.ts
routeJourney.ts
capacity.ts
compatibility.ts
simulation.ts
regionalAggregation.ts
comparison.ts


Nunca duplicar fórmulas em telas diferentes.

34. REGRA DE COMPATIBILIDADE

Implementar obrigatoriamente:

D

Equipamento solteiro:

Toco;

Truck;

Bitruck.

R

Equipamento com reboque:

Toco + Reboque;

Truck + Reboque;

Bitruck + Reboque.

A/B/C

Equipamento solteiro.

E

Equipamento solteiro.

S

Carreta;

Bitrem;

Vanderleia.

Essa regra deve existir no backend/motor de negócio.

Não confiar somente na interface.

35. MOTOR DE SIMULAÇÃO

Crescimento de volume

Novo Volume =
Volume Atual + Aumento de Volume


Novo km

Novo Km =
Km Atual + Aumento de Km


Novo custo

Novo Custo =
Diária +
(Novo Km × Custo/km)


Novo R$/L

Novo R$/L =
Novo Custo ÷ Novo Volume


Utilizar a mesma fonte de cálculo definida pelo PRD/Módulo 1.

Não criar uma fórmula alternativa.

36. CAPACIDADE

Sempre validar:

Novo Volume > Capacidade


Quando ocorrer:

⚠ CAPACIDADE EXCEDIDA


Mostrar:

volume simulado;

capacidade;

excedente.

Não esconder o resultado.

37. JORNADA

Calcular conforme o PRD:

Jornada =
Chegada na base
-
Início da rota


Não incluir:

descarga;

retorno após descarga.

Considerar troca de motorista quando registrada.

38. ANÁLISE REGIONAL

Permitir selecionar múltiplas rotas da mesma região.

Calcular:

Volume Total
Km Total
Custo Total
Densidade
R$/L


Permitir comparar:

REGIÃO ATUAL
versus
REGIÃO SIMULADA


39. IMPORTAÇÃO

Criar tela:

IMPORTAÇÃO DE DADOS

Permitir importar:

Route_now;

Produtores_Rotas.

Fluxo:

Selecionar arquivos
       ↓
Ler arquivos
       ↓
Validar
       ↓
Transformar
       ↓
Mostrar prévia
       ↓
Confirmar
       ↓
Persistir


Nunca sobrescrever dados existentes silenciosamente.

40. QUALIDADE DOS DADOS

Detectar:

rota sem equipamento;

produtor sem volume;

rota sem km;

código inválido;

equipamento desconhecido;

capacidade desconhecida;

horário inválido;

rota sem ciclo.

Apresentar erros de maneira clara.

41. RASTREABILIDADE

Todo resultado deve ser rastreável.

Preservar:

arquivo de origem;

data de importação;

unidade;

rota;

produtor;

veículo;

equipamento;

valores originais.

Cenários simulados nunca devem substituir os dados reais.

42. DADOS REAIS × SIMULAÇÃO

Utilizar uma distinção visual clara.

Exemplo:

DADO REAL


e:

SIMULAÇÃO


A simulação deve funcionar como uma camada sobre a realidade.

Nunca alterar o dado original apenas porque o usuário simulou uma mudança.

43. PERFORMANCE

A aplicação deve suportar:

múltiplas unidades;

muitas rotas;

muitos produtores;

grandes arquivos.

Não criar limites artificiais baixos.

Evitar:

cálculos duplicados;

consultas repetidas;

processamento desnecessário;

carregamento integral desnecessário.

44. TESTES

Criar testes para:

aumento de volume;

aumento de km;

troca de equipamento;

equipamento incompatível;

capacidade excedida;

jornada;

jornada crítica;

troca de motorista;

agregação regional;

comparação antes/depois.

45. FASES DE IMPLEMENTAÇÃO

FASE 1 — FUNDAÇÃO

Construir:

arquitetura;

navegação;

design system CCPR;

banco;

entidades;

motor de cálculo.

FASE 2 — IMPORTAÇÃO

Construir:

upload;

leitura;

validação;

transformação;

prévia;

persistência.

FASE 3 — RANKING

Construir:

dashboard;

KPIs;

ranking;

filtros.

FASE 4 — DETALHE DA ROTA

Construir:

dados;

produtores;

paradas;

horários;

jornada;

equipamento.

FASE 5 — SIMULADOR

Construir:

volume;

km;

equipamento;

combinação;

capacidade;

comparação.

FASE 6 — REGIÃO

Construir:

múltiplas rotas;

agregação;

comparação regional.

FASE 7 — QUALIDADE

Construir:

testes;

validações;

performance;

tratamento de erros;

refinamento.

46. REGRA DE DESENVOLVIMENTO NO LOVABLE

Não tentar construir tudo de uma única vez.

Ao finalizar cada fase:

verificar compilação;

verificar erros;

testar funcionalidade;

testar cálculos;

testar interface;

corrigir regressões;

somente então avançar.

Não acumular funcionalidades quebradas.

47. DADOS MOCK

Se dados fictícios forem necessários durante desenvolvimento:

identificar claramente como:

DADOS DE TESTE


Nunca apresentar dados fictícios como dados operacionais reais.

Separar completamente MOCK de dados reais.

48. FORA DE ESCOPO

Não implementar agora:

Simulador de Metas Anuais;

metas anuais;

sazonalidade anual;

consolidado geral multiunidade;

Nova Roteirização;

otimização completa da rede;

Radar de Captação completo;

redistribuição automática de produtores.

Preparar arquitetura para futuras expansões, mas não implementar agora.

49. EVOLUÇÃO FUTURA

A arquitetura deve permitir futuramente:

RADAR DE CAPTAÇÃO

produtor individual;

potencial de volume;

jornada;

ocupação;

dispensa estratégica.

OTIMIZAÇÃO DE REDE

consolidação;

transferência de produtores;

redistribuição;

novas configurações de malha.

CONTROL TOWER

acompanhamento diário;

exceções;

alertas;

performance;

aplicação das decisões.

50. CRITÉRIO DE ACEITE DO MVP

O MVP estará funcional quando um analista conseguir:

importar dados reais;

selecionar unidade;

visualizar ranking;

identificar rota crítica;

abrir rota;

visualizar indicadores;

simular aumento de volume;

informar aumento de km;

testar equipamento compatível;

receber novo custo;

receber novo R$/L;

verificar capacidade;

verificar jornada;

comparar atual × simulado;

repetir a análise em outra rota;

analisar impacto regional.

51. PRINCÍPIO DE DESIGN FINAL

A interface deve parecer:

"CCPR CONECTA, mas agora com inteligência operacional."

Não deve parecer:

"Um novo aplicativo criado separadamente."

O design deve preservar:

TEAL + BRANCO + TIPOGRAFIA LEVE + MUITO ESPAÇO + COMPONENTES SIMPLES + BORDAS DISCRETAS + ÍCONES MINIMALISTAS.

52. PRINCÍPIO FINAL DO PRODUTO

O sistema deve seguir permanentemente esta cadeia:

DADOS REAIS
      ↓
TRATAMENTO
      ↓
CÁLCULO
      ↓
DIAGNÓSTICO
      ↓
SIMULAÇÃO
      ↓
COMPARAÇÃO
      ↓
DECISÃO
      ↓
EXECUÇÃO


O objetivo não é produzir um dashboard bonito.

O objetivo é produzir uma ferramenta profissional de decisão logística.

A estética CCPR CONECTA deve tornar essa ferramenta familiar, confiável e institucional.

A lógica operacional deve torná-la útil.

A rastreabilidade deve torná-la confiável.

O motor de cálculo deve torná-la tecnicamente consistente.

A arquitetura modular deve permitir sua evolução para uma futura Control Tower Logística CCPR.

53. INSTRUÇÃO FINAL AO LOVABLE

Antes de escrever a implementação:

leia integralmente o PRD;

leia integralmente este Prompt Mestre;

identifique todas as entidades;

identifique todas as regras de negócio;

identifique todas as dependências;

identifique campos obrigatórios;

identifique pontos pendentes;

defina a arquitetura;

crie o Design System CCPR CONECTA;

implemente por fases.

Não comece criando apenas a interface.

Primeiro garanta a fundação técnica.

A sequência obrigatória é:

ARQUITETURA
↓
MODELO DE DADOS
↓
MOTOR DE CÁLCULO
↓
IMPORTAÇÃO
↓
RANKING
↓
DETALHE DA ROTA
↓
SIMULADOR
↓
ANÁLISE REGIONAL
↓
VALIDAÇÃO
↓
REFINAMENTO VISUAL


Ao final de cada etapa, a aplicação deve permanecer funcional.

O PRD define O QUE o sistema deve fazer.

Este Prompt Mestre define COMO o Lovable deve construir o produto, incluindo arquitetura, comportamento, UX/UI e identidade visual.

As duas especificações devem ser tratadas como uma única fonte de orientação para a construção do sistema.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ccpr-simulador.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f524c24-ada1-4268-a590-5684f31b5299).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
