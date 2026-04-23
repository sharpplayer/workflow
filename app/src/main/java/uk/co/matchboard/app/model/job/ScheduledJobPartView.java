package uk.co.matchboard.app.model.job;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ScheduledJobPartView(
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
        BigDecimal plannedMinutes,
        BigDecimal setupMinutes,
        int status,
        int actualStartParamId,
        int actualFinishParamId
) {

}
