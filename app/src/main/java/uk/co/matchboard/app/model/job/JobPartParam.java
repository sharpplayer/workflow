package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record JobPartParam(int partParamId, int phaseNumber, int input, int phaseId, int partPhaseId, String name,
                           String value, OffsetDateTime valuedAt) {

}
