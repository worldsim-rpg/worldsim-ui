/*
 * Fixture mini-world "Соляные Берега" (Salt Shores) for the Phase 1 prototype.
 *
 * Entities are shaped exactly like the canon models (src/types/canon.ts),
 * plus fixture-only extras (glyphs, canned dialogue, arrival links) that in
 * Phase 2 will come from the orchestrator agents instead.
 *
 * 3 locations: tavern "Старый якорь" <-> coast road <-> old saltworks.
 * 6 NPCs, two of them strangers (relation meter shows "?").
 */

import type {
  Character,
  GameSettings,
  Location,
  PlayerProgression,
  WorldMeta,
} from '../types/canon'
import type {
  ActionChip,
  CheckResult,
  ExitChip,
  GlyphKey,
  NoticedItem,
} from '../types/ui'

/** Fixture chips omit `available`: the engine computes availability. */
export type FixtureChip = Omit<ActionChip, 'available'>

// --- world meta and settings ------------------------------------------------

export const meta: WorldMeta = {
  id: 'w-salt-shores',
  title: 'Соляные Берега',
  genre: 'низкое фэнтези',
  tone: ['приморский туман', 'тихая тревога'],
  themes: ['контрабанда', 'маленькие тайны'],
  premise: 'Посёлок у серого моря живёт солью и молчанием.',
  tick: 10, // -> "День 3, Вечер" (4 time-of-day parts per day)
  player_character_id: 'pc',
  schema_version: '0.1.0',
}

export const settings: GameSettings = {
  language: 'ru',
  difficulty: 'normal',
  generation_depth: 'compact',
  model_default: 'claude-sonnet-4-6',
  model_heavy: 'claude-sonnet-4-6',
  turn_tempo: 'scene',
}

export const DIFFICULTY_LABELS: Record<GameSettings['difficulty'], string> = {
  casual: 'лёгкая',
  normal: 'обычная',
  hardcore: 'суровая',
}

export const TIME_PARTS = ['Утро', 'День', 'Вечер', 'Ночь'] as const

// --- locations ----------------------------------------------------------------

export const locations: Location[] = [
  {
    id: 'loc-tavern',
    name: 'Таверна «Старый якорь»',
    short_description: 'Тёплый свет, эль и дым под низкими балками.',
    full_description:
      'Пахнет элем и дымом, у очага дрожит тёплый свет. За дальним столом сгорбились двое; ' +
      'бармен со шрамом неспешно протирает кружку и косится на дверь.',
    tags: ['tavern', 'indoor', 'social'],
    connected_to: ['loc-road'],
    parent_region_id: 'reg-salt-shores',
    active_elements: ['пустая бутылка', 'оброненная монета'],
    discovered: true,
    visited: true,
  },
  {
    id: 'loc-road',
    name: 'Прибрежная дорога',
    short_description: 'Разбитая колея вдоль серого моря.',
    full_description:
      'Колея тянется вдоль дюн, между камней свистит ветер. Слева шумит серое море, ' +
      'справа на холме чернеют крыши посёлка. У обочины стоит крытая повозка, ' +
      'лошадь жуёт что-то сухое.',
    tags: ['road', 'outdoor'],
    connected_to: ['loc-tavern', 'loc-saltworks'],
    parent_region_id: 'reg-salt-shores',
    active_elements: ['обрывок верёвки', 'свежие следы подков'],
    discovered: true,
    visited: false,
  },
  {
    id: 'loc-saltworks',
    name: 'Старая солеварня',
    short_description: 'Покосившиеся навесы и чаны с рассолом.',
    full_description:
      'Под длинным навесом дымятся плоские чаны, воздух густой от пара и соли. ' +
      'Кучи белых кристаллов сложены пирамидами. Старик в прожжённом фартуке ' +
      'мешает рассол длинной лопаткой.',
    tags: ['workshop', 'outdoor'],
    connected_to: ['loc-road'],
    parent_region_id: 'reg-salt-shores',
    active_elements: ['треснувший чан', 'мешки с портовым клеймом'],
    discovered: true,
    visited: false,
  },
]

// --- characters -----------------------------------------------------------------

