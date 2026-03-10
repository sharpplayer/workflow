package uk.co.matchboard.app.functional;

import java.util.Objects;
import java.util.function.Function;

public class Result<T> {

    private final T value;
    private final Exception exception;

    private Result(T value, Exception exception) {
        this.value = Objects.requireNonNull(value, "Result must have non-null value");
        this.exception = exception;
    }

    public Result(T value) {
        this(value, null);
    }

    public Result(Exception exception) {
        this(null, exception);
    }

    public boolean isFaulted() {
        return exception != null;
    }

    @SuppressWarnings("unchecked")
    public <S> Result<S> cast() {
        if (isFaulted()) {
            return new Result<>(exception);
        }

        try {
            return new Result<>((S) value);
        } catch (ClassCastException ex) {
            return new Result<>(ex);
        }

    }

    public <R> Result<R> map(Function<T, R> function) {
        if (isFaulted()) {
            return cast();
        }

        return new Result<>(function.apply(value));
    }
}
