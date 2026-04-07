package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record JobPartParam(int partParamId, int paramId, int phaseNumber, String value, OffsetDateTime valuedAt) {

}
