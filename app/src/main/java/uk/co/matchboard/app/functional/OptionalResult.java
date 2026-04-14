package uk.co.matchboard.app.functional;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.function.Supplier;
import uk.co.matchboard.app.exception.AggregateException;

public class OptionalResult<T> {

    private final T value;
    private final Exception exception;

    public static <T> Result<List<T>> sequence(
            List<OptionalResult<T>> results) {
        List<T> collected = new ArrayList<>();
        List<Exception> errors = new java.util.ArrayList<>();

        for (OptionalResult<T> r : results) {
            if (r.isFaulted()) {
                errors.add(r.exception);
            } else if (r.value != null) {
                collected.add(r.value);
            }
        }

        if (errors.isEmpty()) {
            return Result.of(collected);

        }
        return Result.failure(new AggregateException(errors));
    }

    public static <A, B, C, R> Result<R> combine(
            OptionalResult<A> ra,
            OptionalResult<B> rb,
            OptionalResult<C> rc,
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

    private OptionalResult(T value, Exception exception) {
        this.value = value;
        this.exception = exception;
    }

    public static <T> OptionalResult<T> of(T value) {
        return new OptionalResult<>(value, null);
    }

    public static <T> OptionalResult<T> empty() {
        return new OptionalResult<>(null, null);
    }

    public static <T> OptionalResult<T> failure(Exception ex) {
        return new OptionalResult<>(null, ex);
    }

    public boolean isFaulted() {
        return exception != null;
    }

    @SuppressWarnings("unchecked")
    public <S> OptionalResult<S> cast() {
        if (isFaulted()) {
            return new OptionalResult<>(null, exception);
        }
        return new OptionalResult<>((S) value, null);
    }

    public <R> OptionalResult<R> map(Function<T, R> function) {
        if (isFaulted()) {
            return cast();
        }

        return new OptionalResult<>(function.apply(value), null);
    }

    public <R> R fold(Function<T, R> onSuccess, Function<Exception, R> onFailure,
            Supplier<R> onNone) {
        if (isFaulted()) {
            return onFailure.apply(exception);
        }
        if (value == null) {
            return onNone.get();
        }
        return onSuccess.apply(value);
    }

    public <R> Result<R> mapResult(Function<T, Result<R>> function) {
        if (isFaulted()) {
            return Result.failure(exception);
        }

        return function.apply(value);
    }

    public <R> OptionalResult<R> flatMap(Function<T, Result<R>> function) {
        if (isFaulted()) {
            return cast();
        }
        if (value == null) {
            return OptionalResult.empty();
        }
        return function.apply(value).toOptional();
    }

    public <R> OptionalResult<R> flatMapOptional(Function<T, OptionalResult<R>> function) {
        if (isFaulted()) {
            return cast();
        }
        if (value == null) {
            return OptionalResult.empty();
        }
        return function.apply(value);
    }

}

