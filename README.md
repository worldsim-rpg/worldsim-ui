# worldsim-ui

Веб-интерфейс текстовой RPG worldsim. Три панели: Беседа | Локация | Действие.

Phase 1 (текущая): прототип на детерминированной фикстуре, без LLM-вызовов.
Движок спрятан за интерфейсом `WorldEngine` — в Phase 2 (отдельная спека)
вместо фикстуры подключается HTTP API оркестратора (`worldsim-orchestrator`)
без переписывания UI.

## Стек

Vite + React + TypeScript + Tailwind CSS.

## Запуск

```bash
npm install
npm run dev        # dev-сервер, http://localhost:5173
npm run build      # tsc + production-сборка в dist/
npm run preview    # просмотр production-сборки
```

## Структура

```
src/
  types/        TS-зеркала канонических моделей (worldsim_schemas) + UI-типы
  engine/       интерфейс WorldEngine + фикстурная и Claude-реализации
  fixture/      мини-мир «Соляные Берега»: 3 локации, 6 NPC
  components/   панели, плитки-щиты, SVG-глифы, typewriter
  lib/          утилиты (цвет из хеша id)
  config.ts     константы (скорость typewriter, длительность fade)
server/         спайк: мини-сервер с ключом Anthropic (см. ниже)
```

## Спайк: движок Claude (ветка spike/claude-engine)

Экспериментальный «живой мир»: нарратив и реплики NPC генерирует Claude
(`claude-opus-4-8`) через локальный сервер. Механика (переходы, предметы,
проверки, прогрессия) остаётся фикстурной.

```bash
# 1. Сервер (ключ ТОЛЬКО здесь, в env)
cd server
npm install
cp .env.example .env   # вписать ANTHROPIC_API_KEY
npm run dev            # http://localhost:8787

# 2. UI (в другом терминале, из корня репо)
npm run dev            # http://localhost:5173, /api проксируется на 8787
```

В игре: настройки (шестерёнка) -> «Движок мира» -> Claude. Дефолт — Fixture;
без сервера/ключа UI работает как раньше (тексты фикстурные). Ключ не попадает
в браузерный бандл, git и логи (`server/.env` в .gitignore).

## Ветки

| Ветка     | Назначение          | Как попасть                    |
|-----------|---------------------|--------------------------------|
| `dev`     | разработка          | прямой push                    |
| `staging` | синхронизация/ревью | PR `dev -> staging`, 1 approve |
| `main`    | деплой/продакшен    | PR `staging -> main`, 1 approve|

Прямой push в `staging` и `main` заблокирован branch protection.

## Правила

- Эмодзи запрещены везде: код, UI, коммиты, документация.
- Тексты внутри UI — русские; код, идентификаторы и commit-сообщения — английские.
- Канонические схемы живут в `worldsim-workspace/packages/schemas/` (pydantic).
  TS-типы в `src/types/canon.ts` — зеркала, при изменении канона обновлять вручную
  и сверять с источником.
