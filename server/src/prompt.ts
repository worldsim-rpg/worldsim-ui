/*
 * Prompt assembly for the spike server.
 *
 * The world dossier comes straight from the UI fixture
 * (../../src/fixture/world.ts) so the model and the panels share one
 * source of truth. The system prompt is static (cache-friendly); all
 * per-turn dynamics travel in the user message.
 */

import type { Character, Location } from '../../src/types/canon'
import type { TurnRequest, TurnRequestNpc } from '../../src/engine/claudeProtocol'
import {
  characters,
  locationExtras,
  locations,
  meta,
} from '../../src/fixture/world'

function describeNpc(c: Character): string {
  const lines = [
    `- ${c.name} (${c.role ?? 'без роли'})`,
    `  Черты на виду: ${c.public_traits.join(', ') || 'нет'}`,
  ]
  if (c.hidden_traits.length > 0) {
    lines.push(`  Скрытые черты (знание мастера): ${c.hidden_traits.join(', ')}`)
  }
  if (c.goals.length > 0) {
    lines.push(`  Цели: ${c.goals.map((g) => g.text).join('; ')}`)
  }
  if (c.knowledge.length > 0) {
    lines.push(`  Знает: ${c.knowledge.join('; ')}`)
  }
  return lines.join('\n')
}

function describeLocation(l: Location): string {
  const exits = locationExtras[l.id].exits
    .map((e) => `${e.direction} -> ${e.targetName}`)
    .join(', ')
  return [
    `- ${l.name}`,
    `  ${l.full_description ?? l.short_description}`,
    `  Выходы: ${exits || 'нет'}`,
  ].join('\n')
}

export function buildSystemPrompt(): string {
  const npcs = characters.filter((c) => !c.is_player)
  return `Ты — гейм-мастер текстовой RPG в мире «${meta.title}».

Мир: ${meta.genre}; тон: ${meta.tone.join(', ')}; темы: ${meta.themes.join(', ')}.
Завязка: ${meta.premise}

ЛОКАЦИИ
${locations.map(describeLocation).join('\n')}

ПЕРСОНАЖИ
${npcs.map(describeNpc).join('\n')}

ПРАВИЛА
1. Отвечай атмосферным нарративом от второго лица («ты»), 2-6 предложений.
2. Если в ходе указан адресат-NPC — ответь репликой этого NPC от первого
   лица, в его характере и манере речи; допустима короткая ремарка действия.
3. Если приложена сценарная реплика-канва — это фактическая основа: перескажи
   её живо и в характере, не противоречь её содержанию.
4. Не убивай и не калечь игрока. Не перемещай его между локациями без его
   явного действия. Не выдавай предметы, не меняй инвентарь и характеристики —
   механикой управляет игра, ты только описываешь.
5. Скрытые черты, цели и знания персонажей — твоё знание мастера: используй
   их для глубины и намёков, но не выкладывай прямо.
6. Никаких эмодзи. Никогда не выходи из роли, без мета-комментариев.
7. Отвечай только текстом нарратива или реплики — без заголовков, списков
   и пояснений.`
}

function npcLabel(n: TurnRequestNpc): string {
  return n.known ? `${n.name} (${n.role ?? 'без роли'})` : `незнакомец (${n.role ?? 'роль неясна'})`
}

export function buildUserMessage(req: TurnRequest): string {
  const ctx = req.context
  const lines = [
    '[Контекст хода]',
    `Локация: ${ctx.locationName}. ${ctx.locationDescription}`,
    `Время: ${ctx.dayLabel}, ${ctx.timeLabel}`,
    `Присутствуют: ${ctx.npcsHere.map(npcLabel).join('; ') || 'никого'}`,
    `Инвентарь игрока: ${ctx.inventory.join(', ') || 'пусто'}`,
    `Известные игроку факты: ${ctx.knownFacts.join('; ') || 'нет'}`,
    '',
  ]
  if (req.mode === 'dialogue' && req.npc) {
    lines.push(`[Игрок обращается к: ${npcLabel(req.npc)}]`)
    lines.push(`«${req.playerText}»`)
    if (req.scriptedReply) {
      lines.push('', `[Сценарная реплика-канва] ${req.scriptedReply}`)
    }
    lines.push('', `Ответь одной репликой этого NPC от первого лица.`)
  } else {
    lines.push('[Действие игрока]')
    lines.push(`«${req.playerText}»`)
    lines.push('', 'Ответь нарративом 2-6 предложений.')
  }
  return lines.join('\n')
}
