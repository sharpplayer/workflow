package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record JobPartParam(int partParamId, int paramId, int phaseNumber, int input, int phaseId, String name, String value, OffsetDateTime valuedAt) {

}
