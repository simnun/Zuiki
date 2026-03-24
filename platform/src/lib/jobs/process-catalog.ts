import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/db'
import { callAI } from '@/lib/ai/client'
import { getSignedUrl } from '@/lib/storage'
import { mNm, mDs, mTags, mTagsLoveskin } from '@/lib/utils'
import { mPr, mPrLong, genMetaTitle, genMetaDescPrompt, genMetaKeys, genAltImgPrompt } from '@/lib/ai-prompts'
import type { SessionConfig, ModellaInfo, ExcelInfo, CatalogItem as ClientCatalogItem } from '@/lib/catalog-types'
import sharp from 'sharp'

const BUCKET = 'catalog-photos'
const MAX_IMG_DIM = 1568

async function photoToBase64(storageKey: string): Promise<{ base64: string; mimeType: string }> {
  const url = await getSignedUrl(BUCKET, storageKey, 600)
  const resp = await fetch(url)
  const rawBuf = Buffer.from(await resp.arrayBuffer())
  const compressed = await sharp(rawBuf)
    .resize(MAX_IMG_DIM, MAX_IMG_DIM, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer()
  return { base64: compressed.toString('base64'), mimeType: 'image/jpeg' }
}

async function cAI(content: any[], retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await callAI([{ role: 'user', content }], 4096)
    } catch (e: any) {
      if (i === retries) throw e
      await new Promise(r => setTimeout(r, 2000 * (i + 1)))
    }
  }
  throw new Error('AI call failed after retries')
}

