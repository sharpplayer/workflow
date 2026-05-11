package uk.co.matchboard.app.model.wastage;

public record CreateWastage(
        int jobPhaseId,
        int rpi,
        int quantity,
        int category,
        String reportedBy,
        String reason) {

}
