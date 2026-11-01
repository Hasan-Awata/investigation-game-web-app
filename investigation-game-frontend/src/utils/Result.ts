export type ValidationErrors = Record<string, string[]>;
export interface RetryMetadata { status?: number; retryAfterSeconds?: number }

export type Result<T, E = string> = 
  | { isSuccess: true; value: T; errorMessage?: never }
  | ({ isSuccess: false; value?: never; errorMessage: E; errors?: ValidationErrors } & RetryMetadata);

export const success = <T>(value: T): Result<T, never> => ({
  isSuccess: true,
  value,
});

export const failure = <E>(errorMessage: E, errors?: ValidationErrors, metadata?: RetryMetadata): Result<never, E> => ({
  isSuccess: false,
  errorMessage,
  ...(errors ? { errors } : {}),
  ...metadata,
});
