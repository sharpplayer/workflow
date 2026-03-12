package uk.co.matchboard.app.functional;

import java.util.Optional;
import java.util.function.Function;

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

    public boolean isFaulted() {
        return exception != null;
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

    public <R> Result<R> mapResult(Function<T, Result<R>> function) {
        if (isFaulted()) {
            return cast();
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
        return result.fold(value -> OptionalResult.of(value.orElse(null)), OptionalResult::failure);
    }
}
