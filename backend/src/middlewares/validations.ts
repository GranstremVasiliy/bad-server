import { Joi, celebrate } from 'celebrate'
import { Types } from 'mongoose'

const passwordSchema = Joi.string()
    .max(72)
    .custom((value: string, helpers) => {
        if (Buffer.byteLength(value, 'utf8') > 72) {
            return helpers.error('any.invalid')
        }

        return value
    })
    .messages({
        'any.invalid': 'Пароль не должен превышать 72 байта в UTF-8',
    })

export const phoneRegExp = /^\+?[0-9][0-9() -]{0,28}(?![\s\S])/

export enum PaymentType {
    Card = 'card',
    Online = 'online',
}

// Создание заказа
export const validateOrderBody = celebrate({
    body: Joi.object()
        .keys({
            items: Joi.array()
                .items(
                    Joi.string()
                        .pattern(/^[a-fA-F0-9]{24}$/)
                        .required()
                        .messages({
                            'string.pattern.base': 'Невалидный id товара',
                        })
                )
                .min(1)
                .max(100)
                .required()
                .messages({
                    'any.required': 'Не указаны товары',
                    'array.base': 'Товары должны быть переданы массивом',
                    'array.min': 'Заказ должен содержать хотя бы один товар',
                    'array.max': 'Заказ не должен содержать больше 100 позиций',
                }),

            payment: Joi.string()
                .valid(...Object.values(PaymentType))
                .required()
                .messages({
                    'any.only': 'Допустимые способы оплаты: card, online',
                    'string.empty': 'Не указан способ оплаты',
                }),

            email: Joi.string().trim().email().max(254).required().messages({
                'string.empty': 'Не указан email',
            }),

            phone: Joi.string()
                .trim()
                .max(30)
                .pattern(phoneRegExp)
                .required()
                .messages({
                    'string.empty': 'Не указан телефон',
                }),

            address: Joi.string().trim().max(500).required().messages({
                'string.empty': 'Не указан адрес',
            }),

            total: Joi.number().strict().min(0).required().messages({
                'any.required': 'Не указана сумма заказа',
                'number.base': 'Сумма заказа должна быть числом',
                'number.min': 'Сумма заказа не может быть отрицательной',
            }),

            comment: Joi.string().max(2000).allow('').optional(),
        })
        .unknown(false),
})

// Создание товара
export const validateProductBody = celebrate({
    body: Joi.object().keys({
        title: Joi.string().required().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
            'string.empty': 'Поле "title" должно быть заполнено',
        }),

        image: Joi.object().keys({
            fileName: Joi.string().required(),
            originalName: Joi.string().required(),
        }),

        category: Joi.string().required().messages({
            'string.empty': 'Поле "category" должно быть заполнено',
        }),

        description: Joi.string().required().messages({
            'string.empty': 'Поле "description" должно быть заполнено',
        }),

        price: Joi.number().allow(null),
    }),
})

// Обновление товара
export const validateProductUpdateBody = celebrate({
    body: Joi.object().keys({
        title: Joi.string().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
        }),

        image: Joi.object().keys({
            fileName: Joi.string().required(),
            originalName: Joi.string().required(),
        }),

        category: Joi.string(),
        description: Joi.string(),
        price: Joi.number().allow(null),
    }),
})

// Проверка productId в параметрах маршрута
export const validateObjId = celebrate({
    params: Joi.object().keys({
        productId: Joi.string()
            .required()
            .custom((value, helpers) => {
                if (Types.ObjectId.isValid(value)) {
                    return value
                }

                return helpers.message({ any: 'Невалидный id' })
            }),
    }),
})

// Регистрация
export const validateUserBody = celebrate({
    body: Joi.object()
        .keys({
            name: Joi.string().trim().min(2).max(30),
            email: Joi.string().trim().email().max(254).required(),
            password: passwordSchema.min(6).required(),
        })
        .unknown(false),
})

// Вход
export const validateAuthentication = celebrate({
    body: Joi.object()
        .keys({
            email: Joi.string().trim().email().max(254).required(),
            password: passwordSchema.required(),
        })
        .unknown(false),
})

// Обновление профиля
export const validateProfileUpdateBody = celebrate({
    body: Joi.object()
        .keys({
            name: Joi.string().trim().min(2).max(30),
            email: Joi.string().trim().email().max(254),
            phone: Joi.string()
                .trim()
                .max(30)
                .pattern(/^[+\d()\s-]+$/),
        })
        .min(1)
        .unknown(false),
})