export const characters: Character[] = [
  {
    id: 'pc',
    name: 'Ты',
    is_player: true,
    role: null,
    faction_id: null,
    public_traits: [],
    hidden_traits: [],
    goals: [],
    knowledge: [],
    attitude_to_player: 0,
    location_id: 'loc-tavern',
    condition: 'ok',
    alive: true,
  },
  {
    id: 'npc-halt',
    name: 'Бармен Хальт',
    is_player: false,
    role: 'хозяин таверны',
    faction_id: null,
    public_traits: ['невозмутимый', 'со шрамом'],
    hidden_traits: ['знает больше, чем говорит'],
    goals: [{ text: 'чтобы в подвал никто не совался', priority: 0.8 }],
    knowledge: ['в подвале чужие бочки', 'клеймо на мешках — портовое'],
    attitude_to_player: 0.4,
    location_id: 'loc-tavern',
    condition: 'ok',
    alive: true,
  },
  {
    id: 'npc-sailor',
    name: 'Пьяный матрос',
    is_player: false,
    role: 'из порта',
    faction_id: null,
    public_traits: ['шумный', 'нетрезвый'],
    hidden_traits: ['видел лодки без огней'],
    goals: [{ text: 'выпить ещё', priority: 0.9 }],
    knowledge: ['ночной прилив — это лодки без огней'],
    attitude_to_player: 0.1,
    location_id: 'loc-tavern',
    condition: 'tired',
    alive: true,
  },
  {
    id: 'npc-hooded',
    name: 'Человек в капюшоне',
    is_player: false,
    role: 'незнакомец у стойки',
    faction_id: null,
    public_traits: ['молчаливый'],
    hidden_traits: ['ждёт связного'],
    goals: [{ text: 'не быть узнанным', priority: 1 }],
    knowledge: ['встреча у солеварни после заката'],
    attitude_to_player: 0,
    location_id: 'loc-tavern',
    condition: 'ok',
    alive: true,
  },
  {
    id: 'npc-mara',
    name: 'Возчица Мара',
    is_player: false,
    role: 'возчица',
    faction_id: null,
    public_traits: ['деловитая', 'обветренная'],
    hidden_traits: [],
    goals: [{ text: 'довезти груз до тракта', priority: 0.7 }],
    knowledge: ['соль возят ночами на тракт'],
    attitude_to_player: 0.3,
    location_id: 'loc-road',
    condition: 'ok',
    alive: true,
  },
  {
    id: 'npc-unna',
    name: 'Рыбачка Унна',
    is_player: false,
    role: 'рыбачка',
    faction_id: null,
    public_traits: ['неразговорчивая'],
    hidden_traits: ['видела огни в море'],
    goals: [{ text: 'починить сеть до отлива', priority: 0.6 }],
    knowledge: ['огни в море за полночь — не маяк'],
    attitude_to_player: 0.05,
    location_id: 'loc-road',
    condition: 'ok',
    alive: true,
  },
  {
    id: 'npc-kosma',
    name: 'Солевар Косма',
    is_player: false,
    role: 'солевар',
    faction_id: null,
    public_traits: ['старый', 'упрямый'],
    hidden_traits: ['ставит чужое клеймо за серебро'],
    goals: [{ text: 'чтобы не лезли в его дела', priority: 0.8 }],
    knowledge: ['заказчик платит за молчание'],
    attitude_to_player: 0.35,
    location_id: 'loc-saltworks',
    condition: 'ok',
    alive: true,
  },
]

export const progression: PlayerProgression = {
  character_id: 'pc',
  attributes: { perception: 1, empathy: 1, lore: 1, athletics: 1, subterfuge: 1 },
  skill_counters: {},
  reputation: {},
  known_facts: ['хозяин таверны что-то скрывает о подвале'],
  inventory: ['потрёпанный рюкзак', '3 монеты'],
  flags: [],
  condition: 'ok',
}

// --- fixture-only extras ---------------------------------------------------------

/** Glyph + epistemic annotation per character (Phase 2: decided by orchestrator). */
export const npcExtras: Record<string, { glyph: GlyphKey; known: boolean }> = {
  'npc-halt': { glyph: 'mug', known: true },
  'npc-sailor': { glyph: 'anchor', known: true },
  'npc-hooded': { glyph: 'hood', known: false },
  'npc-mara': { glyph: 'wheel', known: true },
  'npc-unna': { glyph: 'fish', known: true },
  'npc-kosma': { glyph: 'salt', known: true },
}

