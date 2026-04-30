package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record ScheduledJobPartView(
        int operationId,
        OffsetDateTime dueDate,
        long jobNumber,
        int partNumber,
        int jobParts,
        String productName,
        Integer customerId,
        int quantity,
        String profile,
        int length,
        int width,
        int thickness,
        String material,
        String pitch,
        String edge,
        String finish,
        OffsetDateTime plannedStart,
        OffsetDateTime plannedFinish,
        OffsetDateTime actualStart,
        OffsetDateTime actualFinish,
        int plannedMinutes,
        int setupMinutes,
        int breakMinutes,
        int packMinutes,
        int status,
        int actualStartParamId,
        Integer firstOffParamId,
        int actualFinishParamId,
        int jobId,
        int jobPartId
) {

}
