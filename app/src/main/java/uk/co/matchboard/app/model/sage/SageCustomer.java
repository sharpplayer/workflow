package uk.co.matchboard.app.model.sage;

import java.util.Map;
import uk.co.matchboard.app.exception.BadValueException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.ThrowingTriFunction;
import uk.co.matchboard.app.functional.TryUtils;

public record SageCustomer(
        String code, String name, String zone, String contact,
        String contactNumber, String proforma, String enabled
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

    public static Result<SageCustomer> fromMap(Map<String, String> row,
            Map<String, String> headerMapping) {

        return TryUtils.tryCatch(() -> {
                    String customer = getRequired.apply("(Unspecified)", row, headerMapping.get("part"));
                    return new SageCustomer(
                            customer,
                            getRequired.apply(customer, row, headerMapping.get("name")),
                            getRequired.apply(customer, row, headerMapping.get("zone")),
                            getRequired.apply(customer, row, headerMapping.get("contact")),
                            getRequired.apply(customer, row, headerMapping.get("contactNumber")),
                            getRequired.apply(customer, row, headerMapping.get("proforma")),
                            getRequired.apply(customer, row, headerMapping.get("enabled")));
                }
        );
    }
}
