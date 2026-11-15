const test = require("node:test");
const assert = require("node:assert/strict");

global.window = global;
require("../js/ahmes.js");
const { AhmesMachine } = global.Ahmes;

function machineWith(source) {
  const machine = new AhmesMachine();
  machine.assemble(source);
  return machine;
}

test("monta e executa a soma do exemplo", () => {
  const machine = machineWith("LDA 129\nADD 128\nSTA 131\nHLT\nORG 128\nDB 126\nDB 4");
  const result = machine.run();
  assert.equal(result.halted, true);
  assert.equal(machine.ac, 130);
  assert.equal(machine.memory[131], 130);
  assert.equal(machine.steps, 4);
});

test("ADD limita o resultado a oito bits e atualiza carry", () => {
  const machine = machineWith("LDA 128\nADD 129\nHLT\nORG 128\nDB 250\nDB 10");
  machine.run();
  assert.equal(machine.ac, 4);
  assert.equal(machine.flags.c, 1);
});

test("ADD identifica overflow com sinal", () => {
  const machine = machineWith("LDA 128\nADD 129\nHLT\nORG 128\nDB 127\nDB 1");
  machine.run();
  assert.equal(machine.ac, 128);
  assert.equal(machine.flags.n, 1);
  assert.equal(machine.flags.v, 1);
});

test("SUB calcula resultado e borrow", () => {
  const machine = machineWith("LDA 128\nSUB 129\nHLT\nORG 128\nDB 5\nDB 9");
  machine.run();
  assert.equal(machine.ac, 252);
  assert.equal(machine.flags.b, 1);
  assert.equal(machine.flags.n, 1);
});

test("JZ desvia quando o acumulador é zero", () => {
  const machine = machineWith("LDA 128\nSUB 129\nJZ 8\nLDA 130\nHLT\nORG 8\nLDA 131\nHLT\nORG 128\nDB 5\nDB 5\nDB 99\nDB 42");
  machine.run();
  assert.equal(machine.ac, 42);
});

test("JMP altera o contador de programa", () => {
  const machine = machineWith("JMP 4\nLDA 128\nHLT\nORG 4\nLDA 129\nHLT\nORG 128\nDB 10\nDB 23");
  machine.step();
  assert.equal(machine.pc, 4);
  machine.run();
  assert.equal(machine.ac, 23);
});

test("SHL transfere o bit mais significativo para carry", () => {
  const machine = machineWith("LDA 8\nSHL\nHLT\nORG 8\nDB 192");
  machine.run();
  assert.equal(machine.ac, 128);
  assert.equal(machine.flags.c, 1);
});

test("HLT conta como instrução executada", () => {
  const machine = machineWith("NOP\nHLT");
  const result = machine.run();
  assert.equal(result.executed.length, 2);
  assert.equal(machine.steps, 2);
  assert.equal(machine.halted, true);
});

test("montagem inválida não altera a memória anterior", () => {
  const machine = machineWith("LDA 10\nHLT");
  const before = Array.from(machine.memory);
  assert.throws(() => machine.assemble("LDA\nHLT"), /exige um endereço/);
  assert.deepEqual(Array.from(machine.memory), before);
});

test("rejeita instrução que ultrapassa o fim da memória", () => {
  const machine = new AhmesMachine();
  assert.throws(() => machine.assemble("ORG 255\nLDA 10"), /ultrapassa o limite/);
});

test("importa o dump de memória com um byte por linha", () => {
  const machine = new AhmesMachine();
  machine.loadMemoryText("32\n128\n240");
  assert.equal(machine.memory[0], 32);
  assert.equal(machine.memory[1], 128);
  assert.equal(machine.memory[2], 240);
});

test("importa listagem no formato usado pelo conversor Neander", () => {
  const machine = new AhmesMachine();
  machine.loadMemoryText("0 32 129 LDA 129\n2 48 128 ADD 128\n4 240 HLT");
  assert.deepEqual(Array.from(machine.memory.slice(0, 5)), [32, 129, 48, 128, 240]);
});


test("importa o exemplo de listagem Neander e executa a soma", () => {
  const machine = new AhmesMachine();
  machine.loadMemoryText("0 32 129 LDA 129\n2 48 128 ADD 128\n4 16 131 STA 131\n6 240 HLT\n128 126\n129 4");
  machine.run();
  assert.equal(machine.ac, 130);
  assert.equal(machine.memory[131], 130);
});

test("resetar CPU preserva a memória", () => {
  const machine = machineWith("LDA 10\nHLT\nORG 10\nDB 77");
  machine.run();
  machine.resetCPU();
  assert.equal(machine.ac, 0);
  assert.equal(machine.pc, 0);
  assert.equal(machine.memory[10], 77);
});