export interface FixtureAction {
  id: string
  /** Lowercase substrings; input matching any of them triggers the action. */
  match: string[]
  narrative: string
  /** Optional effects on the world state. */
  addToInventory?: string
  removeNoticedLabel?: string
  /** One-time actions become unavailable (dimmed chips) after use. */
  oneTime?: boolean
  addFact?: string
  /** Deterministic skill check shown as a plate above the narrative (round 8). */
  check?: CheckResult
}

export interface FixtureLocationExtras {
  glyph: GlyphKey
  /** Linking phrase by origin location id; '*' is the game-start fallback. */
  arrivalLinks: Record<string, string>
  lookText: string
  exits: Array<ExitChip & { keywords: string[] }>
  /** Contextual chips (base "осмотреться"/"инвентарь" are added by the engine). */
  chips: FixtureChip[]
  actions: FixtureAction[]
  noticed: NoticedItem[]
}

export const locationExtras: Record<string, FixtureLocationExtras> = {
  'loc-tavern': {
    glyph: 'house',
    arrivalLinks: {
      '*': 'Ты толкаешь тяжёлую дверь. ',
      'loc-road': 'Ты толкаешь тяжёлую дверь, и вой ветра обрывается за спиной. ',
    },
    lookText:
      'Низкие балки засалены копотью. Под стойкой — ряд глиняных кружек, на полке за спиной ' +
      'бармена пылится бутыль без этикетки. Двое за дальним столом замолкают, когда ты ' +
      'смотришь в их сторону. У люка за стойкой — свежие царапины на полу.',
    exits: [
      { toLocationId: 'loc-road', direction: 'север', targetName: 'дорога', keywords: ['дорог', 'наружу', 'улиц'] },
    ],
    chips: [
      { id: 'chip-take-bottle', label: 'взять бутылку', kind: 'atomic', command: 'взять бутылку' },
      { id: 'chip-listen', label: 'прислушаться', kind: 'atomic', command: 'прислушаться' },
      {
        id: 'chip-take-coin',
        label: 'взять монету',
        kind: 'atomic',
        command: 'взять монету',
        risky: true,
      },
      { id: 'chip-ask-about', label: 'Спросить о…', kind: 'template', command: 'Спросить о ' },
    ],
    actions: [
      {
        id: 'chip-take-bottle',
        match: ['взять бутылк', 'подобрать бутылк'],
        narrative:
          'Бутылка пахнет не элем — чем-то горьким, аптечным. Ты убираешь её в рюкзак; ' +
          'Хальт делает вид, что не заметил.',
        addToInventory: 'пустая бутылка',
        removeNoticedLabel: 'пустая бутылка',
        oneTime: true,
      },
      {
        id: 'chip-listen',
        match: ['прислуш'],
        narrative:
          'Двое за дальним столом шепчутся. Долетают обрывки: «...не в этот прилив... бочки уже ' +
          'в подвале...» Заметив твой взгляд, они умолкают и утыкаются в кружки.',
        addFact: 'бочки уже в подвале таверны',
        check: { skill: 'Внимание', success: true },
      },
      {
        id: 'chip-take-coin',
        match: ['взять монет', 'подобрать монет'],
        narrative:
          'Ты накрываешь монету ладонью и, дождавшись, пока Хальт отвернётся, сгребаешь к себе. ' +
          'Медь истёрта до гладкости; на ребре — насечка в виде якоря.',
        addToInventory: 'медная монета с насечкой',
        removeNoticedLabel: 'оброненная монета',
        oneTime: true,
        check: { skill: 'Скрытность', success: true },
      },
    ],
    noticed: [
      { id: 'item-bottle', label: 'пустая бутылка' },
      { id: 'item-coin', label: 'оброненная монета' },
    ],
  },

  'loc-road': {
    glyph: 'road',
    arrivalLinks: {
      '*': 'Ты выходишь на колею. ',
      'loc-tavern': 'Ты выходишь наружу — солёный ветер сразу бьёт в лицо. ',
      'loc-saltworks': 'Ты возвращаешься на колею; под сапогами хрустит соляная корка. ',
    },
    lookText:
      'Колея изрыта старыми следами колёс. На обочине — столб с выцветшими указателями: ' +
      'на юг — «Старый якорь», на запад — солеварня. В дюнах что-то поблёскивает, ' +
      'но с дороги не разобрать.',
    exits: [
      { toLocationId: 'loc-tavern', direction: 'юг', targetName: 'таверна', keywords: ['таверн', 'якор'] },
      { toLocationId: 'loc-saltworks', direction: 'запад', targetName: 'солеварня', keywords: ['солеварн', 'навес'] },
    ],
    chips: [
      { id: 'chip-tracks', label: 'осмотреть следы', kind: 'atomic', command: 'осмотреть следы' },
      { id: 'chip-dunes', label: 'поискать в дюнах', kind: 'atomic', command: 'поискать в дюнах' },
      { id: 'chip-hail', label: 'Окликнуть…', kind: 'template', command: 'Окликнуть ' },
    ],
    actions: [
      {
        id: 'chip-tracks',
        match: ['осмотреть след', 'следы подков', 'изучить след'],
        narrative:
          'Подковы кованые, тяжёлые — не местная кляча. Следы сворачивают с колеи в сторону ' +
          'солеварни и теряются в песке.',
        addFact: 'тяжёлые подковы ведут к солеварне',
      },
      {
        id: 'chip-dunes',
        match: ['поискать в дюнах', 'искать в дюнах', 'дюн'],
        narrative:
          'Ты разгребаешь песок. Под ним — гладкий стеклянный шарик с пузырьком воздуха внутри. ' +
          'Такие вешают на сети, но этот зелёный, чужой.',
        addToInventory: 'зелёный стеклянный шарик',
        oneTime: true,
        check: { skill: 'Внимание', success: true },
      },
    ],
    noticed: [
      { id: 'item-rope', label: 'обрывок верёвки' },
      { id: 'item-tracks', label: 'свежие следы подков' },
    ],
  },

  'loc-saltworks': {
    glyph: 'salt',
    arrivalLinks: {
      '*': 'Ты подходишь к навесам. ',
      'loc-road': 'Ты сворачиваешь с колеи к навесам; запах рассола густеет с каждым шагом. ',
    },
    lookText:
      'Один из чанов давно остыл — по дну трещина, рассол ушёл. Под навесом аккуратные мешки, ' +
      'на каждом клеймо в виде якоря. Странно: клеймо портовое, а солеварня сама по себе.',
    exits: [
      { toLocationId: 'loc-road', direction: 'восток', targetName: 'дорога', keywords: ['дорог', 'колея', 'колею'] },
    ],
    chips: [
      { id: 'chip-take-salt', label: 'взять горсть соли', kind: 'atomic', command: 'взять горсть соли' },
      {
        id: 'chip-vat',
        label: 'заглянуть в чан',
        kind: 'atomic',
        command: 'заглянуть в чан',
        risky: true,
      },
      { id: 'chip-ask-about-2', label: 'Спросить о…', kind: 'template', command: 'Спросить о ' },
    ],
    actions: [
      {
        id: 'chip-take-salt',
        match: ['взять горсть', 'взять соль', 'горсть соли'],
        narrative:
          'Соль серая, крупная, пахнет йодом. Горсть отправляется в карман рюкзака. ' +
          'Косма провожает твою руку взглядом, но молчит.',
        addToInventory: 'горсть серой соли',
        oneTime: true,
      },
      {
        id: 'chip-vat',
        match: ['заглянуть в чан', 'треснувший чан', 'осмотреть чан'],
        narrative:
          'Ты успеваешь разглядеть дно: не соль — тёмные разводы и обрывок просмолённой верёвки. ' +
          'Чаном давно не варят, но к нему натоптано. За спиной скрипит песок: тебя заметили.',
        addFact: 'к мёртвому чану на солеварне натоптана тропа',
        check: { skill: 'Скрытность', success: false },
      },
    ],
    noticed: [
      { id: 'item-vat', label: 'треснувший чан' },
      { id: 'item-sacks', label: 'мешки с портовым клеймом' },
    ],
  },
}

