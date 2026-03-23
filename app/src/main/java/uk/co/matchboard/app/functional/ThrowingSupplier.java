package uk.co.matchboard.app.functional;

@FunctionalInterface
public interface ThrowingSupplier<R> {
    R get() throws Exception;
}