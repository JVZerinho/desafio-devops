# Desafio DevOps: Stack Web Fullstack com Docker, CI/CD e Nginx Reverse Proxy

Este repositório contém a solução completa para o Desafio DevOps, implementando uma arquitetura conteinerizada para uma aplicação web moderna (Next.js no frontend, Django no backend, PostgreSQL como banco de dados e Nginx como reverse proxy com suporte a SSL/TLS e redirecionamento HTTP -> HTTPS), acompanhada de pipeline automatizado de CI/CD via GitHub Actions e publicação no GitHub Container Registry (GHCR).

---

## 🛠️ Arquitetura e Tecnologias

- **Frontend:** Next.js (App Router, Node.js 20, compilação standalone multi-stage em produção).
- **Backend:** Django (Python 3.12, Gunicorn em produção, gerenciador de dependências `uv`/`pip`).
- **Banco de Dados:** PostgreSQL 16 Alpine com healthcheck ativo e volume persistente.
- **Reverse Proxy & SSL:** Nginx Alpine atuando como ponto único de entrada (portas 80 e 443), com terminação SSL (TLSv1.2 / TLSv1.3) e isolamento total das portas de aplicação no host.
- **CI/CD:** GitHub Actions com execução paralela fail-fast, cache de dependências (pip e npm) e publicação automática de imagens no GHCR.

```
                     [ Cliente / Navegador ]
                                │
                    ┌───────────┴───────────┐
                    │                       │
              HTTP (Porta 80)        HTTPS (Porta 443)
                    │                       │
                    ▼                       ▼
            [ Redirecionamento 301 ]   [ Nginx Reverse Proxy ]
                                            │
                        ┌───────────────────┴───────────────────┐
                        │                                       │
                  /api/ e /admin/                               /
                        │                                       │
                        ▼                                       ▼
            [ Django (Gunicorn:8000) ]              [ Next.js (Node:3000) ]
                        │
                        ▼
            [ PostgreSQL (db:5432) ]
```

---

## 📁 Estrutura de Diretórios

```
desafio-devops/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Pipeline CI/CD Fail-Fast no GitHub Actions
├── backend/
│   ├── config/                    # Projeto Django (settings, urls, test_health)
│   ├── Dockerfile                 # Imagem de desenvolvimento
│   ├── Dockerfile.prod            # Imagem multi-stage otimizada e não-root
│   ├── pyproject.toml / uv.lock   # Gestão moderna com uv
│   └── requirements.txt           # Dependências para build e CI
├── frontend/
│   ├── app/                       # Páginas e componentes Next.js
│   ├── Dockerfile                 # Imagem de desenvolvimento
│   ├── Dockerfile.prod            # Imagem multi-stage com standalone output e não-root
│   └── package.json / lock        # Dependências Node.js
├── nginx/
│   ├── certs/                     # Certificados SSL (.gitkeep com .crt e .key ignorados)
│   └── nginx.conf                 # Configuração do Reverse Proxy e SSL
├── .env.example                   # Modelo de variáveis de ambiente
├── docker-compose.yml             # Orquestração do ambiente de Desenvolvimento
├── docker-compose-prod.yml        # Orquestração do ambiente de Produção (isolado e seguro)
└── README.md                      # Documentação técnica do projeto
```

---

## 🚀 Como Executar