/** Base chips present in every location (brainstorm round 2). */
export const baseChips: FixtureChip[] = [
  { id: 'chip-look', label: 'осмотреться', kind: 'atomic', command: 'осмотреться' },
  { id: 'chip-inventory', label: 'инвентарь', kind: 'atomic', command: 'инвентарь' },
]

// --- NPC initiative triggers (brainstorm round 4) --------------------------------

export interface FixtureTrigger {
  id: string
  /** What fires the trigger: entering a location or a fixture action. */
  on: { type: 'enter'; locationId: string } | { type: 'action'; actionId: string }
  /** Speaker; must be present in the player's location to actually speak. */
  npcId: string
  text: string
}

/** All triggers fire once per game. */
export const triggers: FixtureTrigger[] = [
  {
    id: 'trg-road-mara',
    on: { type: 'enter', locationId: 'loc-road' },
    npcId: 'npc-mara',
    text: '«Эй! С колеи сойди, — окликает возчица. — По ночам тут возят без фонарей, затопчут и не заметят».',
  },
  {
    id: 'trg-salt-kosma',
    on: { type: 'enter', locationId: 'loc-saltworks' },
    npcId: 'npc-kosma',
    text: '«Чужим тут делать нечего, — бросает старик, не оборачиваясь. — Ну, раз пришёл — мешки не трогай».',
  },
  {
    id: 'trg-bottle-halt',
    on: { type: 'action', actionId: 'chip-take-bottle' },
    npcId: 'npc-halt',
    text: '«Эту бутылку вчера оставил тот, в капюшоне, — негромко говорит Хальт. — Занятно, что она тебе приглянулась».',
  },
  {
    id: 'trg-vat-kosma',
    on: { type: 'action', actionId: 'chip-vat' },
    npcId: 'npc-kosma',
    text: '«Я же сказал: к чану не подходить! — лопатка замирает в рассоле. — Шёл бы ты отсюда, любопытный».',
  },
]

