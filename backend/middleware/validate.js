import { ZodError } from 'zod';

export const validate = (schemas) => (req, res, next) => {
  const errors = [];

  for (const [source, schema] of Object.entries(schemas)) {
    // source is 'body', 'params', or 'query'
    if (req[source]) {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        errors.push(...result.error.issues.map(issue => ({
          source,
          path: issue.path.join('.'),
          message: issue.message,
        })));
      } else {
        // req[source] might have only a getter (like req.query in some Express versions/middlewares), 
        // so we merge the parsed values instead of replacing the entire object
        Object.assign(req[source], result.data);
      }
    }
  }

  if (errors.length > 0) {
    // Make the main message human-readable for the frontend UI to display
    const firstError = errors[0];
    const fieldName = firstError.path || 'Input';
    const readableMessage = `${fieldName}: ${firstError.message}`;

    return res.status(400).json({
      message: readableMessage,
      errors, // Keep detailed errors for debugging
    });
  }

  next();
};
