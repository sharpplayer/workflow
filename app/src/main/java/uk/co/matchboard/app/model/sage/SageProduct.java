package uk.co.matchboard.app.model.sage;

import java.util.Map;
import uk.co.matchboard.app.exception.BadValueException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.ThrowingTriFunction;
import uk.co.matchboard.app.functional.TryUtils;

public record SageProduct(
        String number,
        String owner,
        String material,
        String profile,
        String edge,
        String format,
        String dimensions,
        String thickness,
        String pitch,
        String rackType,
        String finish,
        String machinery,
        String enabled
) {

    private static final ThrowingTriFunction<String, Map<String, String>, String, String> getRequired = (p, r, key) -> {
        String value = r.get(key);
        if (value == null) {
            throw new BadValueException(
                    p,
                    key,
                    null,
                    "Value required"
            );
        }
        return value.trim();
    };


    public static Result<SageProduct> fromMap(Map<String, String> row,
            Map<String, String> headerMapping) {

        return TryUtils.tryCatch(() -> {
                    String part = getRequired.apply("(Unspecified)", row, headerMapping.get("part"));
                    return new SageProduct(
                            part,
                            getRequired.apply(part, row, headerMapping.get("owner")),
                            getRequired.apply(part, row, headerMapping.get("material")),
                            getRequired.apply(part, row, headerMapping.get("profile")),
                            getRequired.apply(part, row, headerMapping.get("edge")),
                            getRequired.apply(part, row, headerMapping.get("format")),
                            getRequired.apply(part, row, headerMapping.get("dimensions")),
                            getRequired.apply(part, row, headerMapping.get("thickness")),
                            getRequired.apply(part, row, headerMapping.get("pitch")),
                            getRequired.apply(part, row, headerMapping.get("racktype")),
                            getRequired.apply(part, row, headerMapping.get("finish")),
                            getRequired.apply(part, row, headerMapping.get("machinery")),
                            getRequired.apply(part, row, headerMapping.get("enabled")));
                }
        );
    }
}
