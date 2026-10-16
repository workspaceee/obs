# IMBA Widgets — OBS-оверлеи для стрима Dota 2

Два виджета в стиле **IMBA Cyber Club** (неон: красный / зелёный / белый / чёрный) с прозрачным фоном для OBS:

1. **Счёт WIN / LOSE** — зелёные победы, красные поражения, серия (streak), FORM последних 10 матчей, полоса винрейта. Управление глобальными горячими клавишами прямо из игры (по умолчанию `Ctrl+Alt+Num1` = WIN, `Ctrl+Alt+Num2` = LOSE, `Ctrl+Alt+Num0` = UNDO).
2. **Звание «текущее → цель»** — оригинальные медали Dota 2 (Herald…Divine 1–5★, Immortal + Top 1000/100/10/1 с номером места), неоновая стрелка и «N★ TO GO».

Плюс веб-панель управления (RU, вход по паролю): счёт, выбор званий, запись горячих клавиш, ссылки для OBS.

---

## Быстрый старт на Windows (рекомендуется)

Репозиторий сразу готов к запуску — структура папок та же, что в архиве из панели.

1. На GitHub: **Code → Download ZIP**, затем правой кнопкой по архиву → **«Извлечь всё…»** (не запускайте файлы изнутри архива).
2. Положите распакованную папку (`obs-main`) на рабочий стол. Файлы `.bat` должны лежать **в главной папке** рядом с `backend\` и `windows\` — ничего не перемещайте.
3. Первый раз: **`1_FIRST_START_INSTALL.bat`** — скачает портативные Python 3.12 и AutoHotkey v2 *внутрь папки* (`runtime\`, без прав администратора), установит библиотеки и всё запустит.
4. Дальше каждый раз: **`2_START.bat`**. Остановить: `Ctrl+C` или **`3_STOP.bat`**.

Если Windows покажет «Система Windows защитила ваш компьютер» → «Подробнее» → «Выполнить в любом случае».

Ссылки для OBS (Источник → Браузер):

| Виджет | URL | Размер |
|---|---|---|
| Счёт | `http://127.0.0.1:8765/widget/score` | 600 × 200 |
| Звание | `http://127.0.0.1:8765/widget/rank` | 900 × 360 |

Панель: `http://127.0.0.1:8765/panel` — пароль по умолчанию `imba2025` (меняется в панели).
Данные хранятся в `data\imba-db.json` (MongoDB не нужна). Подробно — в [`README_RU.txt`](README_RU.txt).

---

## Структура репозитория

```
1_FIRST_START_INSTALL.bat   первый запуск: установка всего нужного + старт
2_START.bat                 обычный запуск
3_STOP.bat                  остановка
README_RU.txt               инструкция для Windows
backend/            FastAPI: API виджетов (long-poll), панель, горячие клавиши, сборка Windows-архива
  server.py         основной сервер
  storage.py        хранилище: MongoDB (облако) или JSON-файл (локально на Windows)
  helper_script.py  генерация AutoHotkey v2 помощника
  bundle.py         сборка zip для Windows (та же структура, что у репозитория)
frontend/           исходники React (CRA + craco, Tailwind, shadcn/ui, framer-motion)
  public/medals/    41 медаль Dota 2 (PNG, прозрачные, 512px)
windows/
  scripts/          install.ps1, start.ps1, stop.ps1, common.ps1 (только ASCII) + messages.ru.json (UTF-8)
  web/              готовая сборка виджетов и панели для локального режима
  requirements-local.txt   библиотеки Python для Windows
  build_web.sh      пересборка web/
runtime/, data/     создаются автоматически при установке/запуске (в git не попадают)
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
