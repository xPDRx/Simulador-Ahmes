# Arquitetura implementada e conjunto de instruções

## 1. Limite da especificação

O enunciado fornecido para o trabalho contém somente o pedido de fazer um simulador Ahmes baseado no exemplo do simulador Neander. O material de referência apresenta a implementação do Neander, mas não fornece uma especificação formal do Ahmes.

Por esse motivo, este projeto preserva o conjunto de instruções e os códigos numéricos que já estavam no protótipo inicial do aluno. As escolhas abaixo descrevem **o comportamento implementado neste projeto**; não devem ser interpretadas como uma especificação oficial externa do Ahmes.

## 2. Organização adotada

- Palavra e posição de memória: 8 bits.
- Memória: 256 posições, endereços de 0 a 255.
- Acumulador (AC): 8 bits, valores de 0 a 255.
- Contador de programa (PC): endereço de 8 bits.
- Flags: N, Z, V, C e B.
- Instruções com endereço: opcode seguido por um byte de operando.
- Instruções sem operando: ocupam um byte.

A memória é compartilhada por instruções e dados. O montador oferece `ORG` para escolher um endereço e `DB` para inserir um byte.

## 3. Instruções

| Mnemônico | Opcode decimal | Bytes | Comportamento implementado |
|---|---:|---:|---|
| NOP | 0 | 1 | Não altera AC nem flags. |
| STA endereço | 16 | 2 | Copia AC para a posição de memória indicada. |
| LDA endereço | 32 | 2 | Copia o conteúdo da memória para AC e atualiza N e Z. |
| ADD endereço | 48 | 2 | Soma AC ao conteúdo da memória, limita o resultado a 8 bits e atualiza N, Z, V e C. |
| OR endereço | 64 | 2 | OR bit a bit entre AC e memória; atualiza N e Z. |
| AND endereço | 80 | 2 | AND bit a bit entre AC e memória; atualiza N e Z. |
| NOT | 96 | 1 | Inverte os oito bits de AC e atualiza N e Z. |
| SUB endereço | 112 | 2 | Subtrai memória de AC, limita o resultado a 8 bits e atualiza N, Z, V e B. |
| JMP endereço | 128 | 2 | Desvio incondicional. |
| JN endereço | 144 | 2 | Desvia quando N = 1. |
| JP endereço | 148 | 2 | Desvia quando N = 0. |
| JV endereço | 152 | 2 | Desvia quando V = 1. |
| JNV endereço | 156 | 2 | Desvia quando V = 0. |
| JZ endereço | 160 | 2 | Desvia quando Z = 1. |
| JNZ endereço | 164 | 2 | Desvia quando Z = 0. |
| JC endereço | 176 | 2 | Desvia quando C = 1. |
| JNC endereço | 180 | 2 | Desvia quando C = 0. |
| JB endereço | 184 | 2 | Desvia quando B = 1. |
| JNB endereço | 188 | 2 | Desvia quando B = 0. |
| SHR | 224 | 1 | Desloca AC uma posição à direita; o bit removido vai para C. |
| SHL | 225 | 1 | Desloca AC uma posição à esquerda; o bit removido vai para C. |
| ROR | 226 | 1 | Rotaciona AC à direita usando C como bit de entrada. |
| ROL | 227 | 1 | Rotaciona AC à esquerda usando C como bit de entrada. |
| HLT | 240 | 1 | Encerra a execução. |

## 4. Flags

| Flag | Significado no projeto |
|---|---|
| N | Recebe o bit mais significativo de AC (bit 7). |
| Z | Vale 1 quando AC é igual a zero. |
| V | Indica overflow com sinal nas operações ADD e SUB. |
| C | Indica carry na soma e o bit deslocado/rotacionado nas operações de deslocamento. |
| B | Indica empréstimo (borrow) na subtração. |

As operações que não são descritas como atualizadoras de determinada flag preservam o valor anterior dessa flag. Em especial, operações lógicas atualizam N e Z, mas preservam V, C e B.

### Aritmética de 8 bits

Os resultados de ADD e SUB são limitados a 8 bits. Por exemplo, 250 + 10 produz 4 no acumulador, com C = 1. A interpretação com sinal considera o intervalo de -128 a 127 em complemento de dois; por isso, o padrão binário `10000000` representa -128.

### Deslocamentos e rotações

- `SHR`: deslocamento lógico à direita; o bit 0 anterior passa para C e entra zero pelo bit 7.
- `SHL`: deslocamento à esquerda; o bit 7 anterior passa para C e entra zero pelo bit 0.
- `ROR`: deslocamento circular através do carry; C anterior entra no bit 7 e o bit 0 anterior passa para C.
- `ROL`: deslocamento circular através do carry; C anterior entra no bit 0 e o bit 7 anterior passa para C.

## 5. Sintaxe do montador

```asm
; comentário
LDA 129       ; instrução com endereço
ADD 128
STA 131
HLT

ORG 128       ; muda o endereço de montagem
DB 126        ; grava um byte de dado
DB 4
```

Regras:

- Mnemônicos não diferenciam maiúsculas de minúsculas.
- Comentários começam com `;` e vão até o final da linha.
- `ORG` recebe um endereço entre 0 e 255.
- `DB` recebe um valor entre 0 e 255.
- Instruções que usam endereço recebem exatamente um operando entre 0 e 255.
- Instruções sem operando não aceitam valores adicionais.
- Rótulos (labels), constantes simbólicas e expressões ainda não são suportados.
- O montador verifica o limite da memória e só substitui a memória atual quando toda a montagem termina sem erro.

## 6. Formatos de arquivo de memória

O carregador aceita:

1. Dump simples: um valor decimal de 0 a 255 por linha. O primeiro valor vai para o endereço 0.
2. Listagem no formato do conversor Neander: `endereço byte [operando] [texto opcional]`. Quando o terceiro campo numérico existe, ele é colocado no endereço seguinte.

A importação carrega bytes na memória, mas não tenta reconstruir automaticamente o Assembly original. Isso evita classificar dados como instruções sem informação suficiente.
