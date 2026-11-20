# Users

## Хранение паролей

Пароли учебных пользователей в файле `weblarek.users.json`
хранятся в виде bcrypt-хешей.

Данные для входа:

- Администратор: `admin@mail.ru`, пароль `password`.
- Покупатель: `user1@mail.ru`, пароль `password1`.

# How to restore database

1. Через MongoDB Compass подключаемся к базе по адресу:

```
mongodb://root:example@localhost:27018/weblarek?authSource=admin
```

2. Выбираем коллекцию `users`, в ней `ADD DATA` и `Import JSON or CSV file`. Выбираем файл `.dump/weblarek.users.json`
3. Выбираем коллекцию `products`, в ней `ADD DATA` и `Import JSON or CSV file`. Выбираем файл `.dump/weblarek.products.json`
   Файлы изображений для продуктов уже находятся в директории backend/src/public/images/
