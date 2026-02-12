import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { BadRequestError } from '../utils/errors';

export type ValidationType = 'body' | 'query' | 'params';

export const validate = (
  schema: Joi.ObjectSchema,
  type: ValidationType = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req[type];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw new BadRequestError(errorMessage);
    }

    // For query and params, we can't directly assign to req[type]
    // Instead, create a new object and assign validated values
    if (type === 'body') {
      req.body = value;
    } else if (type === 'query') {
      // Create a new query object by copying validated values
      Object.assign(req.query, value);
    } else if (type === 'params') {
      Object.assign(req.params, value);
    }

    next();
  };
};

export const validateBody = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'body');
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'query');
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'params');
};
