const API_URL = "http://localhost:3000";
const campoHash = document.getElementById("campoHash");
const botaoConsultar = document.getElementById("botaoConsultar");
const tabelaChamados = document.getElementById("tabelaChamados");
const resultadoAuditoria = document.getElementById("resultadoAuditoria");

const CENTRO_PADRAO = [-24.7212, -53.7428];

const COR_POR_STATUS = {
  Aberto: "#dc3545",
  "Em Andamento": "#ffc107",
  "Validar Manutenção": "#0dcaf0",
  Concluído: "#198754",
};

const LABEL_EVENTO = {
  NovoChamado: { texto: "Chamado aberto", icone: "📍" },
  ChamadoEmAndamento: { texto: "Atendimento iniciado", icone: "🔧" },
  ChamadoValidarManutencao: {
    texto: "Manutenção enviada para validação",
    icone: "🕓",
  },
  ChamadoFinalizado: { texto: "Chamado finalizado", icone: "✅" },
  ChamadoFinalizadoAutomaticamente: {
    texto: "Finalizado automaticamente (sem intervenção técnica)",
    icone: "⚡",
  },
};

let mapa;
let marcadores = [];

botaoConsultar.addEventListener("click", () => {
  const hash = campoHash.value.trim();
  if (!hash) {
    exibirMensagemAuditoria("Informe um hash válido antes de consultar.");
    return;
  }
  consultarAuditoria(hash);
});

