import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

const MODEL = 'claude-sonnet-4-6'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error('Missing ANTHROPIC_API_KEY environment variable')
    }

    client = new Anthropic({ apiKey })
  }

  return client
}

export async function callAI(
  messages: MessageParam[],
  maxTokens: number = 4096
): Promise<string> {
  const anthropic = getClient()

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')

  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response received from AI')
  }

  return textBlock.text
}
