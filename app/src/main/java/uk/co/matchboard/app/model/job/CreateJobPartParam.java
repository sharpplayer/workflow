package uk.co.matchboard.app.model.job;

import java.util.UUID;

public record CreateJobPartParam(int paramId, int phaseNumber, String config, String value,
                                 int jobPartPhaseId, UUID tempKey, int orderOffset, Integer machineId, String name) {

}
