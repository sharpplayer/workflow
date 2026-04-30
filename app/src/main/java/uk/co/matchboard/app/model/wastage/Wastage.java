package uk.co.matchboard.app.model.wastage;

import java.time.OffsetDateTime;

public record Wastage(
        int id, int jobPhaseId,
        int rpi,
        int quantity,
        int reportedBy,
        String reason,
        OffsetDateTime createDate) {

}
