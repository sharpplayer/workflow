package uk.co.matchboard.app.functional;

import java.util.function.Function;

public class OptionalResult<T> {

    private final T value;
    private final Exception exception;

    private OptionalResult(T value, Exception exception) {
        this.value = value;
        this.exception = exception;
    }

    public OptionalResult(T value) {
        this(value, null);
    }

    public OptionalResult(Exception exception) {
        this(null, exception);
    }

    public boolean isFaulted() {
        return exception != null;
    }

    @SuppressWarnings("unchecked")
    public <S> OptionalResult<S> cast() {
        if (isFaulted()) {
            return new OptionalResult<>(exception);
        }

        try {
            return new OptionalResult<>((S) value);
        } catch (ClassCastException ex) {
            return new OptionalResult<>(ex);
        }

    }

    public <R> OptionalResult<R> map(Function<T, R> function) {
        if (isFaulted()) {
            return cast();
        }

        return new OptionalResult<>(function.apply(value));
    }
}
