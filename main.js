
document.getElementById('open-case-btn').addEventListener('click', async () => {
  try {
    const response = await fetch('http://127.0.0.1:8000/open_case'); // URL твоего FastAPI
    if (!response.ok) throw new Error('Ошибка запроса');

    const data = await response.json();
    console.log(data.message);  // выведет "Кейс открыт" в консоль браузера

  } catch (err) {
    console.error('Ошибка при открытии кейса:', err);
  }
});
