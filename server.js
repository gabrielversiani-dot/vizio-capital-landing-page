const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');

const app = express();
const PORT = 8080;

// OpenAI client
const openai = new OpenAI();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Multer config for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Store analysis sessions in memory
const sessions = new Map();

// System prompt for the insurance analysis AI
const SYSTEM_PROMPT = `Você é um especialista sênior em seguros de vida em grupo da Vizio Capital, uma corretora de seguros corporativos com mais de 12 anos de mercado, +70 mil vidas protegidas e parcerias com +20 seguradoras (MetLife, Prudential, Porto Seguro, MAG, Bradesco, SulAmérica, entre outras).

Sua função é analisar apólices de seguro de vida em grupo e verificar conformidade com convenções coletivas de trabalho.

BASE DE CONHECIMENTO:

COBERTURAS OBRIGATÓRIAS TÍPICAS EM CONVENÇÕES COLETIVAS:
- Morte Natural: Capital segurado mínimo de 12x o salário do funcionário (padrão mercado: R$20.000 a R$50.000)
- Morte Acidental: Capital segurado mínimo de 24x o salário (padrão: R$40.000 a R$100.000)
- Invalidez Permanente Total ou Parcial por Acidente (IPA): Mínimo de 12x o salário
- Invalidez Funcional Permanente Total por Doença (IFPD): Cobertura frequentemente exigida
- Auxílio Funeral: Individual e familiar (R$3.000 a R$10.000)
- Cesta Básica por Morte: 12 cestas básicas para dependentes
- Inclusão de Cônjuge/Filhos: Cobertura extensível a dependentes

SEGURADORAS PARCEIRAS E FAIXAS DE PREÇO:
- MetLife: R$8-25/vida/mês (referência mercado, coberturas amplas)
- Prudential: R$10-30/vida/mês (forte em morte e invalidez)
- Porto Seguro: R$7-22/vida/mês (bom custo-benefício)
- MAG Seguros: R$6-20/vida/mês (competitiva para PMEs)
- Bradesco Seguros: R$9-28/vida/mês (marca forte, rede ampla)
- SulAmérica: R$8-25/vida/mês (coberturas completas)
- Zurich: R$7-23/vida/mês (boa para grupos maiores)
- Tokio Marine: R$6-18/vida/mês (competitiva)

RISCOS DE NÃO CONFORMIDADE:
- Passivo trabalhista: indenizações podem chegar a centenas de milhares de reais por sinistro
- Multas sindicais: valor varia por convenção, geralmente 1 a 5 salários mínimos por funcionário
- Fiscalização do Ministério do Trabalho
- Ações coletivas movidas por sindicatos
- Responsabilidade subsidiária do empregador em caso de sinistro sem cobertura

CRITÉRIOS DE ANÁLISE DE CONFORMIDADE:
1. Coberturas presentes vs. exigidas pela convenção
2. Capitais segurados vs. mínimos exigidos
3. Abrangência (todos os funcionários cobertos?)
4. Carências aplicadas
5. Exclusões relevantes
6. Vigência e renovação
7. Custo por vida vs. mercado
8. Assistências adicionais (funeral, cesta básica)

Ao analisar uma apólice, forneça:
- Score de conformidade (0-100)
- Gaps de cobertura identificados
- Comparação de preço com mercado
- Recomendações específicas
- Nível de urgência para adequação

Sempre responda em português brasileiro, de forma profissional mas acessível.`;

// ==================== ENDPOINTS ====================

