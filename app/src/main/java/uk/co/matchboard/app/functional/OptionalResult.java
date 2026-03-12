package uk.co.matchboard.app.functional;

import java.util.function.Function;
import java.util.function.Supplier;

public class OptionalResult<T> {

    private final T value;
    private final Exception exception;

    private OptionalResult(T value, Exception exception) {
        this.value = value;
        this.exception = exception;
    }

    public static <T> OptionalResult<T> of(T value) {
        return new OptionalResult<>(value, null);
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
}

