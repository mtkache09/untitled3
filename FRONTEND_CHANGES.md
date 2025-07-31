# Изменения фронтенда для поддержки новых способов пополнения

## Обзор изменений

Фронтенд обновлен для работы с новыми API эндпоинтами пополнения через TON и Telegram Stars.

## HTML изменения (`index.html`)

### 1. Активирована опция Telegram Stars
```html
<!-- Было -->
<input type="radio" name="paymentMethod" value="telegram_stars" class="mr-2" disabled>
<span class="text-gray-500">Telegram Stars (скоро)</span>

<!-- Стало -->
<input type="radio" name="paymentMethod" value="telegram_stars" class="mr-2">
<span class="text-white">Telegram Stars ⭐</span>
```

### 2. Добавлен блок информации для звездочек
```html
<div id="starsPaymentInfo" class="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded text-sm text-yellow-200 hidden">
    <div class="mb-2">
        <strong>Способ оплаты:</strong> Telegram Stars ⭐
    </div>
    <div class="mb-2">
        <strong>Сумма:</strong> <span id="starsAmount">0</span> фантиков
    </div>
    <div class="text-xs text-yellow-300">
        После нажатия кнопки "Оплатить звездочками" будет отправлен запрос в телеграм бота для оплаты
    </div>
</div>
```

### 3. Обновлены кнопки
- Добавлена кнопка "⭐ Оплатить звездочками"
- Добавлен `span` с `id="createPayloadText"` для динамического изменения текста

## JavaScript изменения (`script.js`)

### 1. Обновлена функция `createTopupPayload()`
- Добавлена проверка способа оплаты
- Для звездочек вызывается `processStarsPayment()`
- Для TON используется новый эндпоинт `/topup/ton/create_payload`

### 2. Новые функции

#### `processStarsPayment(amount)`
- Подготавливает интерфейс для оплаты звездочками
- Показывает соответствующую информацию и кнопку

#### `payWithStars()`
- Отправляет запрос на эндпоинт `/topup/stars`
- Показывает уведомление о том, что запрос отправлен в бота

#### `updatePaymentMethodUI()`
- Обновляет интерфейс при переключении способа оплаты
- Изменяет текст и стиль кнопки в зависимости от выбранного метода

#### `resetTopupModal()`
- Сбрасывает состояние модального окна при открытии
- Скрывает все блоки информации и показывает основную кнопку

### 3. Обновлена функция `confirmTopup()`
- Использует новый эндпоинт `/topup/ton/confirm`
- Улучшены уведомления с информацией о добавленных фантиках

### 4. Добавлены обработчики событий
```javascript
document.getElementById("payWithStars").addEventListener("click", payWithStars)

document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
  radio.addEventListener('change', updatePaymentMethodUI)
})
```

## Поток работы пользователя

### Для TON:
1. Выбор "TON коины" → кнопка "Создать TON платеж" (синяя)
2. Клик → показывается информация о TON транзакции
3. Кнопка "Отправить TON" → отправка через TON Connect
4. Автоматическое подтверждение и обновление баланса

### Для Telegram Stars:
1. Выбор "Telegram Stars ⭐" → кнопка "⭐ Подготовить оплату звездочками" (желтая)
2. Клик → показывается информация о звездочках
3. Кнопка "⭐ Оплатить звездочками" → отправка запроса в бота
4. Уведомление о том, что нужно ждать сообщение в телеграме

## Используемые API эндпоинты

- **TON**: `/topup/ton/create_payload` и `/topup/ton/confirm`
- **Stars**: `/topup/stars`

## Особенности

1. **Разное поведение после оплаты**:
   - TON: мгновенное обновление баланса
   - Stars: ожидание обработки ботом

2. **Визуальная индикация**:
   - TON: синие цвета
   - Stars: желтые цвета + эмодзи звездочки

3. **Уведомления пользователю** [[memory:4881774]]:
   - Информативные сообщения о статусе операций
   - Разная длительность показа в зависимости от типа операции