// --- stranger reveals (brainstorm round 4) ----------------------------------------

export interface FixtureReveal {
  npcId: string
  /** Reveal fires when talking to the NPC while carrying a matching item. */
  requiresInventorySubstring: string
  reply: string
  newName: string
  newRole: string
}

export const reveals: FixtureReveal[] = [
  {
    npcId: 'npc-hooded',
    requiresInventorySubstring: 'шарик',
    reply:
      'Капюшон откидывается на палец — ровно настолько, чтобы ты увидел усмешку. ' +
      '«Зелёное стекло из дюн... Значит, нашёл всё-таки. Меня зовут Вейр. ' +
      'Приходи к солеварне после заката — узнаешь, чьи это лодки ходят без огней».',
    newName: 'Вейр',
    newRole: 'связной с юга',
  },
]

// --- skill growth (brainstorm round 6) ---------------------------------------------

export interface GrowthRule {
  counter: string
  attribute: 'perception' | 'empathy' | 'lore' | 'athletics' | 'subterfuge'
  /** Attribute +1 every `every` increments of the counter (cap 5). */
  every: number
}

export const growthRules: GrowthRule[] = [
  { counter: 'looked_around', attribute: 'perception', every: 3 },
  { counter: 'talked_to_npcs', attribute: 'empathy', every: 3 },
  { counter: 'explored_locations', attribute: 'lore', every: 2 },
]

// --- canned dialogue ------------------------------------------------------------

export interface DialogueTable {
  /** First match wins; keywords are lowercase substrings of the player text. */
  keyed: Array<{ keywords: string[]; reply: string }>
  /** Cycled when nothing matches. */
  fallbacks: string[]
}

