# Проектная работа "WebLarek. Плохой сервер.", спринт 17

## Подготовка к работе

1. Склонировать репозиторий
2. Запустить docker

```bash
docker compose up -d
```

3. Наполнить базу данных
   [README.md](.dump%2FREADME.md)
4. Перейти по адресу http://localhost/ и на странице должны быть продукты.
5. На странице http://localhost/login/ можно авторизоваться.
6. Админка находится по адресу http://localhost/admin/

## Репозиторий

https://github.com/GranstremVasiliy/bad-server

## Защита от CSRF

Для изменяющих запросов POST, PUT, PATCH и DELETE сервер проверяет
подписанный CSRF-токен из заголовка X-CSRF-Token.

Токен выдаётся через GET /auth/csrf и связан со служебной HttpOnly-cookie
и текущим refresh-токеном. Frontend получает актуальный токен перед
изменяющим запросом.

Разрешённые источники задаются через CORS_ALLOWED_ORIGINS.
Секрет подписи задаётся через CSRF_SECRET.
Для локального HTTP используется CSRF_COOKIE_SECURE=false,
для HTTPS — true.

Запросы без токена, с поддельным токеном или без соответствующей cookie
отклоняются с HTTP 403.
