package uk.co.matchboard.app.functional;

import java.util.function.Supplier;

public class TryUtils {
    public static <R> Result<R> tryCatch(Supplier<R> task) {
        try {

            return  Result.of(task.get());
        } catch (Exception ex) {
            return Result.failure(ex);
        }
    }
}
