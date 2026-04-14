package uk.co.matchboard.app.functional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Function;
import uk.co.matchboard.app.exception.AggregateException;

public class Result<T> {

    private final T value;
    private final Exception exception;

    private Result(T value, Exception exception) {
        this.exception = exception;
        this.value = value;
    }

    public static <T> Result<T> of(T value) {
        return new Result<>(value, null);
    }

    public static <T> Result<T> failure(Exception ex) {
        return new Result<>(null, ex);
    }

    public static <T> Result<List<T>> sequence(
            List<Result<T>> results) {
        List<T> collected = new ArrayList<>();
        List<Exception> errors = new java.util.ArrayList<>();

        for (Result<T> r : results) {
            if (r.isFaulted()) {
                errors.add(r.exception);
            } else {
                collected.add(r.value);
            }
        }

        if (errors.isEmpty()) {
            return Result.of(collected);

        }
        return Result.failure(new AggregateException(errors));
    }

    public boolean isFaulted() {
        return exception != null;
    }

    public static <A, B, R> Result<R> combine(
            Result<A> ra,
            Result<B> rb,
            BiFunction<A, B, R> mapper
    ) {
        if (ra.isFaulted()) {
            return Result.failure(ra.exception);
        }
        if (rb.isFaulted()) {
            return Result.failure(rb.exception);
        }

        return Result.of(mapper.apply(ra.value, rb.value));
    }

    public static <A, B, C, R> Result<R> combine(
            Result<A> ra,
            Result<B> rb,
            Result<C> rc,
            TriFunction<A, B, C, R> mapper
    ) {
        if (ra.isFaulted()) {
            return Result.failure(ra.exception);
        }
        if (rb.isFaulted()) {
            return Result.failure(rb.exception);
        }
        if (rc.isFaulted()) {
            return Result.failure(rc.exception);
        }

        return Result.of(mapper.apply(ra.value, rb.value, rc.value));
    }

    @SuppressWarnings("unchecked")
    public <S> Result<S> cast() {
        if (isFaulted()) {
            return new Result<>(null, exception);
        }

        return new Result<>((S) value, null);

    }

    public <R> Result<R> map(Function<T, R> function) {
        if (isFaulted()) {
            return cast();
        }

        return new Result<>(function.apply(value), null);
    }

    public <R> Result<R> flatMapTry(ThrowingFunction<T, Result<R>> function) {
        if (isFaulted()) {
            return cast();
        }

        return TryUtils.tryCatchResult(() -> function.apply(value));
    }

    public Result<T> mapException(Function<Exception, Exception> function) {
        if (isFaulted()) {
            return Result.failure(function.apply(exception));
        }

        return this;
    }

    public <R> Result<R> flatMap(Function<T, Result<R>> function) {
        if (isFaulted()) {
            return cast();
        }

        return function.apply(value);
    }

    public <R> OptionalResult<R> flatMapOptional(Function<T, OptionalResult<R>> function) {
        if (isFaulted()) {
            return OptionalResult.failure(exception);
        }

        return function.apply(value);
    }

    public <R> R fold(Function<T, R> onSuccess, Function<Exception, R> onFailure) {
        if (isFaulted()) {
            return onFailure.apply(exception);
        }
        return onSuccess.apply(value);
    }

    public static <T> OptionalResult<T> toOptionalResult(Result<Optional<T>> result) {
        return result.fold(
                opt -> opt.map(OptionalResult::of)
                        .orElseGet(OptionalResult::empty),
                OptionalResult::failure
        );
    }

    public OptionalResult<T> toOptional() {
        if (isFaulted()) {
            return OptionalResult.failure(exception);
        }
        return OptionalResult.of(value);
    }
}
