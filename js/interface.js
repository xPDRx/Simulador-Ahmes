/* Liga os controles da página ao núcleo da máquina Ahmes. */
(function () {
  "use strict";

  const machine = new window.Ahmes.AhmesMachine();
  const elements = {
    code: document.getElementById("codigo"),
    memoryTable: document.getElementById("tabela-memoria"),
    message: document.getElementById("mensagem"),
    currentInstruction: document.getElementById("instrucao-atual"),
    currentDetail: document.getElementById("instrucao-detalhe"),
    history: document.getElementById("historico"),
    steps: document.getElementById("contador-passos"),
    status: document.getElementById("cpu-status"),
    lineCount: document.getElementById("contador-linhas")
  };
  const memoryCells = [];
  const history = [];
  const MAX_HISTORY = 80;

  const sampleProgram = `; Exemplo: soma dois valores e guarda o resultado\n        LDA 129\n        ADD 128\n        STA 131\n        HLT\n\n        ORG 128\n        DB 126\n        DB 4`;

  function formatHex(value) {
    return `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
  }

  function showMessage(text, type = "info") {
    elements.message.textContent = text;
    elements.message.className = `message${type === "success" ? " message--success" : type === "error" ? " message--error" : ""}`;
  }

  function createMemoryTable() {
    const head = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.textContent = "·";
    headerRow.appendChild(corner);

    for (let column = 0; column < 16; column += 1) {
      const cell = document.createElement("th");
      cell.textContent = column.toString(16).toUpperCase();
      headerRow.appendChild(cell);
    }
    head.appendChild(headerRow);
    elements.memoryTable.appendChild(head);

    const body = document.createElement("tbody");
    for (let row = 0; row < 16; row += 1) {
      const tableRow = document.createElement("tr");
      const label = document.createElement("th");
      label.textContent = (row * 16).toString(16).toUpperCase().padStart(2, "0");
      tableRow.appendChild(label);

      for (let column = 0; column < 16; column += 1) {
        const address = row * 16 + column;
        const cell = document.createElement("td");
        cell.dataset.address = String(address);
        memoryCells[address] = cell;
        tableRow.appendChild(cell);
      }
      body.appendChild(tableRow);
    }
    elements.memoryTable.appendChild(body);
  }

  function updateStatus() {
    if (machine.halted) {
      elements.status.textContent = "Finalizado";
      elements.status.className = "status status--halted";
    } else if (machine.steps > 0) {
      elements.status.textContent = "Em execução";
      elements.status.className = "status status--running";
    } else {
      elements.status.textContent = "Parado";
      elements.status.className = "status status--idle";
    }
  }

  function updateMemory() {
    for (let address = 0; address < window.Ahmes.MEMORY_SIZE; address += 1) {
      const cell = memoryCells[address];
      cell.textContent = machine.memory[address];
      cell.classList.toggle("pc", address === machine.pc && !machine.halted);
      cell.classList.toggle("changed", machine.changedAddresses.has(address));
      cell.title = `Endereço ${address} (${formatHex(address)}): ${machine.memory[address]}`;
    }
  }

  function updateRegisters() {
    document.getElementById("reg-ac").textContent = machine.ac;
    document.getElementById("reg-pc").textContent = machine.pc;
    document.getElementById("reg-ac-hex").textContent = formatHex(machine.ac);
    document.getElementById("reg-pc-hex").textContent = formatHex(machine.pc);

    Object.entries(machine.flags).forEach(([name, value]) => {
      document.getElementById(`flag-${name}`).textContent = value;
      document.querySelector(`[data-flag="${name}"]`).classList.toggle("active", value === 1);
    });
    elements.steps.textContent = `${machine.steps} ${machine.steps === 1 ? "passo" : "passos"}`;
    updateStatus();
  }

  function updateCurrentInstruction() {
    if (machine.halted) {
      elements.currentInstruction.textContent = "HLT — programa finalizado";
      elements.currentDetail.textContent = `A execução terminou após ${machine.steps} instruções.`;
      return;
    }
    elements.currentInstruction.textContent = machine.getInstructionAt(machine.pc);
    elements.currentDetail.textContent = `Endereço ${machine.pc} · ${formatHex(machine.pc)} · opcode ${machine.memory[machine.pc]}`;
  }

  function updateHistory() {
    elements.history.replaceChildren();
    if (history.length === 0) {
      const empty = document.createElement("li");
      empty.className = "history-empty";
      empty.textContent = "As instruções executadas aparecerão aqui.";
      elements.history.appendChild(empty);
      return;
    }

    history.slice(-MAX_HISTORY).reverse().forEach(item => {
      const entry = document.createElement("li");
      entry.textContent = `${formatHex(item.pc)}  ${item.mnemonic}${item.operand === null ? "" : ` ${item.operand}`}  →  AC ${item.beforeAC} → ${item.afterAC}`;
      entry.title = item.description;
      elements.history.appendChild(entry);
    });
  }

  function updateLineCount() {
    const count = elements.code.value.split(/\r?\n/).length;
    elements.lineCount.textContent = `${count} ${count === 1 ? "linha" : "linhas"}`;
  }

  function refresh() {
    updateMemory();
    updateRegisters();
    updateCurrentInstruction();
    updateHistory();
    updateLineCount();
  }

  function clearHistory() {
    history.length = 0;
  }

  function recordStep(result) {
    if (result) history.push(result);
  }

  function executeOneStep() {
    try {
      const result = machine.step();
      if (!result) {
        showMessage("O programa já foi finalizado. Reinicie a CPU para executar novamente.");
        return;
      }
      recordStep(result);
      showMessage(result.halted ? `Programa finalizado em ${machine.steps} instruções.` : result.description, result.halted ? "success" : "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
    refresh();
  }

  document.getElementById("btn-montar").addEventListener("click", () => {
    try {
      const result = machine.assemble(elements.code.value);
      clearHistory();
      showMessage(`Programa montado: ${result.bytesUsed} byte(s) em ${result.listing.length} linha(s) de código/dados.`, "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
    refresh();
  });

  document.getElementById("btn-passo").addEventListener("click", executeOneStep);

  document.getElementById("btn-executar").addEventListener("click", () => {
    try {
      let executedNow = 0;
      while (!machine.halted && executedNow < 10000) {
        const result = machine.step();
        if (!result) break;
        recordStep(result);
        executedNow += 1;
      }
      if (machine.halted) {
        showMessage(`Programa finalizado em ${machine.steps} instruções.`, "success");
      } else if (executedNow === 10000) {
        showMessage("Execução interrompida após 10.000 instruções. Verifique se existe um loop sem condição de parada.", "error");
      }
    } catch (error) {
      showMessage(error.message, "error");
    }
    refresh();
  });

  // Reiniciar a CPU preserva o programa carregado; limpar memória apaga também o programa.
  document.getElementById("btn-resetar").addEventListener("click", () => {
    machine.resetCPU();
    clearHistory();
    showMessage("CPU reiniciada. A memória e o programa foram preservados.", "success");
    refresh();
  });

  document.getElementById("btn-exportar").addEventListener("click", () => {
    const dump = Array.from(machine.memory).join("\n") + "\n";
    const blob = new Blob([dump], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "memoria-ahmes.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showMessage("Arquivo de memória preparado para download.", "success");
  });

  document.getElementById("btn-limpar").addEventListener("click", () => {
    machine.clearMemory();
    clearHistory();
    showMessage("Memória limpa e CPU reiniciada.", "success");
    refresh();
  });

  document.getElementById("arquivo").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const content = await file.text();
      machine.loadMemoryText(content);
      clearHistory();
      elements.code.value = "; Memória importada de arquivo.\n; O conteúdo foi carregado nos endereços correspondentes.\n; A desmontagem automática não é garantida para dumps sem metadados.";
      showMessage(`Arquivo "${file.name}" carregado na memória.`, "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
    refresh();
    event.target.value = "";
  });

  elements.code.addEventListener("input", updateLineCount);
  createMemoryTable();
  elements.code.value = sampleProgram;
  refresh();
})();
