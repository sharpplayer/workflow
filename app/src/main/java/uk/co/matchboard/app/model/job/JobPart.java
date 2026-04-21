package uk.co.matchboard.app.model.job;

import java.util.List;

public record JobPart(int jobPartId, int productId, String name, String oldName, int quantity,
                      boolean fromCallOff,
                      boolean materialAvailable,
                      List<JobPartPhase> phases,
                      List<JobPartParam> params,
                      int status) {

}
