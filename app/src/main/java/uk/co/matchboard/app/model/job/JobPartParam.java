package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record JobPartParam(int partParamId, int phaseNumber, int input, int phaseId,
                           int partPhaseId, Integer pack, String name,
                           String value, OffsetDateTime valuedAt, String config, int status, Integer machineId) {

}