export const dialogues: Record<string, DialogueTable> = {
  'npc-halt': {
    keyed: [
      {
        keywords: ['подвал', 'погреб', 'люк'],
        reply:
          '«Подвал, значит... А кто тебе про него наплёл? — Хальт ставит кружку. — Сходи лучше ' +
          'на солеварню. Спроси Косму, чьим клеймом он мешки метит».',
      },
      {
        keywords: ['соль', 'солеварн', 'косма', 'клейм'],
        reply:
          '«Косма варит соль дольше, чем я наливаю эль. Только последний год возит её не в ' +
          'посёлок, а куда-то ночами», — Хальт пожимает плечами.',
      },
      {
        keywords: ['капюшон', 'незнаком', 'тот тип'],
        reply:
          '«Этот? Сидит со вчера, платит вперёд, лица не показывает. Мне платят — я не ' +
          'спрашиваю», — он понижает голос.',
      },
      {
        keywords: ['прилив', 'ночн', 'лодк'],
        reply: '«Тише с этим. — Хальт наклоняется ближе. — У этих стен длинные уши».',
      },
      {
        keywords: ['выпить', 'эль', 'налей', 'выпивк'],
        reply: '«Вот это разговор», — Хальт цедит тёмный эль и ставит кружку перед тобой.',
      },
    ],
    fallbacks: [
      'Хальт пожимает плечами: «Налить — налью, а болтать сегодня не настроен».',
      '«Спроси что попроще, друг», — он возвращается к кружкам.',
    ],
  },
  'npc-sailor': {
    keyed: [
      {
        keywords: ['прилив', 'ночн'],
        reply:
          'Матрос наклоняется, дыша элем: «Ночной прилив — это не вода, понял? Это когда лодки ' +
          'без огней. Я тебе ничего не говорил».',
      },
      {
        keywords: ['лодк', 'порт', 'якор', 'корабл'],
        reply:
          '«Порт нынче пустой стоит, а соль кто-то возит. На чём, спрашивается?» — он икает и ' +
          'обводит зал мутным взглядом.',
      },
      {
        keywords: ['соль', 'солеварн', 'косма'],
        reply:
          '«Старик Косма? Да он лет десять с портом не вяжется... вроде бы», — матрос щурится, ' +
          'будто сам себе не верит.',
      },
    ],
    fallbacks: [
      'Матрос бормочет что-то про шторм и роняет голову на стол.',
      '«Эль тут кислый, но другого нет», — вздыхает он.',
    ],
  },
  'npc-hooded': {
    keyed: [],
    fallbacks: [
      'Капюшон чуть поворачивается: «Не здесь. Приходи к солеварне после заката». Больше он не отвечает.',
      'Незнакомец молчит, будто тебя нет.',
    ],
  },
  'npc-mara': {
    keyed: [
      {
        keywords: ['соль', 'солеварн', 'груз', 'возишь'],
        reply:
          '«Вожу соль до тракта, дальше не моё дело. Платят серебром, вопросов не задаю», — ' +
          'Мара поправляет упряжь.',
      },
      {
        keywords: ['дорог', 'куда', 'тракт'],
        reply:
          '«На юг — таверна, на запад — солеварня. Ночью по колее не езди: фонарей нет, а ямы есть».',
      },
      {
        keywords: ['след', 'подков'],
        reply: '«Не мои. Моя кляча кована в посёлке, а эти — чужие, тяжёлые», — Мара сплёвывает.',
      },
    ],
    fallbacks: ['Мара щурится на небо: «Дождь будет. Тебе чего?»'],
  },
  'npc-unna': {
    keyed: [
      {
        keywords: ['море', 'рыб', 'улов'],
        reply:
          '«Рыба ушла от берега. Старики говорят — вода пахнет не так», — Унна перебирает сеть.',
      },
      {
        keywords: ['огн', 'лодк', 'прилив', 'ночь'],
        reply:
          '«Видела огни в море за полночь. Не маяк — ниже и ближе. Кому скажешь — засмеют», — ' +
          'она не поднимает глаз.',
      },
      {
        keywords: ['шарик', 'стекл'],
        reply:
          '«Поплавок? Дай глянуть. — Унна вертит шарик. — Зелёное стекло. У нас таких не дуют. ' +
          'Южные воды».',
      },
    ],
    fallbacks: ['Унна молча латает сеть.'],
  },
  'npc-kosma': {
    keyed: [
      {
        keywords: ['клейм', 'якор', 'мешк'],
        reply:
          'Косма мрачнеет: «Клеймо как клеймо. Заказчик просил — я ставлю. Кто заказчик — не ' +
          'твоя забота». Лопатка стучит о край чана.',
      },
      {
        keywords: ['подвал', 'хальт', 'таверн'],
        reply:
          '«Хальт послал? — старик усмехается. — Скажи ему: его подвал — его дело. Моя соль тут ' +
          'ни при чём». Звучит ровно наоборот.',
      },
      {
        keywords: ['чан', 'трещин'],
        reply: '«Старый чан, треснул зимой. Не подходи к нему, провалишься», — слишком быстро отвечает он.',
      },
      {
        keywords: ['соль'],
        reply:
          '«Соль как соль: выпарил, сгрёб, посушил. Море щедрое, пока его не злят», — говорит он, ' +
          'не оборачиваясь.',
      },
    ],
    fallbacks: ['Косма мешает рассол и делает вид, что не слышит.'],
  },
}

/** Deterministic fallback when no intent matched (no LLM in Phase 1). */
export const FALLBACK_NARRATIVE =
  'Ничего не происходит. Попробуй осмотреться, заговорить с кем-нибудь или выбрать выход.'
