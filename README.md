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
  engine/       интерфейс WorldEngine + фикстурная реализация
  fixture/      мини-мир «Соляные Берега»: 3 локации, 6 NPC
  components/   панели, плитки-щиты, SVG-глифы, typewriter
  lib/          утилиты (цвет из хеша id)
  config.ts     константы (скорость typewriter, длительность fade)
```

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
