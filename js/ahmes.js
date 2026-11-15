/* Núcleo da máquina: montagem do Assembly, memória, registradores e execução. */
(function (global) {
  "use strict";

  const MEMORY_SIZE = 256;
  const MASK_8_BITS = 0xFF;
  const SIGN_BIT = 0x80;

  // Os códigos foram mantidos conforme a tabela do protótipo inicial.
  const OPCODES = Object.freeze({
    NOP: 0, STA: 16, LDA: 32, ADD: 48, OR: 64, AND: 80,
    NOT: 96, SUB: 112, JMP: 128, JN: 144, JP: 148, JV: 152,
    JNV: 156, JZ: 160, JNZ: 164, JC: 176, JNC: 180, JB: 184,
    JNB: 188, SHR: 224, SHL: 225, ROR: 226, ROL: 227, HLT: 240
  });

  const INSTRUCTIONS_WITH_OPERAND = new Set([
    "STA", "LDA", "ADD", "OR", "AND", "SUB", "JMP", "JN", "JP",
    "JV", "JNV", "JZ", "JNZ", "JC", "JNC", "JB", "JNB"
  ]);

  const MNEMONICS_BY_OPCODE = Object.freeze(
    Object.fromEntries(Object.entries(OPCODES).map(([name, code]) => [code, name]))
  );

  function createFlags() {
    return { n: 0, z: 1, v: 0, c: 0, b: 0 };
  }

  function parseByte(value, lineNumber, description) {
    if (value === undefined || !/^\d+$/.test(value)) {
      throw new Error(`Linha ${lineNumber}: ${description} deve ser um inteiro entre 0 e 255.`);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0 || number > MASK_8_BITS) {
      throw new Error(`Linha ${lineNumber}: ${description} fora do intervalo de 0 a 255.`);
    }
    return number;
  }

  class AhmesMachine {
    constructor() {
      this.memory = new Uint8Array(MEMORY_SIZE);
      this.resetCPU();
      this.steps = 0;
      this.halted = false;
      this.lastStep = null;
      this.changedAddresses = new Set();
      this.programListing = [];
    }

    resetCPU() {
      this.ac = 0;
      this.pc = 0;
      this.flags = createFlags();
      this.halted = false;
      this.steps = 0;
      this.lastStep = null;
    }

    clearMemory() {
      this.memory.fill(0);
      this.changedAddresses.clear();
      this.programListing = [];
      this.resetCPU();
    }

    // A montagem ocorre em uma memória temporária para não deixar um programa pela metade se houver erro.
    assemble(source) {
      const nextMemory = new Uint8Array(MEMORY_SIZE);
      const listing = [];
      const lines = source.split(/\r?\n/);
      let address = 0;

      lines.forEach((originalLine, index) => {
        const lineNumber = index + 1;
        const sourceLine = originalLine.split(";")[0].trim();
        if (!sourceLine) return;

        const parts = sourceLine.toUpperCase().split(/\s+/);
        const mnemonic = parts[0];
        const operandText = parts[1];
        const extraOperand = parts.length > 2;

        if (mnemonic === "ORG") {
          if (parts.length !== 2) throw new Error(`Linha ${lineNumber}: use ORG seguido de um endereço.`);
          address = parseByte(operandText, lineNumber, "Endereço do ORG");
          return;
        }

        if (mnemonic === "DB") {
          if (parts.length !== 2) throw new Error(`Linha ${lineNumber}: use DB seguido de um único valor.`);
          this.ensureAddress(address, 1, lineNumber);
          const value = parseByte(operandText, lineNumber, "Valor do DB");
          nextMemory[address] = value;
          listing.push({ address, size: 1, mnemonic, operand: value, source: sourceLine });
          address += 1;
          return;
        }

        if (!Object.prototype.hasOwnProperty.call(OPCODES, mnemonic)) {
          throw new Error(`Linha ${lineNumber}: instrução desconhecida "${mnemonic}".`);
        }

        const hasOperand = INSTRUCTIONS_WITH_OPERAND.has(mnemonic);
        if (hasOperand && (parts.length !== 2 || operandText === undefined)) {
          throw new Error(`Linha ${lineNumber}: ${mnemonic} exige um endereço como operando.`);
        }
        if (!hasOperand && parts.length !== 1) {
          throw new Error(`Linha ${lineNumber}: ${mnemonic} não recebe operando.`);
        }

        const size = hasOperand ? 2 : 1;
        this.ensureAddress(address, size, lineNumber);
        const operand = hasOperand ? parseByte(operandText, lineNumber, "Operando") : null;
        nextMemory[address] = OPCODES[mnemonic];
        if (hasOperand) nextMemory[address + 1] = operand;
        listing.push({ address, size, mnemonic, operand, source: sourceLine });
        address += size;
      });

      this.memory.set(nextMemory);
      this.changedAddresses = new Set();
      this.programListing = listing;
      this.resetCPU();
      return { listing, bytesUsed: listing.reduce((sum, item) => sum + item.size, 0) };
    }

    ensureAddress(address, size, lineNumber) {
      if (address < 0 || address + size > MEMORY_SIZE) {
        throw new Error(`Linha ${lineNumber}: a instrução ultrapassa o limite da memória (255).`);
      }
    }

    // Importa tanto dumps simples (um byte por linha) quanto listagens do conversor Neander.
    loadMemoryText(text) {
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length === 0) throw new Error("O arquivo está vazio.");

      const nextMemory = new Uint8Array(MEMORY_SIZE);
      const isSequentialDump = lines.every(line => /^\d+$/.test(line));

      if (isSequentialDump) {
        if (lines.length > MEMORY_SIZE) throw new Error("O arquivo possui mais de 256 valores.");
        lines.forEach((line, index) => {
          nextMemory[index] = parseByte(line, index + 1, "Valor de memória");
        });
      } else {
        let validLines = 0;
        lines.forEach((line, index) => {
          const match = line.match(/^(\d+)\s+(\d+)(?:\s+(\d+))?(?:\s+.*)?$/);
          if (!match) throw new Error(`Linha ${index + 1}: formato de memória não reconhecido.`);
          const address = Number(match[1]);
          const value = parseByte(match[2], index + 1, "Byte");
          if (!Number.isInteger(address) || address < 0 || address >= MEMORY_SIZE) {
            throw new Error(`Linha ${index + 1}: endereço fora da memória.`);
          }
          nextMemory[address] = value;
          if (match[3] !== undefined) {
            if (address + 1 >= MEMORY_SIZE) throw new Error(`Linha ${index + 1}: operando ultrapassa a memória.`);
            nextMemory[address + 1] = parseByte(match[3], index + 1, "Operando");
          }
          validLines += 1;
        });
        if (validLines === 0) throw new Error("Nenhuma posição de memória foi encontrada.");
      }

      this.memory.set(nextMemory);
      this.changedAddresses = new Set();
      this.programListing = [];
      this.resetCPU();
      return lines.length;
    }

    updateNZ(value) {
      this.flags.n = (value & SIGN_BIT) !== 0 ? 1 : 0;
      this.flags.z = value === 0 ? 1 : 0;
    }

    readOperand() {
      return this.memory[(this.pc + 1) & MASK_8_BITS];
    }

    // Executa uma instrução e devolve um resumo que a interface pode registrar no histórico.
    step() {
      if (this.halted) return null;

      const startPC = this.pc;
      const opcode = this.memory[this.pc];
      const mnemonic = MNEMONICS_BY_OPCODE[opcode];
      if (mnemonic === undefined) {
        throw new Error(`Opcode inválido (${opcode}) no endereço ${startPC}.`);
      }

      const hasOperand = INSTRUCTIONS_WITH_OPERAND.has(mnemonic);
      const operand = hasOperand ? this.readOperand() : null;
      const value = hasOperand ? this.memory[operand] : null;
      const beforeAC = this.ac;
      const beforeFlags = { ...this.flags };
      let description = mnemonic;
      let nextPC = (this.pc + (hasOperand ? 2 : 1)) & MASK_8_BITS;

      switch (mnemonic) {
        case "NOP":
          description = "Nenhuma operação; segue para a próxima posição.";
          break;
        case "LDA":
          this.ac = value;
          this.updateNZ(this.ac);
          description = `AC recebe memória[${operand}] (${value}).`;
          break;
        case "STA":
          this.memory[operand] = this.ac;
          this.changedAddresses.add(operand);
          description = `Memória[${operand}] recebe AC (${this.ac}).`;
          break;
        case "ADD": {
          const result = this.ac + value;
          const wrapped = result & MASK_8_BITS;
          this.flags.c = result > MASK_8_BITS ? 1 : 0;
          this.flags.v = ((~(this.ac ^ value) & (this.ac ^ wrapped) & SIGN_BIT) !== 0) ? 1 : 0;
          this.ac = wrapped;
          this.updateNZ(this.ac);
          description = `AC recebe (${beforeAC} + ${value}) limitado a 8 bits.`;
          break;
        }
        case "SUB": {
          const result = this.ac - value;
          const wrapped = result & MASK_8_BITS;
          this.flags.b = this.ac < value ? 1 : 0;
          this.flags.v = (((this.ac ^ value) & (this.ac ^ wrapped) & SIGN_BIT) !== 0) ? 1 : 0;
          this.ac = wrapped;
          this.updateNZ(this.ac);
          description = `AC recebe (${beforeAC} - ${value}) limitado a 8 bits.`;
          break;
        }
        case "OR":
          this.ac = this.ac | value;
          this.updateNZ(this.ac);
          description = `AC recebe AC OR memória[${operand}].`;
          break;
        case "AND":
          this.ac = this.ac & value;
          this.updateNZ(this.ac);
          description = `AC recebe AC AND memória[${operand}].`;
          break;
        case "NOT":
          this.ac = (~this.ac) & MASK_8_BITS;
          this.updateNZ(this.ac);
          description = "Inverte os oito bits do acumulador.";
          break;
        case "JMP":
          nextPC = operand;
          description = `Desvio incondicional para ${operand}.`;
          break;
        case "JN":
          if (this.flags.n) nextPC = operand;
          description = this.flags.n ? `Desvio realizado para ${operand} (N=1).` : "Desvio não realizado (N=0).";
          break;
        case "JP":
          if (!this.flags.n) nextPC = operand;
          description = this.flags.n ? "Desvio não realizado (N=1)." : `Desvio realizado para ${operand} (N=0).`;
          break;
        case "JV":
          if (this.flags.v) nextPC = operand;
          description = this.flags.v ? `Desvio realizado para ${operand} (V=1).` : "Desvio não realizado (V=0).";
          break;
        case "JNV":
          if (!this.flags.v) nextPC = operand;
          description = this.flags.v ? "Desvio não realizado (V=1)." : `Desvio realizado para ${operand} (V=0).`;
          break;
        case "JZ":
          if (this.flags.z) nextPC = operand;
          description = this.flags.z ? `Desvio realizado para ${operand} (Z=1).` : "Desvio não realizado (Z=0).";
          break;
        case "JNZ":
          if (!this.flags.z) nextPC = operand;
          description = this.flags.z ? "Desvio não realizado (Z=1)." : `Desvio realizado para ${operand} (Z=0).`;
          break;
        case "JC":
          if (this.flags.c) nextPC = operand;
          description = this.flags.c ? `Desvio realizado para ${operand} (C=1).` : "Desvio não realizado (C=0).";
          break;
        case "JNC":
          if (!this.flags.c) nextPC = operand;
          description = this.flags.c ? "Desvio não realizado (C=1)." : `Desvio realizado para ${operand} (C=0).`;
          break;
        case "JB":
          if (this.flags.b) nextPC = operand;
          description = this.flags.b ? `Desvio realizado para ${operand} (B=1).` : "Desvio não realizado (B=0).";
          break;
        case "JNB":
          if (!this.flags.b) nextPC = operand;
          description = this.flags.b ? "Desvio não realizado (B=1)." : `Desvio realizado para ${operand} (B=0).`;
          break;
        case "SHR":
          this.flags.c = this.ac & 1;
          this.ac = this.ac >>> 1;
          this.updateNZ(this.ac);
          description = "Desloca os bits do acumulador uma posição à direita.";
          break;
        case "SHL":
          this.flags.c = (this.ac >>> 7) & 1;
          this.ac = (this.ac << 1) & MASK_8_BITS;
          this.updateNZ(this.ac);
          description = "Desloca os bits do acumulador uma posição à esquerda.";
          break;
        case "ROR": {
          const outgoingBit = this.ac & 1;
          this.ac = (this.ac >>> 1) | (this.flags.c << 7);
          this.flags.c = outgoingBit;
          this.updateNZ(this.ac);
          description = "Rotaciona à direita usando C como bit de entrada.";
          break;
        }
        case "ROL": {
          const outgoingBit = (this.ac >>> 7) & 1;
          this.ac = ((this.ac << 1) & MASK_8_BITS) | this.flags.c;
          this.flags.c = outgoingBit;
          this.updateNZ(this.ac);
          description = "Rotaciona à esquerda usando C como bit de entrada.";
          break;
        }
        case "HLT":
          this.halted = true;
          description = "Execução encerrada pela instrução HLT.";
          break;
        default:
          throw new Error(`Instrução ${mnemonic} ainda não implementada.`);
      }

      this.pc = nextPC;
      this.steps += 1;
      this.lastStep = {
        pc: startPC, opcode, mnemonic, operand, beforeAC,
        afterAC: this.ac, beforeFlags, afterFlags: { ...this.flags },
        nextPC: this.pc, description, halted: this.halted
      };
      return this.lastStep;
    }

    run(maxSteps = 10000) {
      const executed = [];
      while (!this.halted && executed.length < maxSteps) {
        const result = this.step();
        if (result) executed.push(result);
      }
      return {
        executed,
        halted: this.halted,
        limitReached: !this.halted && executed.length >= maxSteps
      };
    }

    getInstructionAt(address) {
      const item = this.programListing.find(entry => entry.address === address);
      if (item) return item.source;
      const opcode = this.memory[address];
      const mnemonic = MNEMONICS_BY_OPCODE[opcode];
      if (mnemonic === undefined) return `DADO ${opcode}`;
      if (INSTRUCTIONS_WITH_OPERAND.has(mnemonic)) {
        return `${mnemonic} ${this.memory[(address + 1) & MASK_8_BITS]}`;
      }
      return mnemonic;
    }
  }

  global.Ahmes = Object.freeze({
    AhmesMachine,
    MEMORY_SIZE,
    OPCODES,
    INSTRUCTIONS_WITH_OPERAND,
    MNEMONICS_BY_OPCODE
  });
})(window);