// POST /api/analyze - Analyze uploaded PDF policy
app.post('/api/analyze', (req, res) => {
  upload.single('apolice')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message || 'Erro no upload do arquivo' });
    }
  try {
    const { nome, empresa, cnpj, whatsapp, email, convencao } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
    }

    // Extract text from PDF
    const pdfParse = require('pdf-parse');
    const pdfBuffer = fs.readFileSync(req.file.path);
    let pdfText = '';

    try {
      const pdfData = await pdfParse(pdfBuffer);
      pdfText = pdfData.text;
    } catch (pdfErr) {
      pdfText = '[Não foi possível extrair texto do PDF. O documento pode ser uma imagem escaneada.]';
    }

    // Truncate if too long
    if (pdfText.length > 15000) {
      pdfText = pdfText.substring(0, 15000) + '\n[... texto truncado por limite ...]';
    }

    const analysisPrompt = `Analise a seguinte apólice de seguro de vida em grupo e forneça um relatório completo.

DADOS DA EMPRESA:
- Nome do contato: ${nome || 'Não informado'}
- Empresa: ${empresa || 'Não informada'}
- CNPJ: ${cnpj || 'Não informado'}
- Convenção Coletiva: ${convencao || 'Não informada'}

TEXTO DA APÓLICE:
${pdfText}

INSTRUÇÕES DE ANÁLISE:
Forneça sua análise no seguinte formato JSON (APENAS o JSON, sem texto adicional):

{
  "score": <número de 0 a 100 representando conformidade geral>,
  "scoreLabel": "<Crítico|Baixo|Moderado|Bom|Excelente>",
  "resumo": "<resumo executivo em 2-3 frases>",
  "coberturas": [
    {
      "nome": "<nome da cobertura>",
      "status": "<conforme|parcial|ausente>",
      "valorAtual": "<valor encontrado ou 'Não identificado'>",
      "valorRecomendado": "<valor recomendado>",
      "observacao": "<observação breve>"
    }
  ],
  "gaps": [
    {
      "titulo": "<título do gap>",
      "descricao": "<descrição do problema>",
      "severidade": "<alta|media|baixa>",
      "recomendacao": "<o que fazer>"
    }
  ],
  "precoAnalise": {
    "custoAtual": "<custo identificado por vida/mês ou 'Não identificado'>",
    "faixaMercado": "<faixa de preço do mercado>",
    "avaliacao": "<abaixo|dentro|acima do mercado>",
    "potencialEconomia": "<estimativa de economia se aplicável>"
  },
  "urgencia": "<critica|alta|media|baixa>",
  "recomendacoes": [
    "<recomendação 1>",
    "<recomendação 2>",
    "<recomendação 3>"
  ],
  "riscos": [
    {
      "tipo": "<tipo de risco>",
      "descricao": "<descrição>",
      "impactoFinanceiro": "<estimativa de impacto>"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    let analysisResult;
    const responseText = completion.choices[0].message.content.trim();

    try {
      // Try to parse JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseErr) {
      // If parsing fails, create a structured response from the text
      analysisResult = {
        score: 50,
        scoreLabel: 'Moderado',
        resumo: responseText.substring(0, 300),
        coberturas: [],
        gaps: [{ titulo: 'Análise em texto', descricao: responseText.substring(0, 500), severidade: 'media', recomendacao: 'Consulte um especialista Vizio Capital' }],
        precoAnalise: { custoAtual: 'Não identificado', faixaMercado: 'R$6-30/vida/mês', avaliacao: 'dentro', potencialEconomia: 'A definir' },
        urgencia: 'media',
        recomendacoes: ['Solicite uma análise detalhada com um consultor Vizio Capital'],
        riscos: []
      };
    }

    // Create session for chat follow-up
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessions.set(sessionId, {
      empresa: { nome, empresa, cnpj, whatsapp, email, convencao },
      pdfText,
      analysis: analysisResult,
      chatHistory: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: analysisPrompt },
        { role: 'assistant', content: JSON.stringify(analysisResult) }
      ]
    });

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.json({
      success: true,
      sessionId,
      analysis: analysisResult
    });

  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Erro ao analisar apólice. Tente novamente.' });
  }
  }); // close multer callback
});

// POST /api/chat - Chat with the AI specialist
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(400).json({ error: 'Sessão não encontrada. Faça uma nova análise.' });
    }

    const session = sessions.get(sessionId);
    session.chatHistory.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: session.chatHistory,
      temperature: 0.5,
      max_tokens: 2000
    });

    const reply = completion.choices[0].message.content;
    session.chatHistory.push({ role: 'assistant', content: reply });

    // Keep chat history manageable
    if (session.chatHistory.length > 20) {
      session.chatHistory = [
        session.chatHistory[0], // system
        session.chatHistory[1], // initial analysis prompt
        session.chatHistory[2], // initial analysis response
        ...session.chatHistory.slice(-10) // last 10 messages
      ];
    }

    res.json({ success: true, reply });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Erro no chat. Tente novamente.' });
  }
});

// ==================== RD STATION CRM INTEGRATION ====================
const RD_CRM_TOKEN = process.env.RD_CRM_TOKEN || '';
const RD_CRM_BASE = 'https://crm.rdstation.com/api/v1';
const RD_PIPELINE_VG = '69a228a9a1145b001541d220'; // Vida em Grupo PME
const RD_STAGE_LEAD = '69a228a9a1145b001541d222'; // Lead Recebido

async function createRDContact(data) {
  const https = require('https');
  const payload = JSON.stringify({
    contact: {
      name: data.nome || '',
      title: data.cargo || '',
      phones: [{ phone: data.whatsapp || '', type: 'cellphone' }],
      emails: [{ email: data.email || '' }],
      legal_bases: [{ category: 'communications', type: 'consent', status: 'given' }]
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'crm.rdstation.com',
      path: `/api/v1/contacts?token=${RD_CRM_TOKEN}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { resolve({ error: body }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function createRDDeal(contactId, data) {
  const https = require('https');
  const dealName = `[LP Tráfego] ${data.empresa || 'Lead'} - ${data.nome || 'Sem nome'}`;
  const payload = JSON.stringify({
    deal: {
      name: dealName,
      deal_pipeline_id: RD_PIPELINE_VG,
      deal_stage_id: RD_STAGE_LEAD,
      rating: 1,
      contacts_ids: [contactId],
      deal_custom_fields: [],
      notes: `Lead capturado via Landing Page Tráfego Pago\n` +
             `Empresa: ${data.empresa || 'N/I'}\n` +
             `Cargo: ${data.cargo || 'N/I'}\n` +
             `Funcionários: ${data.funcionarios || 'N/I'}\n` +
             `Estado: ${data.estado || 'N/I'}\n` +
             `WhatsApp: ${data.whatsapp || 'N/I'}\n` +
             `Email: ${data.email || 'N/I'}\n` +
             `CNPJ: ${data.cnpj || 'N/I'}\n` +
             `Convenção Coletiva: ${data.convencao || 'N/I'}\n` +
             `Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'crm.rdstation.com',
      path: `/api/v1/deals?token=${RD_CRM_TOKEN}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { resolve({ error: body }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// POST /api/lead - Capture lead from main form and create in RD CRM
app.post('/api/lead', async (req, res) => {
  try {
    const { nome, empresa, cargo, funcionarios, estado, whatsapp } = req.body;

    if (!nome || !empresa || !whatsapp) {
      return res.status(400).json({ error: 'Nome, empresa e WhatsApp são obrigatórios.' });
    }

    let contactId = null;
    let dealId = null;

    if (RD_CRM_TOKEN) {
      // Create contact in RD CRM
      const contact = await createRDContact({ nome, empresa, cargo, whatsapp });
      contactId = contact._id || contact.id || null;

      // Create deal in pipeline Vida em Grupo PME
      if (contactId) {
        const deal = await createRDDeal(contactId, { nome, empresa, cargo, funcionarios, estado, whatsapp });
        dealId = deal._id || deal.id || null;
      }
    }

    console.log(`[LEAD] ${nome} | ${empresa} | ${whatsapp} | CRM Contact: ${contactId} | Deal: ${dealId}`);

    res.json({
      success: true,
      message: 'Lead capturado com sucesso!',
      contactId,
      dealId
    });

  } catch (err) {
    console.error('Lead capture error:', err);
    res.status(500).json({ error: 'Erro ao processar. Tente novamente.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vizio Capital server running on port ${PORT}`);
});
