const API_URL = "http://localhost:3000";
const BROKER_WS_URL = "ws://localhost:9001";
const TOPICO = "sensor/sinal";
const INTERVALO_ENVIO_MS = 4000;

const statusBroker = document.getElementById("statusBroker");
const listaSensores = document.getElementById("listaSensores");
const botaoIniciarTodos = document.getElementById("botaoIniciarTodos");
const botaoPararTodos = document.getElementById("botaoPararTodos");

const estadoPorSensor = new Map();
let cliente = null;

botaoIniciarTodos.addEventListener("click", () => {
  estadoPorSensor.forEach((estado, id) => iniciarEnvio(id));
});

botaoPararTodos.addEventListener("click", () => {
  estadoPorSensor.forEach((estado, id) => pararEnvio(id));
});

function conectarBroker() {
  cliente = mqtt.connect(BROKER_WS_URL);

  cliente.on("connect", () => {
    statusBroker.textContent = "Conectado ao broker";
    statusBroker.className = "badge text-bg-success";
  });

  cliente.on("reconnect", () => {
    statusBroker.textContent = "Reconectando ao broker...";
    statusBroker.className = "badge text-bg-warning";
  });

  cliente.on("close", () => {
    statusBroker.textContent = "Desconectado do broker";
    statusBroker.className = "badge text-bg-secondary";
  });

  cliente.on("error", (erro) => {
    statusBroker.textContent = "Erro na conexão com o broker";
    statusBroker.className = "badge text-bg-danger";
    console.error("Erro MQTT:", erro);
  });
}

async function carregarSensores() {
  try {
    const resposta = await fetch(`${API_URL}/sensores`);
    const dados = await resposta.json();

    if (!dados.sucesso) {
      throw new Error("Não foi possível carregar os sensores.");
    }

    dados.sensores.forEach((sensor) => {
      estadoPorSensor.set(sensor.id, { ativo: false, intervalo: null, ultimoEnvio: null });
    });

    renderizarSensores(dados.sensores);
  } catch (erro) {
    listaSensores.innerHTML = `<div class="col-12"><p class="text-danger">Erro ao carregar sensores: ${erro.message || erro}</p></div>`;
    console.error("Erro ao carregar sensores:", erro);
  }
}

function renderizarSensores(sensores) {
  listaSensores.innerHTML = sensores
    .map(
      (sensor) => `
        <div class="col-md-6">
          <div id="card-${sensor.id}" class="card sensor-card parado">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h2 class="h6 text-white mb-1">Sensor ${sensor.id}</h2>
                  <div class="text-secondary small">${sensor.latitude.toFixed(4)}, ${sensor.longitude.toFixed(4)}</div>
                </div>
                <span id="badge-${sensor.id}" class="badge text-bg-secondary">Parado</span>
              </div>
              <div id="ultimoSinal-${sensor.id}" class="ultimo-sinal mt-2">Nenhum sinal enviado ainda.</div>
              <div class="d-flex gap-2 mt-3">
                <button id="toggle-${sensor.id}" class="btn btn-sm btn-outline-success flex-fill">
                  Iniciar envio
                </button>
                <button id="unico-${sensor.id}" class="btn btn-sm btn-outline-secondary">
                  Enviar sinal único
                </button>
              </div>
            </div>
          </div>
        </div>
      `
    )
    .join("");

  sensores.forEach((sensor) => {
    document
      .getElementById(`toggle-${sensor.id}`)
      .addEventListener("click", () => alternarEnvio(sensor.id));

    document
      .getElementById(`unico-${sensor.id}`)
      .addEventListener("click", () => enviarSinal(sensor.id));
  });
}

function alternarEnvio(sensorId) {
  const estado = estadoPorSensor.get(sensorId);
  if (estado.ativo) {
    pararEnvio(sensorId);
  } else {
    iniciarEnvio(sensorId);
  }
}

function iniciarEnvio(sensorId) {
  const estado = estadoPorSensor.get(sensorId);
  if (estado.ativo) {
    return;
  }

  estado.ativo = true;
  enviarSinal(sensorId);
  estado.intervalo = setInterval(() => enviarSinal(sensorId), INTERVALO_ENVIO_MS);

  atualizarCard(sensorId);
}

function pararEnvio(sensorId) {
  const estado = estadoPorSensor.get(sensorId);
  if (!estado.ativo) {
    return;
  }

  estado.ativo = false;
  clearInterval(estado.intervalo);
  estado.intervalo = null;

  atualizarCard(sensorId);
}

function enviarSinal(sensorId) {
  if (!cliente || !cliente.connected) {
    console.warn("Broker ainda não conectado, sinal não enviado.");
    return;
  }

  cliente.publish(TOPICO, String(sensorId));

  const estado = estadoPorSensor.get(sensorId);
  estado.ultimoEnvio = new Date();

  const elementoUltimoSinal = document.getElementById(`ultimoSinal-${sensorId}`);
  if (elementoUltimoSinal) {
    elementoUltimoSinal.textContent = `Último sinal enviado às ${estado.ultimoEnvio.toLocaleTimeString("pt-BR")}`;
  }
}

function atualizarCard(sensorId) {
  const estado = estadoPorSensor.get(sensorId);
  const card = document.getElementById(`card-${sensorId}`);
  const badge = document.getElementById(`badge-${sensorId}`);
  const botaoToggle = document.getElementById(`toggle-${sensorId}`);

  if (estado.ativo) {
    card.classList.remove("parado");
    card.classList.add("ativo");
    badge.textContent = "Enviando sinal";
    badge.className = "badge text-bg-success";
    botaoToggle.textContent = "Parar (simular obstrução)";
    botaoToggle.className = "btn btn-sm btn-outline-danger flex-fill";
  } else {
    card.classList.remove("ativo");
    card.classList.add("parado");
    badge.textContent = "Parado";
    badge.className = "badge text-bg-secondary";
    botaoToggle.textContent = "Iniciar envio";
    botaoToggle.className = "btn btn-sm btn-outline-success flex-fill";
  }
}

conectarBroker();
carregarSensores();
