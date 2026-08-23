const API_URL = "http://localhost:3000";

// Chave de teste do Hardhat (Account #1) — a mesma do TECNICO_PRIVATE_KEY
// no .env da API. É pública e serve só pra desenvolvimento local.
const CHAVE_PRIVADA_TECNICO =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const seletorChamado = document.getElementById("seletorChamado");
const botaoAtualizarLista = document.getElementById("botaoAtualizarLista");
const botaoEmAndamento = document.getElementById("botaoEmAndamento");
const botaoValidarManutencao = document.getElementById(
  "botaoValidarManutencao"
);
const resultado = document.getElementById("resultado");

let chamados = [];

botaoAtualizarLista.addEventListener("click", carregarChamados);
botaoEmAndamento.addEventListener("click", () =>
  executarAcao("em-andamento", "Chamado marcado como em andamento")
);
botaoValidarManutencao.addEventListener("click", () =>
  executarAcao("validar-manutencao", "Manutenção enviada para validação")
);

async function carregarChamados() {
  try {
    const resposta = await fetch(`${API_URL}/chamados-completos`);
    const dados = await resposta.json();

    if (!dados.sucesso) {
      throw new Error("Não foi possível carregar os chamados.");
    }

    chamados = dados.chamados.filter((c) => c.status !== "Concluído");
    preencherSeletor();
  } catch (erro) {
    exibirMensagem(`Erro ao carregar chamados: ${erro}`, "danger");
    console.error("Erro ao carregar chamados:", erro);
  }
}

function preencherSeletor() {
  if (!chamados.length) {
    seletorChamado.innerHTML =
      '<option value="">Nenhum chamado aberto</option>';
    atualizarDisponibilidadeBotoes(null);
    return;
  }

  seletorChamado.innerHTML = chamados
    .map(
      (c) =>
        `<option value="${c.id}">Chamado #${c.id} — ${c.status} (sensor ${c.sensorId})</option>`
    )
    .join("");

  atualizarDisponibilidadeBotoes(obterChamadoSelecionado());
}

seletorChamado?.addEventListener("change", () =>
  atualizarDisponibilidadeBotoes(obterChamadoSelecionado())
);

function obterChamadoSelecionado() {
  const id = Number(seletorChamado.value);
  return chamados.find((c) => c.id === id) || null;
}

function atualizarDisponibilidadeBotoes(chamado) {
  botaoEmAndamento.disabled = !chamado || chamado.status !== "Aberto";
  botaoValidarManutencao.disabled =
    !chamado || chamado.status !== "Em Andamento";
}

async function executarAcao(acao, mensagemSucesso) {
  const chamado = obterChamadoSelecionado();

  if (!chamado) {
    exibirMensagem("Selecione um chamado válido.", "warning");
    return;
  }

  exibirMensagem("Enviando...", "secondary");

  try {
    const resposta = await fetch(
      `${API_URL}/chamados/${chamado.id}/${acao}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chavePrivada: CHAVE_PRIVADA_TECNICO }),
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.erro || "Falha ao executar a ação.");
    }

    const tecnicoTexto = dados.tecnico
      ? `<div class="hash-mono mt-2">assinado por: ${dados.tecnico}</div>`
      : "";

    exibirMensagem(
      `${mensagemSucesso} (chamado #${chamado.id}).${tecnicoTexto}`,
      "success",
      true
    );

    await carregarChamados();
  } catch (erro) {
    exibirMensagem(`Erro: ${erro.message || erro}`, "danger");
    console.error("Erro ao executar ação:", erro);
  }
}

function exibirMensagem(mensagem, tipo = "secondary", ehHtml = false) {
  resultado.innerHTML = `<div class="text-bg-${tipo} p-2 rounded-3">${
    ehHtml ? mensagem : escaparHtml(mensagem)
  }</div>`;
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

carregarChamados();
