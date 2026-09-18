# Docker — assistant-app

Sobe os dois serviços do projeto com um comando: **backend** (FastAPI) e **frontend** (Next.js).

## Passo a passo

1. Ter o Docker Desktop rodando.
2. Conferir se existe `backend/ai-integration/.env` com as credenciais:
   ```
   AZURE_TENANT_ID=...
   AZURE_CLIENT_ID=...
   AZURE_CLIENT_SECRET=...
   ```
3. Na raiz do projeto:
   ```bash
   docker compose up --build
   ```
4. Acessar:
   - Frontend: http://localhost:3000
   - Backend (docs): http://localhost:8000/docs
5. Parar: `Ctrl+C` e, para remover os containers, `docker compose down`.

## O que o `--build` faz

Sim: ele constrói as imagens a partir dos `Dockerfile` do backend e do frontend (os serviços que têm `build:` no compose) **antes** de subir os containers.

Sem `--build`, o `docker compose up` só constrói uma imagem que ainda **não existe**. Se ela já existe, ele reaproveita a que está no cache — mesmo que você tenha alterado o código ou o `Dockerfile`. Por isso a mudança "não aparece".

| Comando | Quando usar |
| --- | --- |
| `docker compose up --build` | Mudou código, `Dockerfile`, `package.json` ou `pyproject.toml`. |
| `docker compose up` | Nada mudou — só quer subir de novo. |
| `docker compose build` | Só construir, sem subir. |
| `docker compose up --build backend` | Reconstruir e subir apenas um serviço. |

`--build` **não** ignora o cache de camadas: passos cujos arquivos não mudaram continuam sendo reaproveitados (ex.: o `npm ci` só roda de novo se o `package-lock.json` mudar). Para ignorar o cache por completo: `docker compose build --no-cache`.


## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `docker-compose.yml` | Orquestra os dois serviços, define portas, variáveis e ordem de subida. |
| `backend/ai-integration/Dockerfile` | Imagem do FastAPI (python:3.13-slim + uvicorn). |
| `backend/ai-integration/.dockerignore` | Exclui `.env`, `.venv`, `__pycache__` da imagem. |
| `frontend/Dockerfile` | Imagem do Next.js em 3 estágios (deps → build → runner). |
| `frontend/.dockerignore` | Exclui `node_modules`, `.next`, `.git` do contexto de build. |

## docker-compose.yml

- **backend** — build de `./backend/ai-integration`, publica `8000:8000`, lê os segredos via `env_file` (o `.env` não entra na imagem).
- **frontend** — build de `./frontend`, publica `3000:3000`, `depends_on: backend`, e recebe `BACKEND_URL=http://backend:8000/data-agent/query`.
- Ambos com `restart: unless-stopped`.

Dentro da rede do compose os containers se acham pelo **nome do serviço** (`backend`), não por `localhost`. Por isso `app/api/chat/route.ts` passou a ler `process.env.BACKEND_URL`, com fallback para `http://localhost:8000/data-agent/query` quando rodando fora do Docker.

## Dockerfile do backend

1. Base `python:3.13-slim`.
2. Instala as dependências declaradas no `pyproject.toml` (`fastapi[standard]`, `azure-identity`, `mcp`, `python-dotenv`, `uvicorn`).
3. Copia `main.py` e `service/`.
4. Sobe com `uvicorn main:app --host 0.0.0.0 --port 8000`.

> **Por que não usa `requirements.txt`:** ele é um `pip freeze` da máquina Windows (pywin32, pyinstaller, PyAutoGUI…) e quebra o build em Linux. Para um build reproduzível, gerar um requirements limpo a partir do `uv.lock`.

## Dockerfile do frontend

Multi-stage para a imagem final ficar pequena:

1. **deps** — `npm ci` a partir de `package.json` + `package-lock.json` (fica em cache enquanto o lock não mudar).
2. **builder** — copia o código e roda `npm run build`.
3. **runner** — leva só `public/`, `.next/standalone` e `.next/static`, e roda `node server.js`.

Isso depende de `output: "standalone"` no `next.config.ts` — o Next gera um servidor autocontido, sem precisar do `node_modules` completo na imagem final.

## Segurança

O `backend/ai-integration/.env` está versionado no git com o client secret da Azure. Recomendado: remover do repositório (`git rm --cached`), adicionar ao `.gitignore` e **rotacionar o secret**.
