package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record JobPartParam(int partParamId, int originalParamId, int phaseNumber, int input, int phaseId,
                           int partPhaseId, Long pack, String name,
                           String value, OffsetDateTime valuedAt, String config, int status, Integer machineId) {

}
