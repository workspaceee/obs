# IMBA Widgets — OBS-оверлеи для стрима Dota 2

Два виджета в стиле **IMBA Cyber Club** (неон: красный / зелёный / белый / чёрный) с прозрачным фоном для OBS:

1. **Счёт WIN / LOSE** — зелёные победы, красные поражения, серия (streak), FORM последних 10 матчей, полоса винрейта. Управление глобальными горячими клавишами прямо из игры (по умолчанию `Ctrl+Alt+Num1` = WIN, `Ctrl+Alt+Num2` = LOSE, `Ctrl+Alt+Num0` = UNDO).
2. **Звание «текущее → цель»** — оригинальные медали Dota 2 (Herald…Divine 1–5★, Immortal + Top 1000/100/10/1 с номером места), неоновая стрелка и «N★ TO GO».

Плюс веб-панель управления (RU, вход по паролю): счёт, выбор званий, запись горячих клавиш, ссылки для OBS.

---

## Быстрый старт на Windows (рекомендуется)

Готовая папка лежит в [`windows/`](windows/). Собрать архив можно через панель (вкладка **OBS → «Скачать IMBA-Widgets-Windows.zip»**) или вручную — см. ниже.

1. Положите папку `IMBA-Widgets` на рабочий стол.
2. Первый раз: **`1_FIRST_START_INSTALL.bat`** — скачает портативные Python 3.12 и AutoHotkey v2 *внутрь папки* (без прав администратора), установит библиотеки и всё запустит.
3. Дальше каждый раз: **`2_START.bat`**. Остановить: `Ctrl+C` или **`3_STOP.bat`**.

Ссылки для OBS (Источник → Браузер):

| Виджет | URL | Размер |
|---|---|---|
| Счёт | `http://127.0.0.1:8765/widget/score` | 600 × 200 |
| Звание | `http://127.0.0.1:8765/widget/rank` | 900 × 360 |

Панель: `http://127.0.0.1:8765/panel` — пароль по умолчанию `imba2025` (меняется в панели).
Данные хранятся в `data/imba-db.json` (MongoDB не нужна).

---

## Структура репозитория

```
backend/            FastAPI: API виджетов (long-poll), панель, горячие клавиши, сборка Windows-архива
  server.py         основной сервер
  storage.py        хранилище: MongoDB (если задан MONGO_URL) или JSON-файл (локально)
  helper_script.py  генерация AutoHotkey v2 помощника
  bundle.py         сборка zip для Windows
frontend/           React (CRA + craco, Tailwind, shadcn/ui, framer-motion)
  public/medals/    41 медаль Dota 2 (PNG, прозрачные, 512px)
windows/            Windows-пакет
  launchers/        1_FIRST_START_INSTALL.bat, 2_START.bat, 3_STOP.bat, README_RU.txt
  scripts/          install.ps1, start.ps1, stop.ps1, common.ps1
  web/              готовая сборка фронтенда для локального режима
  build_web.sh      пересборка web/
tests/              POC: загрузка и проверка медалей
```

## Запуск для разработки (облако / Linux)

```bash
# backend
cd backend
cp .env.example .env        # укажите MONGO_URL / DB_NAME (или уберите MONGO_URL — будет JSON-файл)
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# frontend
cd frontend
cp .env.example .env        # REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

Пересобрать Windows web-сборку: `bash windows/build_web.sh` (относительные `/api`, без облачной аналитики).

## Технические заметки

- Виджеты получают изменения мгновенно через long-polling (`/api/widget/score?since=<version>`) — надёжно в OBS, на телефоне и за прокси.
- Фон страниц виджетов полностью прозрачный (`html/body: transparent`), плашки масштабируются под размер Browser Source без потери качества.
- Помощник клавиш (AutoHotkey v2) не трогает файлы и память игры — только отправляет HTTP-команду на сервер; клавиши Num работают при любом NumLock.
- Изображения медалей принадлежат Valve (Dota 2).
