import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRoomActions, type ToastNotification } from '@/context/RoomContext';
import type { Result } from '@/utils/Result';
import { getSafeString } from '@/utils/parsers';

/**
 * Unified mutation wrapper for every game action.
 *
 * Before this hook, each of the six game mutations in `useInvestigationPhase`,
 * `useSuspectVerdict` and `useInvestigationRequest` repeated the same three
 * things by hand:
 *   1. unwrap the `Result<T>` from `@/services/api` and throw on failure,
 *   2. reach into a half-known error shape to find a renderable string,
 *   3. push a `GlobalFeedback` object into `RoomContext`.
 *
 * Those copies drifted: some kept the server `title`, some discarded it, some
 * silently swallowed a `SyntaxError`. Centralising them here is what makes the
 * error path uniform -- and therefore testable.
 *
 * `mutationFn` receives a `Result`-returning function. The hook owns the
 * unwrap-then-throw contract, so callers never write `if (!result.isSuccess)`
 * again.
 */

/** Feedback stays on screen this long, matching the pre-existing modal timings. */
export const DEFAULT_FEEDBACK_TTL = 4000;

/** Translation key used when a mutation fails and no `errorTitle` is supplied. */
export const DEFAULT_ERROR_TITLE_KEY = 'pages.gameRoom.hooks.phase.systemError';

export type FeedbackToastType = ToastNotification['type'];

export interface GameMutationConfig<TData, TVars, TContext = unknown> {
  /** Must resolve to a `Result`. The failure branch is unwrapped into a thrown `Error`. */
  mutationFn: (vars: TVars) => Promise<Result<TData, unknown>>;

  /**
   * Translation key (or literal text) dispatched as a success feedback.
   * Omit it and success stays silent, which is the correct default for
   * mutations whose success is already visible in the UI (a refresh, a
   * state change).
   */
  successMessage?: string;
  /** Title for the success feedback. Defaults to `successMessage`. */
  successTitle?: string;
  /** Route the success notice to a toast instead of the global feedback modal. */
  successToast?: FeedbackToastType;
  /** Icon for `successToast`. */
  successIcon?: string;

  /** Translation key (or literal text) used as the error feedback title. */
  errorTitle?: string;

  /**
   * Set to `false` when the caller renders its own feedback surface.
   *
   * `useSuspectVerdict` and `useInvestigationRequest` both drive a tab-local
   * modal (indictment / procedural request) rather than the global overlay,
   * so for them the unified error dispatch would raise a second, duplicate
   * notification. Defaults to `true`.
   */
  dispatchErrorFeedback?: boolean;

  /** Milliseconds before the success feedback auto-dismisses. */
  feedbackTtl?: number;

  /** Optimistic-update hook. The returned value is the rollback context. */
  onMutate?: (vars: TVars) => Promise<TContext> | TContext;
  /** Runs *after* the unified success feedback has been dispatched. */
  onSuccess?: (data: TData, vars: TVars, context: TContext | undefined) => void;
  /** Runs *after* the unified error feedback has been dispatched. */
  onError?: (error: Error, vars: TVars, context: TContext | undefined) => void;
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    vars: TVars,
    context: TContext | undefined,
  ) => void;
}

/**
 * Normalises anything thrown inside a `mutationFn` into a real `Error`.
 *
 * The guard clauses the callers write before hitting the API
 * (`throw { message: 'No active level to submit.' }`) would otherwise reach
 * `onError` as a bare object, and `error.message` would be readable by
 * accident rather than by contract.
 */
const toError = (thrown: unknown): Error => {
  if (thrown instanceof Error) return thrown;

  const message = getSafeString(thrown, '');
  if (message) return new Error(message);

  try {
    return new Error(JSON.stringify(thrown));
  } catch {
    return new Error(String(thrown));
  }
};

export function useGameMutation<TData, TVars = void, TContext = unknown>(
  config: GameMutationConfig<TData, TVars, TContext>,
): UseMutationResult<TData, Error, TVars, TContext> {
  const { t } = useTranslation();
  const { setGlobalFeedback, addGlobalToast } = useRoomActions();

  const {
    mutationFn,
    successMessage,
    successTitle,
    successToast,
    successIcon,
    errorTitle,
    dispatchErrorFeedback = true,
    feedbackTtl = DEFAULT_FEEDBACK_TTL,
    onMutate,
    onSuccess,
    onError,
    onSettled,
  } = config;

  return useMutation<TData, Error, TVars, TContext>({
    mutationFn: async (vars) => {
      let result: Result<TData, unknown>;

      try {
        result = await mutationFn(vars);
      } catch (thrown) {
        throw toError(thrown);
      }

      if (!result.isSuccess) {
        // Phase 2 Amendment: the error is flattened to a string *here*, at the
        // throw site, so that every downstream consumer -- onError included --
        // can treat `error.message` as a plain string.
        throw new Error(
          typeof result.errorMessage === 'string'
            ? result.errorMessage
            : JSON.stringify(result.errorMessage),
        );
      }

      return result.value;
    },

    onMutate,

    onSuccess: (data, vars, context) => {
      if (successMessage) {
        const resolvedMessage = t(successMessage);
        const resolvedTitle = t(successTitle ?? successMessage);

        if (successToast) {
          addGlobalToast({
            type: successToast,
            title: resolvedTitle,
            message: resolvedMessage,
            icon: successIcon ?? '',
          });
        } else {
          setGlobalFeedback({ type: 'success', title: resolvedTitle, message: resolvedMessage });
          setTimeout(() => setGlobalFeedback(null), feedbackTtl);
        }
      }

      onSuccess?.(data, vars, context);
    },

    onError: (error, vars, context) => {
      if (dispatchErrorFeedback) {
        // Phase 2 Amendment: `error` is always a real `Error` by this point,
        // so `error.message` is the flattened string -- no nested-object digging.
        setGlobalFeedback({
          type: 'error',
          title: errorTitle ? t(errorTitle) : t(DEFAULT_ERROR_TITLE_KEY),
          message: getSafeString(error.message, t(DEFAULT_ERROR_TITLE_KEY)),
        });
      }

      onError?.(error, vars, context);
    },

    onSettled,
  });
}