### 1. Pré-requisitos
- [Docker](https://www.docker.com/) e Docker Compose instalados.
- [Git](https://git-scm.com/) instalado.
- [OpenSSL](https://www.openssl.org/) (para gerar os certificados SSL locais).

Crie o arquivo `.env` a partir do modelo:
```bash
cp .env.example .env
```

---

### 2. Ambiente de Desenvolvimento

No ambiente de desenvolvimento, o código fonte local é mapeado via bind-mount nos containers para hot-reloading em tempo real. As portas dos serviços são expostas no host para depuração facilitada:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **Postgres:** acessível internamente pelo container `db` na porta 5432

```bash
# Subir a stack de desenvolvimento
docker compose up --build

# Para encerrar a execução
docker compose down
```

---

### 3. Ambiente de Produção com Nginx e SSL

Em produção:
- Imagens otimizadas multi-stage executadas sob usuários sem privilégios de root (`appuser` e `nextjs`).
- **Nenhuma porta de serviço (3000, 8000, 5432) é exposta no host.** Apenas as portas **80** (HTTP) e **443** (HTTPS) do Nginx ficam públicas.
- Todo tráfego HTTP é redirecionado permanentemente (301) para HTTPS.

#### Passo A: Gerar o Certificado SSL Autoassinado

No terminal **PowerShell (Windows)**:
```powershell
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/certs/selfsigned.key -out nginx/certs/selfsigned.crt -subj "/CN=localhost"
```

No **Linux / Git Bash / macOS**:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/selfsigned.key \
  -out nginx/certs/selfsigned.crt \
  -subj "/CN=localhost"
```

#### Passo B: Subir a Stack de Produção

```bash
docker compose -f docker-compose-prod.yml up --build -d
```

#### Passo C: Validar os Endpoints

1. **Redirecionamento HTTP -> HTTPS (Status 301):**
   ```bash
   # Windows PowerShell: use curl.exe
   curl.exe -I http://localhost
   ```
   *Retorno esperado:* `HTTP/1.1 301 Moved Permanently` apontando para `Location: https://localhost/`.

2. **Acesso seguro via proxy (JSON da API via 443):**
   ```bash
   curl.exe -k https://localhost/api/health/
   ```
   *Retorno esperado:*
   ```json
   {"status": "ok", "items": ["Configurar Docker", "Automatizar CI", "Publicar no GHCR"]}
   ```

3. **Acesso ao Frontend:**
   Acesse no navegador: [https://localhost](https://localhost) (aceite o aviso de certificado autoassinado). O painel carregará o status da API sem erros de Mixed Content ou CORS.

---

## 🔄 Pipeline CI/CD (.github/workflows/ci.yml)

O pipeline implementa estratégia **Fail-Fast** com duas trilhas paralelas e independentes:

| Trilha | Etapa 1: Lint | Etapa 2: Build | Etapa 3: Testes | Etapa 4: Deploy (GHCR) |
|---|---|---|---|---|
| **Backend** | `lint-backend` (flake8 com `--select=E9,F63,F7,F82`) | `build-backend` (Docker build da imagem) | `test-backend` (Django tests com service Postgres) | `deploy-backend` (Push da imagem prod no GHCR) |
| **Frontend** | `lint-frontend` (ESLint) | `build-frontend` (Next.js build) | `test-frontend` (Validação de suíte de testes) | `deploy-frontend` (Push da imagem prod no GHCR) |

### Características:
- **Fail-Fast:** Se o lint falhar, as etapas de build, teste e deploy subsequentes são automaticamente canceladas.
- **Cache:** Utilização de cache nativo das actions para dependências `pip` e `npm`.
- **Publicação de Imagens:** Geração e publicação de tags `:latest` e `:<commit-sha>` no GitHub Container Registry (`ghcr.io`).

---

## 📸 Validação do Fail-Fast (Exigência do Edital)

Para demonstrar o funcionamento do Fail-Fast no relatório, capture prints das seguintes 3 falhas induzidas no GitHub Actions:

1. **Erro de Lint no Backend:**
   - Quebre intencionalmente a sintaxe em `backend/config/urls.py` (ex: remova uma vírgula ou parêntese).
   - Faça commit e push.
   - *Resultado esperado:* O job `lint-backend` falha imediatamente e os jobs `build-backend`, `test-backend` e `deploy-backend` são ignorados (*skipped*).

2. **Erro de Build no Frontend:**
   - Adicione um import inválido no arquivo `frontend/app/page.js`:
     ```javascript
     import 'pacote-que-nao-existe';
     ```
   - Faça commit e push.
   - *Resultado esperado:* O `lint-frontend` passa com sucesso, porém o job `build-frontend` falha na compilação do Next.js. Os jobs posteriores são ignorados.

3. **Teste Unitário Quebrado:**
   - No arquivo `backend/config/test_health.py`, altere a asserção esperada de `200` para `500`:
     ```python
     self.assertEqual(response.status_code, 500)
     ```
   - Faça commit e push.
   - *Resultado esperado:* O lint e o build passam, mas o job `test-backend` falha na execução do teste unitário.

4. **Trilhas 100% Verdes:**
   - Recomponha as alterações originais dos arquivos, faça commit e push.
   - *Resultado esperado:* Todas as etapas de ambas as trilhas concluem com sucesso (status verde).
