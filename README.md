# Vizio Capital — Landing Page + Agente de IA para Análise de Apólices

Landing page profissional e moderna para a Vizio Capital, corretora de seguros corporativos, com agente de IA integrado para análise de apólices de Seguro de Vida em Grupo.

## Características

### Landing Page
- **Design Dark Premium**: Visual moderno e sofisticado com fundo escuro (#0d0d0d), acentos dourados (#c5a55a) e tipografia elegante
- **Seções Completas**:
  - Hero com headline, subtítulo e formulário de cotação
  - Benefícios (3 cards com bordas douradas)
  - Prova social (números em destaque)
  - Pilares da Vizio Capital
  - Seção de urgência (riscos de não conformidade)
  - Footer com logo e slogan
- **Responsivo**: Mobile-first, funciona em todos os dispositivos
- **Animações**: Scroll reveal, hover effects, shimmer no CTA

### Agente de IA para Análise de Apólices
- **Formulário de Captura**: Nome, Empresa, CNPJ, WhatsApp, E-mail, Convenção Coletiva
- **Upload de PDF**: Drag-and-drop com fallback para clique
- **Análise com IA**: GPT-4.1-mini via OpenAI API
  - Extração automática de texto do PDF
  - Análise de 7 coberturas obrigatórias
  - Identificação de gaps de cobertura
  - Comparação de preço vs mercado
- **Relatório Visual**:
  - Score de conformidade com gauge circular (verde/amarelo/vermelho)
  - Coberturas analisadas com badges de status
  - Gaps de cobertura com severidade
  - Comparação de preço
  - Recomendações numeradas
- **Chat Interativo**: Assistente IA especialista em seguros e convenções coletivas
- **Sessões**: Contexto mantido durante a conversa

## Tecnologia

### Frontend
- **HTML5** + **Tailwind CSS** (via CDN)
- **JavaScript Vanilla** com fetch API
- Sem dependências externas no frontend

### Backend
- **Node.js** + **Express.js**
- **OpenAI API** (GPT-4.1-mini)
- **Multer** para upload de arquivos
- **pdf-parse** para extração de texto de PDFs
- **CORS** para requisições cross-origin

## Instalação

### Pré-requisitos
- Node.js 16+ e npm
- Chave de API da OpenAI

### Setup Local

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/vizio-capital-landing-page.git
cd vizio-capital-landing-page
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave de API da OpenAI:
```
OPENAI_API_KEY=sk-...
PORT=8080
NODE_ENV=development
```

4. **Inicie o servidor**
```bash
npm start
```

Ou para desenvolvimento com auto-reload:
```bash
npm run dev
```

5. **Acesse a página**
Abra seu navegador em `http://localhost:8080`

## Estrutura do Projeto

```
vizio-capital-landing-page/
├── index.html              # Landing page completa com agente integrado
├── server.js               # Backend Node.js/Express
├── package.json            # Dependências do projeto
├── .env.example            # Exemplo de variáveis de ambiente
├── README.md               # Este arquivo
├── assets/
│   ├── sol-vizio.png       # Ícone do sol (logo processado)
│   ├── Vizio-Preto.png     # Logo com fundo preto
│   ├── Vizio-Transparente2.png  # Logo com fundo transparente
│   ├── Vizio-Branco.png    # Logo com fundo branco
│   └── Vizio-Logo-Correta.jpg   # Logo versão corrigida
├── uploads/                # Pasta para uploads de PDFs (criada automaticamente)
└── node_modules/           # Dependências instaladas
```

## API Endpoints

### POST /api/analyze
Analisa uma apólice de seguro enviada como PDF.

**Request:**
```bash
curl -X POST http://localhost:8080/api/analyze \
  -F "nome=João Silva" \
  -F "empresa=Empresa Teste" \
  -F "cnpj=12.345.678/0001-90" \
  -F "whatsapp=(11) 99999-9999" \
  -F "email=joao@teste.com" \
  -F "convencao=Sindicato dos Comerciários" \
  -F "apolice=@/caminho/para/apolice.pdf"
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123",
  "analysis": {
    "score": 20,
    "scoreLabel": "Crítico",
    "resumo": "...",
    "coberturas": [...],
    "gaps": [...],
    "precoAnalise": {...},
    "recomendacoes": [...],
    "riscos": [...]
  }
}
```

### POST /api/chat
Envia uma mensagem para o chat com o assistente IA.

**Request:**
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_1234567890_abc123",
    "message": "Quais coberturas são obrigatórias?"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "As coberturas obrigatórias conforme a convenção coletiva dos comerciários incluem..."
}
```

### GET /api/health
Verifica se o servidor está funcionando.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|------------|
| `OPENAI_API_KEY` | Chave de API da OpenAI | Sim |
| `PORT` | Porta do servidor (padrão: 8080) | Não |
| `NODE_ENV` | Ambiente (development/production) | Não |
| `OPENAI_API_BASE_URL` | URL base da API OpenAI (para APIs compatíveis) | Não |

## Deployment

### Heroku
```bash
heroku create vizio-capital-landing
git push heroku main
heroku config:set OPENAI_API_KEY=sk-...
```

### Vercel + Serverless
Para usar com Vercel, será necessário refatorar o backend para serverless functions.

### Docker
```bash
docker build -t vizio-capital .
docker run -p 8080:8080 -e OPENAI_API_KEY=sk-... vizio-capital
```

## Customização

### Alterar Cores
As cores da marca estão definidas no Tailwind CSS dentro do `index.html`:
- Fundo escuro: `#0d0d0d`, `#1a1a1a`
- Dourado: `#c5a55a`, `#b8944a`
- Branco: `#ffffff`

### Alterar Conteúdo
Todo o conteúdo da landing page está no `index.html`. Edite os textos, headlines e CTAs conforme necessário.

### Adicionar Novas Coberturas
No `server.js`, atualize a lista de coberturas no prompt de análise (procure por "COBERTURAS_OBRIGATORIAS").

## Troubleshooting

### "Cannot find module 'multer'"
```bash
npm install
```

### "OPENAI_API_KEY is not defined"
Certifique-se de que o arquivo `.env` está criado e contém a chave de API.

### PDF não está sendo processado
- Verifique se o PDF é um arquivo válido
- PDFs escaneados (imagens) podem não ter texto extraível
- Tente com um PDF pesquisável

### Chat não responde
- Verifique se a sessão foi criada corretamente após análise
- Confirme que a chave de API da OpenAI é válida

## Contribuindo

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## Contato

**Vizio Capital**
- Website: https://viziocapital.com.br
- WhatsApp: (11) 99999-9999
- Email: contato@viziocapital.com.br

---

**Desenvolvido com ❤️ para a Vizio Capital**
