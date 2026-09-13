# SmartDrain Web

Dashboard e painel do técnico do projeto SmartDrain. Mostra os chamados de manutenção num mapa, métricas gerais e a timeline auditável de cada chamado, e permite disparar as ações do técnico (em andamento, validar manutenção) sem precisar de Postman.

## Sobre o projeto

Este repositório faz parte de um TCC sobre o uso de blockchain para automatizar, rastrear e auditar a manutenção de bocas de lobo. O projeto é dividido em três repositórios:

- [smartdrain-contract](https://github.com/RafaelGasparoto/smartdrain-contract) — contrato inteligente (Solidity/Hardhat)
- [smartdrain-api](https://github.com/RafaelGasparoto/smartdrain-api) — API que integra os sensores (MQTT) com a blockchain
- **smartdrain-web** (este repositório) — dashboard e painel do técnico

## Rodando tudo com Docker (mais rápido)

O `docker-compose.yml` fica no repositório [smartdrain-api](https://github.com/RafaelGasparoto/smartdrain-api),
na raiz. Baixe só esse arquivo e rode:

```shell
docker compose pull
docker compose up
```

Requisito: Docker Desktop instalado e em execução.

| Serviço | Endereço |
| --- | --- |
| Dashboard (este repositório) | http://localhost:8080 |
| Painel do técnico (este repositório) | http://localhost:8080/tecnico.html |
| Simulador de sensores (este repositório) | http://localhost:8080/simulador.html |
| API | http://localhost:3000 |
| Blockchain local (Hardhat) | `localhost:8545` |
| Broker MQTT | `localhost:1883` (MQTT) / `localhost:9001` (WebSocket) |

Pra derrubar: `Ctrl+C` e `docker compose down`.

## Rodando sem Docker

Frontend estático, sem build. Com a API rodando em `http://localhost:3000`, basta abrir o `index.html` no navegador.

- `index.html` / `script.js` — dashboard (mapa, métricas, auditoria)
- `tecnico.html` / `tecnico.js` — painel do técnico
- `simulador.html` / `simulador.js` — simulador de sensores: publica no tópico MQTT via WebSocket para
  simular o envio periódico de sinal (sensor funcionando) ou a ausência dele (sensor obstruído)