// ── Process entire session ──
export const processSession = inngest.createFunction(
  {
    id: 'process-session',
    name: 'Process Shooting Session',
    concurrency: { limit: 2 },
    retries: 1,
    triggers: [{ event: 'catalog/session.process' }],
  },
  async ({ event, step }) => {
    const { sessionId } = event.data

    const session = await step.run('load-session', async () => {
      return prisma.shootingSession.findUnique({
        where: { id: sessionId },
        include: {
          company: true,
          catalogItems: {
            where: { status: 'processing' },
            include: { photos: { orderBy: { sortOrder: 'asc' } } },
          },
          sessionModels: { include: { model: { include: { facePhotos: true } } } },
          excelFiles: { include: { skuData: true } },
        },
      })
    })

    if (!session) throw new Error(`Session ${sessionId} not found`)

    const items = session.catalogItems
    if (!items.length) {
      await step.run('mark-complete-empty', () =>
        prisma.shootingSession.update({ where: { id: sessionId }, data: { status: 'completed', completedAt: new Date() } })
      )
      return { processed: 0 }
    }

    const cfg: SessionConfig = {
      br: session.brand || 'zuiki',
      st: session.season || '',
      an: session.year || '',
      ds: session.shootingDate ? new Date(session.shootingDate).toISOString().split('T')[0] : '',
      selMods: session.sessionModels.map(sm => sm.model.name),
      noModel: session.shootType === 'still',
      shootType: session.shootType,
      mannequin: { taglia: '', petto: '', vita: '', fianchi: '' },
    }

    const models: ModellaInfo[] = session.sessionModels.map(sm => ({
      nome: sm.model.name,
      altezza: sm.model.heightCm?.toString() || '',
      tagliaSopra: sm.model.sizeTop || '',
      tagliaSotto: sm.model.sizeBottom || '',
    }))

    const modelFaces: Record<string, Array<{ base64: string; mimeType: string }>> = {}
    for (const sm of session.sessionModels) {
      if (sm.model.facePhotos.length) {
        modelFaces[sm.model.name] = []
        for (const fp of sm.model.facePhotos) {
          try {
            const photo = await photoToBase64(fp.photoUrl)
            modelFaces[sm.model.name].push(photo)
          } catch { /* skip */ }
        }
      }
    }

    const excelLookup: Record<string, ExcelInfo> = {}
    for (const ef of session.excelFiles) {
      for (const row of ef.skuData) {
        excelLookup[row.sku.toUpperCase()] = {
          row: row.rowIndex, codice: row.sku,
          colori: row.colors || '', anno: row.year || '',
          stagione: row.season || '', tipoArticolo: row.articleType || '',
          brand: row.brand || '', caratteristica: row.characteristic || '',
          composizione: row.composition || '',
        }
      }
    }

    let processed = 0
    let failed = 0

    for (const item of items) {
      await step.run(`process-item-${item.id}`, async () => {
        const t0 = Date.now()
        try {
          const photos = item.photos
          if (!photos.length) throw new Error('No photos for item')

          const sku = item.sku.toUpperCase()
          const exInfo = excelLookup[sku] || null
          const tipo = item.productType || ''

          const c: any[] = []
          const modelNames: string[] = []

          for (const [name, faces] of Object.entries(modelFaces)) {
            if (cfg.selMods.includes(name) && faces.length) {
              modelNames.push(name)
              c.push({ type: 'text', text: `[FOTO RIFERIMENTO VOLTO: ${name}]` })
              for (const f of faces) {
                c.push({ type: 'image', source: { type: 'base64', media_type: f.mimeType, data: f.base64 } })
              }
            }
          }
          if (modelNames.length) {
            c.push({ type: 'text', text: '--- FINE FOTO RIFERIMENTO VOLTI. Le foto seguenti sono del PRODOTTO da catalogare ---' })
          }

          for (const photo of photos) {
            const { base64, mimeType } = await photoToBase64(photo.storageKey)
            c.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } })
          }
          c.push({ type: 'text', text: mPr(cfg.br, tipo, photos.length, modelNames, exInfo) })

          const rawAI = await cAI(c)
          let ai: any
          try {
            ai = JSON.parse(rawAI.replace(/```json|```/g, '').trim())
          } catch {
            throw new Error(`AI JSON parse error: ${rawAI.slice(0, 150)}...`)
          }

          const nm = mNm(tipo, ai)
          const cl = ai.colore_madre || ''

          let recognizedModel: string | null = null
          if (ai.modella_riconosciuta) {
            const found = models.find(m => m.nome.toLowerCase() === ai.modella_riconosciuta.toLowerCase())
            if (found) recognizedModel = found.nome
          }

          const tg = cfg.br === 'zuiki'
            ? mTags({ ds: cfg.ds, cat: ai.categoria_seo || '', sub: ai.sottocategoria_seo || '', nm, lic: ai.licenza && ai.licenza !== 'null' ? ai.licenza : null, tipo }, cfg)
            : mTagsLoveskin({ tipo, sfx: item.suffix || '', lic: ai.licenza && ai.licenza !== 'null' ? ai.licenza : null, vestibilita: ai.vestibilita || null, sporty: !!ai.is_sporty }, cfg)

          const ds = mDs(ai, item.composition || '', tipo, recognizedModel, cfg, models)

          let dl = ''
          try {
            const promptLong = mPrLong(cfg.br, tipo, nm, ds, cl, ai.licenza || null, item.composition || '', exInfo)
            dl = await cAI([{ type: 'text', text: promptLong }])
          } catch (e: any) {
            dl = `[Errore: ${e.message}]`
          }

          const fakeItem = { nm, tp: tipo, sku: item.sku, tg, ai, cl, excelInfo: exInfo, cp: item.composition || '' } as unknown as ClientCatalogItem
          const metaTitle = genMetaTitle(fakeItem, cfg)

          let metaDesc = ''
          try {
            const promptMD = genMetaDescPrompt(fakeItem, cfg)
            metaDesc = await cAI([{ type: 'text', text: promptMD }])
          } catch {
            metaDesc = `${nm} | ${cfg.br === 'zuiki' ? 'Zuiki' : 'Loveskin'}`
          }

          const metaKeys = genMetaKeys(fakeItem, cfg)

          let altImg = ''
          try {
            const firstPhoto = await photoToBase64(photos[0].storageKey)
            altImg = await cAI([
              { type: 'image', source: { type: 'base64', media_type: firstPhoto.mimeType, data: firstPhoto.base64 } },
              { type: 'text', text: genAltImgPrompt(fakeItem) },
            ])
          } catch {
            altImg = `${nm} - ${cl}`
          }

          await prisma.catalogItem.update({
            where: { id: item.id },
            data: {
              status: 'done',
              productName: nm, color: cl, shortDesc: ds, longDesc: dl,
              seoTags: tg, metaTitle, metaDesc, metaKeywords: metaKeys,
              altImage: altImg, aiResponse: ai, recognizedModel,
              license: ai.licenza && ai.licenza !== 'null' ? ai.licenza : null,
              processingTimeMs: Date.now() - t0,
            },
          })
          processed++
        } catch (e: any) {
          console.error(`[INNGEST] Item ${item.sku} failed:`, e.message)
          await prisma.catalogItem.update({
            where: { id: item.id },
            data: { status: 'error', errorMessage: e.message },
          })
          failed++
        }
      })

      await step.run(`update-counters-${item.id}`, () =>
        prisma.shootingSession.update({
          where: { id: sessionId },
          data: { processedItems: { increment: 1 } },
        })
      )
    }

    await step.run('finalize-session', async () => {
      await prisma.shootingSession.update({
        where: { id: sessionId },
        data: {
          status: (failed === items.length ? 'failed' : 'completed') as any,
          completedAt: new Date(),
          failedItems: failed,
        },
      })
    })

    return { processed, failed, total: items.length }
  }
)

// ── Reprocess single item ──
export const reprocessItem = inngest.createFunction(
  {
    id: 'reprocess-item',
    name: 'Reprocess Catalog Item',
    retries: 2,
    triggers: [{ event: 'catalog/item.reprocess' }],
  },
  async ({ event, step }) => {
    const { sessionId, itemId } = event.data

    await step.run('mark-item', async () => {
      await prisma.catalogItem.update({
        where: { id: itemId },
        data: { status: 'processing', errorMessage: null },
      })
    })

    await step.sendEvent('trigger-reprocess', {
      name: 'catalog/session.process',
      data: { sessionId },
    })

    return { requeued: itemId }
  }
)
