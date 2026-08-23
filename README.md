# SmartDrain Web

Dashboard e painel do técnico do projeto SmartDrain. Mostra os chamados de manutenção num mapa, métricas gerais e a timeline auditável de cada chamado, e permite disparar as ações do técnico (em andamento, validar manutenção) sem precisar de Postman.

## Sobre o projeto

Este repositório faz parte de um TCC sobre o uso de blockchain para automatizar, rastrear e auditar a manutenção de bocas de lobo. O projeto é dividido em três repositórios:

- [smartdrain-contract](https://github.com/RafaelGasparoto/smartdrain-contract) — contrato inteligente (Solidity/Hardhat)
- [smartdrain-api](https://github.com/RafaelGasparoto/smartdrain-api) — API que integra os sensores (MQTT) com a blockchain
- **smartdrain-web** (este repositório) — dashboard e painel do técnico

## Uso

Frontend estático, sem build. Com a API rodando em `http://localhost:3000`, basta abrir o `index.html` no navegador.

- `index.html` / `script.js` — dashboard (mapa, métricas, auditoria)
- `tecnico.html` / `tecnico.js` — painel do técnico
