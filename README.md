# Simulador Ahmes

Projeto acadêmico de simulador de uma máquina de 8 bits, desenvolvido em HTML, CSS e JavaScript puro. A aplicação permite escrever um programa Assembly, montar os bytes na memória, executar instruções individualmente ou em sequência e acompanhar memória, acumulador, contador de programa e flags.

> **Sobre a arquitetura:** o material de referência apresenta uma implementação didática do Neander em C, com palavras de 8 bits, 256 posições de memória e um conjunto próprio de instruções. Ele não contém uma especificação formal completa do Ahmes. Por isso, este simulador organiza uma proposta executável para o trabalho, documentando explicitamente as instruções e convenções implementadas. A tabela final de opcodes e as regras de flags devem ser validadas com o professor ou com o enunciado, caso sejam fornecidos.

## 1. Como executar

### Opção A — Abrir diretamente

1. Extraia o ZIP para uma pasta.
2. Abra a pasta `simulador-ahmes`.
3. Dê dois cliques em `index.html` ou abra esse arquivo no navegador.
4. O simulador funciona sem instalação de bibliotecas ou conexão com a internet.

### Opção B — Servidor local (opcional)

Se preferir executar por um servidor local, abra um terminal na pasta do projeto e rode:

**Windows (Python instalado):**

```powershell
py -m http.server 8000
```

**Linux / macOS:**

```bash
python3 -m http.server 8000
```

Depois, acesse `http://localhost:8000` no navegador.

## 2. Como usar

1. Escreva ou cole o programa no editor Assembly.
2. Clique em **Montar programa**. O montador valida as instruções e grava os bytes na memória.
3. Clique em **Executar passo** para executar uma instrução por vez, ou em **Executar tudo** para continuar até `HLT`.
4. Observe AC, PC, flags, memória e histórico de execução.
5. Use **Reiniciar CPU** para voltar AC, PC e flags ao estado inicial sem apagar o programa da memória.
6. Use **Limpar memória** para apagar também os bytes carregados.
7. Use **Abrir arquivo** para importar um dump de memória ou uma listagem compatível.
8. Use **Exportar memória** para baixar os 256 bytes atuais, um por linha.

## 3. Exemplo inicial

O programa carregado ao abrir a página soma 126 e 4. O resultado esperado é 130, armazenado no endereço 131.

```asm
LDA 129
ADD 128
STA 131
HLT

ORG 128
DB 126
DB 4
```

Após executar, AC deve conter `130` e a posição de memória `131` também deve conter `130`.

Há outros exemplos na pasta [`exemplos/`](exemplos/):

- `soma.asm` — soma e grava o resultado.
- `subtracao.asm` — demonstra a subtração.
- `desvio-zero.asm` — demonstra o desvio condicional JZ.
- `soma-neander.txt` — exemplo de importação no formato textual do conversor Neander.

## 4. Estrutura de pastas

```text
simulador-ahmes/
├── index.html                  # Estrutura da página
├── README.md                   # Instruções e visão geral
├── css/
│   └── style.css               # Aparência e responsividade
├── js/
│   ├── ahmes.js                # Montador, memória e execução da CPU
│   └── interface.js            # Controles e atualização da tela
├── exemplos/
│   ├── soma.asm
│   ├── subtracao.asm
│   └── desvio-zero.asm
├── docs/
│   └── arquitetura-e-instrucoes.md
└── tests/
    └── ahmes.test.js           # Testes automatizados do núcleo
```

## 5. Testes automatizados

Os testes usam o módulo nativo `node:test`, disponível no Node.js. Não é necessário instalar dependências.

Na pasta do projeto, execute:

```bash
node --test
```

Os testes verificam montagem, limites de memória, soma, subtração, flags, desvios, deslocamentos, parada e importação de memória.

## 6. Limitações conhecidas

- O montador não reconhece rótulos, variáveis, constantes ou expressões.
- Os desvios usam endereços numéricos.
- A desmontagem automática de memória importada não é feita, pois bytes de dados podem coincidir com opcodes.
- O histórico visual mantém as 80 execuções mais recentes.
- A execução automática possui limite de 10.000 instruções para evitar loops intermináveis na interface.
- As regras de flags e a tabela de opcodes representam a implementação atual do projeto; ainda precisam ser confirmadas como a especificação exigida para o Ahmes.

## 7. Tecnologias

- HTML5
- CSS3
- JavaScript puro (sem frameworks)
- Node.js apenas para executar os testes automatizados

## 8. Interface

A interface foi organizada para manter o fluxo de uso evidente: escrever o programa, montar, executar e observar o estado da máquina. A memória, os registradores e o histórico ficam separados em áreas próprias, com cores discretas para indicar o endereço apontado pelo PC e posições alteradas. O layout se adapta a telas menores.

## 9. Observação sobre o trabalho

O simulador foi organizado para fins didáticos. O código contém comentários curtos próximos às partes relevantes, evitando blocos extensos de comentários e mantendo a leitura direta.
