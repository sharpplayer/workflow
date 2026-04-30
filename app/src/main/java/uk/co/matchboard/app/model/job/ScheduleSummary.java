package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record ScheduleSummary(OffsetDateTime minPlannedTime, OffsetDateTime maxPlannedTime) {

}
