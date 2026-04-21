package uk.co.matchboard.app.model.job;

import java.util.List;

public record CreateJobPart(int productId, int quantity, boolean fromCallOff,
                            boolean materialAvailable,
                            List<CreateJobPartPhase> phases, List<CreateJobPartParam> params) {

}
