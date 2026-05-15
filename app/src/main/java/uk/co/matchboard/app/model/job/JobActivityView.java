package uk.co.matchboard.app.model.job;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record JobActivityView(
        int operationId,
        int jobId,
        long jobNumber,
        OffsetDateTime dueDate,
        int jobPartId,
        int partNumber,
        int jobParts,
        LocalDate scheduledForDate,
        OffsetDateTime plannedStartAt,
        OffsetDateTime plannedFinishAt,
        OffsetDateTime actualStartAt,
        OffsetDateTime actualFinishAt,
        int status,
        String activePhaseName,
        Integer activePhaseStatus
) {
}
