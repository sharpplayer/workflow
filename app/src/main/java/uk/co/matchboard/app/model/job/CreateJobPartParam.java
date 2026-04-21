package uk.co.matchboard.app.model.job;

public record CreateJobPartParam(int paramId, int phaseNumber, String config, String value,
                                 int jobPartPhaseId, boolean perPack) {

}
