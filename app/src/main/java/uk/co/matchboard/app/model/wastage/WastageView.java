package uk.co.matchboard.app.model.wastage;

import java.time.OffsetDateTime;

public record WastageView(
        int rpi,
        int quantity,
        String reportedBy,
        String reason,
        OffsetDateTime date) {

}
