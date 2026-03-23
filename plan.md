# Piano: Selezione AI Provider Multi-Modello

## Panoramica
Aggiungere la possibilità per l'utente di scegliere tra 4 provider AI al momento della creazione sessione, con costi visualizzati e API key separate per provider.

## Provider Supportati

| ID | Label | Modello | SDK | Costo stimato/sessione |
|----|-------|---------|-----|----------------------|
| `claude-sonnet` | Claude Sonnet 4 (Premium) | `claude-sonnet-4-20250514` | `@anthropic-ai/sdk` (già presente) | ~€0.15/articolo |
| `gpt-4o` | GPT-4o (Premium) | `gpt-4o` | `openai` (da aggiungere) | ~€0.12/articolo |
| `gemini-flash` | Gemini 2.0 Flash (Economico) | `gemini-2.0-flash` | `@google/generative-ai` (da aggiungere) | ~€0.02/articolo |
| `claude-haiku` | Claude 3.5 Haiku (Budget) | `claude-3-5-haiku-20241022` | `@anthropic-ai/sdk` (già presente) | ~€0.04/articolo |

## Modifiche da Implementare

### 1. Database (Prisma Schema)

**File: `prisma/schema.prisma`**

- Aggiungere enum `AiProvider` con valori: `claude_sonnet`, `gpt_4o`, `gemini_flash`, `claude_haiku`
- Aggiungere campo `aiProvider AiProvider @default(claude_sonnet)` a `ShootingSession`
- Aggiungere campi API key a `Company`:
  - `openaiApiKey String?` (per GPT-4o)
  - `googleApiKey String?` (per Gemini)
  - Il campo `apiKey` esistente resta per Anthropic (Claude Sonnet + Haiku)

### 2. AI Client Abstraction

**File: `src/lib/ai/client.ts`** (refactor completo)

- Creare interfaccia `AiClient` con metodo `callAI(messages, maxTokens) → string`
- Creare factory `getAiClient(provider, apiKey) → AiClient`
- Implementare 3 adapter:
  - `AnthropicAdapter` (per claude-sonnet e claude-haiku)
  - `OpenAIAdapter` (per gpt-4o)
  - `GeminiAdapter` (per gemini-flash)
- Ogni adapter traduce il formato messaggi Anthropic → formato nativo del provider
- La traduzione è necessaria perché i prompt usano il formato `MessageParam` di Anthropic con blocchi `image` tipo `base64`

### 3. Nuovi Package NPM

```bash
npm install openai @google/generative-ai
```

### 4. API Key Management UI

**File: `src/components/StepApiKey.tsx`** (estendere)

- Mostrare 3 campi API key (raggruppati):
  - Anthropic API Key (per Claude Sonnet 4 + Haiku)
  - OpenAI API Key (per GPT-4o)
  - Google AI API Key (per Gemini Flash)
- Ogni campo mostra quali modelli abilita
- Salvare tutte le key in un'unica chiamata API

### 5. API Route API Keys

**File: `src/app/api/company/apikey/route.ts`** (estendere)

- GET: restituire tutte e 3 le key (mascheate)
- PUT: accettare oggetto `{ apiKey, openaiApiKey, googleApiKey }`

### 6. Selettore Provider nella Creazione Sessione

**File: `src/components/StepSetup.tsx`** (estendere)

- Aggiungere dropdown/card selector prima dei campi esistenti
- Mostrare per ogni provider:
  - Nome e badge (Premium/Economico/Budget)
  - Costo stimato per articolo
  - Stato: "Configurato ✓" o "API Key mancante"
- Disabilitare provider senza API key configurata
- Default: Claude Sonnet 4 (provider attuale)

### 7. Passaggio Provider nella Pipeline

**File: `src/app/api/sessions/route.ts`** - accettare `aiProvider` nella creazione sessione
**File: `src/app/api/sessions/[id]/process/route.ts`** - leggere provider dalla sessione
**File: `src/lib/jobs/process-catalog.ts`** - usare il provider corretto per le chiamate AI
**File: `src/lib/catalog-processor.ts`** - passare provider nell'API di processing
**File: `src/lib/store.tsx`** - aggiungere `aiProvider` allo state

### 8. Traduzione Formato Messaggi

Il punto critico è la traduzione dei messaggi multimodali tra formati diversi:

**Anthropic format** (attuale):
```json
{ "role": "user", "content": [
  { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "..." }},
  { "type": "text", "text": "Analizza..." }
]}
```

**OpenAI format**:
```json
{ "role": "user", "content": [
  { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." }},
  { "type": "text", "text": "Analizza..." }
]}
```

**Google Gemini format**:
```json
{ "role": "user", "parts": [
  { "inlineData": { "mimeType": "image/jpeg", "data": "..." }},
  { "text": "Analizza..." }
]}
```

### 9. Migrazione Database

```bash
npx prisma migrate dev --name add-ai-provider
```

## Ordine di Implementazione

1. Schema Prisma + migrazione
2. Package NPM (openai, @google/generative-ai)
3. AI client abstraction con adapter
4. API route apikey (estensione multi-key)
5. StepApiKey UI (multi-key)
6. API route sessions (campo aiProvider)
7. StepSetup UI (selettore provider)
8. Store (stato aiProvider)
9. Pipeline processing (passaggio provider)
10. Test end-to-end

## Note Architetturali

- I prompt restano identici per tutti i provider (sono prompt di testo + immagini)
- La qualità dell'output varierà tra provider — gli utenti lo vedranno e sceglieranno
- Se un provider fallisce, NON fare fallback automatico (l'utente ha scelto e paga)
- Le API key Google/OpenAI sono opzionali — si abilitano solo i provider configurati
