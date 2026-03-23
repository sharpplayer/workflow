package uk.co.matchboard.app.model.sage;

import java.util.Map;

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

    public static SageProduct fromMap(Map<String, String> row, Map<String, String> headerMapping) {
        return new SageProduct(
                row.get(headerMapping.get("part")).trim(),
                row.get(headerMapping.get("owner")).trim(),
                row.get(headerMapping.get("material")).trim(),
                row.get(headerMapping.get("profile")).trim(),
                row.get(headerMapping.get("edge")).trim(),
                row.get(headerMapping.get("format")).trim(),
                row.get(headerMapping.get("dimensions")).trim(),
                row.get(headerMapping.get("thickness")).trim(),
                row.get(headerMapping.get("pitch")).trim(),
                row.get(headerMapping.get("racktype")).trim(),
                row.get(headerMapping.get("finish")).trim(),
                row.get(headerMapping.get("machinery")).trim(),
                row.get(headerMapping.get("enabled")).trim()
        );
    }
}
