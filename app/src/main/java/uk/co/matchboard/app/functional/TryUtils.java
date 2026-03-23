package uk.co.matchboard.app.functional;

public class TryUtils {
    public static <R> Result<R> tryCatch(ThrowingSupplier<R> task) {
        try {
            return  Result.of(task.get());
        } catch (Exception ex) {
            return Result.failure(ex);
        }
    }

    public static <R> Result<R> tryCatchResult(ThrowingSupplier<Result<R>> task) {
        try {
            return  task.get();
        } catch (Exception ex) {
            return Result.failure(ex);
        }
    }
}
