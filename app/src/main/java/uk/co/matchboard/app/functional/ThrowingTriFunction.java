package uk.co.matchboard.app.functional;

@FunctionalInterface
public interface ThrowingTriFunction<A, B, C, R> {
    R apply(A a, B b, C c) throws Exception;
}