export type Result<T, E = string> = 
  | { isSuccess: true; value: T; errorMessage?: never }
  | { isSuccess: false; value?: never; errorMessage: E };

export const success = <T>(value: T): Result<T, never> => ({
  isSuccess: true,
  value,
});

export const failure = <E>(errorMessage: E): Result<never, E> => ({
  isSuccess: false,
  errorMessage,
});