function inicializarMapa() {
  mapa = L.map("mapa").setView(CENTRO_PADRAO, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(mapa);
}

function obterUltimoChamadoPorSensor(chamados) {
  const porSensor = new Map();

  chamados.forEach((chamado) => {
    const atual = porSensor.get(chamado.sensorId);
    if (!atual || chamado.id > atual.id) {
      porSensor.set(chamado.sensorId, chamado);
    }
  });

  return [...porSensor.values()];
}

function atualizarMapa(chamados) {
  marcadores.forEach((marcador) => mapa.removeLayer(marcador));
  marcadores = [];

  const ultimoPorSensor = obterUltimoChamadoPorSensor(chamados);

  ultimoPorSensor.forEach((chamado) => {
    const sensorNormal = chamado.status === "Concluído";

    const marcador = L.circleMarker([chamado.lat, chamado.long], {
      radius: 10,
      color: "#000",
      weight: 1,
      fillColor: sensorNormal
        ? COR_POR_STATUS["Concluído"]
        : COR_POR_STATUS[chamado.status] || "#6c757d",
      fillOpacity: 0.9,
    }).addTo(mapa);

    const conteudoPopup = sensorNormal
      ? `<strong>Sensor ${chamado.sensorId}</strong><br>Operando normalmente<br>` +
        `<button class="btn btn-sm btn-outline-secondary mt-2" data-id-chamado="${chamado.id}">Ver último chamado</button>`
      : `<strong>Chamado #${chamado.id}</strong><br>Sensor ${chamado.sensorId}<br>Status: ${chamado.status}<br>` +
        `<button class="btn btn-sm btn-primary mt-2" data-id-chamado="${chamado.id}">Ver detalhes</button>`;

    marcador.bindPopup(conteudoPopup);

    marcador.on("popupopen", () => {
      const botao = document.querySelector(
        `[data-id-chamado="${chamado.id}"]`
      );
      botao?.addEventListener("click", () => exibirDetalheChamado(chamado.id));
    });

    marcadores.push(marcador);
  });

  if (marcadores.length) {
    const grupo = L.featureGroup(marcadores);
    mapa.fitBounds(grupo.getBounds(), { maxZoom: 15, padding: [30, 30] });
  }
}

function atualizarMetricas(chamados) {
  const total = chamados.length;
  const abertos = chamados.filter((c) => c.status !== "Concluído").length;
  const concluidos = chamados.filter((c) => c.status === "Concluído");
  const semIntervencao = concluidos.filter(
    (c) => c.finalizadoSemIntervencao
  ).length;

  let tempoMedioTexto = "—";
  if (concluidos.length) {
    const mediaMs =
      concluidos.reduce(
        (soma, c) => soma + (c.dataFechamento - c.dataAbertura),
        0
      ) / concluidos.length;
    tempoMedioTexto = formatarDuracao(mediaMs);
  }

  document.getElementById("metricaTotal").textContent = total;
  document.getElementById("metricaAbertos").textContent = abertos;
  document.getElementById("metricaTempoMedio").textContent = tempoMedioTexto;
  document.getElementById("metricaSemIntervencao").textContent =
    semIntervencao;
  document.getElementById("metricaConcluidos").textContent =
    concluidos.length;
}

function formatarDuracao(ms) {
  const minutos = Math.round(ms / 60000);
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const restoMin = minutos % 60;
  return `${horas}h ${restoMin}min`;
}

async function carregarChamadosCompletos() {
  try {
    const resposta = await fetch(`${API_URL}/chamados-completos`);
    const dados = await resposta.json();

    if (!dados.sucesso) {
      throw new Error("Resposta inválida do servidor.");
    }

    atualizarMapa(dados.chamados);
    atualizarMetricas(dados.chamados);
  } catch (erro) {
    console.error("Erro ao carregar chamados completos:", erro);
  }
}

async function carregarDados() {
  try {
    const resposta = await fetch(`${API_URL}/chamados`);

    if (!resposta.ok) {
      throw new Error(`Erro ao carregar dados: ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (!dados.sucesso) {
      throw new Error("Resposta inválida do servidor.");
    }

    preencherTabela(dados.chamados);
  } catch (erro) {
    exibirMensagemAuditoria(`Erro ao carregar dados: ${erro}`);
    console.error("Erro ao carregar dados:", erro);
  }
}

function preencherTabela(chamados) {
  tabelaChamados.innerHTML = "";

  if (!chamados.length) {
    tabelaChamados.innerHTML =
      '<tr><td colspan="5">Nenhum chamado encontrado.</td></tr>';
    return;
  }

  chamados.forEach((chamado) => {
    const infoEvento = LABEL_EVENTO[chamado.evento] || {
      texto: chamado.evento,
      icone: "•",
    };

    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${chamado.id}</td>
      <td>${new Date(chamado.timestamp * 1000).toLocaleString("pt-BR")}</td>
      <td>${infoEvento.icone} ${infoEvento.texto}</td>
      <td class="hash-link">${chamado.hashTransacao}</td>
      <td></td>
    `;

    const celulaBotao = document.createElement("td");
    const botao = document.createElement("button");
    botao.className = "btn btn-sm btn-outline-primary";
    botao.textContent = "Consultar";
    botao.addEventListener("click", () =>
      consultarAuditoria(chamado.hashTransacao),
    );
    celulaBotao.appendChild(botao);
    linha.replaceChild(celulaBotao, linha.lastElementChild);

    tabelaChamados.appendChild(linha);
  });
}

async function consultarAuditoria(hash) {
  exibirMensagemAuditoria("Carregando auditoria...");

  try {
    const resposta = await fetch(`${API_URL}/auditoria/${hash}`);

    if (!resposta.ok) {
      const corpoErro = await resposta.json().catch(() => null);
      throw new Error(corpoErro?.erro || `Erro ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (!dados.sucesso) {
      throw new Error("Falha ao consultar auditoria.");
    }

    await exibirDetalheChamado(dados.chamado.id, hash);
  } catch (erro) {
    exibirMensagemAuditoria(`Erro ao consultar auditoria: ${erro}`);
    console.error("Erro ao consultar auditoria:", erro);
  }
}

async function exibirDetalheChamado(idChamado, hashConsultado) {
  exibirMensagemAuditoria("Carregando detalhes do chamado...");

  try {
    const [respostaChamado, respostaHistorico] = await Promise.all([
      fetch(`${API_URL}/chamados/${idChamado}`),
      fetch(`${API_URL}/chamados/${idChamado}/historico`),
    ]);

    const dadosChamado = await respostaChamado.json();
    const dadosHistorico = await respostaHistorico.json();

    if (!dadosChamado.sucesso || !dadosHistorico.sucesso) {
      throw new Error("Não foi possível carregar os detalhes do chamado.");
    }

    renderizarDetalheChamado(
      dadosChamado.chamado,
      dadosHistorico.historico,
      hashConsultado
    );
  } catch (erro) {
    exibirMensagemAuditoria(`Erro ao carregar chamado: ${erro}`);
    console.error("Erro ao carregar chamado:", erro);
  }
}

function renderizarDetalheChamado(chamado, historico, hashConsultado) {
  const hashDestaque =
    hashConsultado ||
    historico[historico.length - 1]?.hashTransacao ||
    "";

  const idBotaoCopiar = `copiar-${Math.random().toString(36).slice(2)}`;

  const passosHtml = historico
    .map((evento) => {
      const info = LABEL_EVENTO[evento.evento] || {
        texto: evento.evento,
        icone: "•",
      };
      return `
        <div class="timeline-passo">
          <div class="timeline-marcador">${info.icone}</div>
          <div class="fw-semibold">${info.texto}</div>
          <div class="text-secondary small">${new Date(
            evento.timestamp * 1000
          ).toLocaleString("pt-BR")}</div>
          <div class="timeline-hash">hash: ${evento.hashTransacao}</div>
        </div>
      `;
    })
    .join("");

  const passoPendenteHtml =
    chamado.status !== "Concluído"
      ? `
        <div class="timeline-passo pendente">
          <div class="timeline-marcador">…</div>
          <div class="fw-semibold text-secondary">Aguardando próxima etapa</div>
        </div>
      `
      : "";

  resultadoAuditoria.innerHTML = `
    <div class="d-flex align-items-center gap-2 p-2 rounded-3 bg-success-subtle border border-success mb-3">
      <span class="fs-5">✅</span>
      <div class="flex-grow-1">
        <div class="fw-semibold text-success-emphasis">Verificado on-chain</div>
        <div class="small font-monospace text-truncate" style="max-width: 320px;" title="${hashDestaque}">${hashDestaque}</div>
      </div>
      <button id="${idBotaoCopiar}" class="btn btn-sm btn-outline-success">Copiar hash</button>
    </div>

    <div class="mb-3">
      <span class="badge text-bg-secondary me-2">Chamado #${chamado.id}</span>
      <span class="badge" style="background:${COR_POR_STATUS[chamado.status] || "#6c757d"}">${chamado.status}</span>
      ${chamado.tecnico ? `<span class="badge text-bg-dark ms-2">Técnico: ${chamado.tecnico}</span>` : ""}
    </div>

    <div class="timeline">
      ${passosHtml}
      ${passoPendenteHtml}
    </div>
  `;

  document
    .getElementById(idBotaoCopiar)
    .addEventListener("click", (evento) =>
      copiarTexto(hashDestaque, evento.currentTarget)
    );
}

function exibirMensagemAuditoria(mensagem) {
  resultadoAuditoria.innerHTML = `<p class="text-secondary mb-0">${mensagem}</p>`;
}

async function copiarTexto(texto, botao) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const campoTemporario = document.createElement("textarea");
    campoTemporario.value = texto;
    document.body.appendChild(campoTemporario);
    campoTemporario.select();
    document.execCommand("copy");
    campoTemporario.remove();
  }

  if (botao) {
    const textoOriginal = botao.textContent;
    botao.textContent = "Copiado!";
    setTimeout(() => (botao.textContent = textoOriginal), 1500);
  }
}

inicializarMapa();
carregarChamadosCompletos();
carregarDados();
