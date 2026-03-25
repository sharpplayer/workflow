package uk.co.matchboard.app.model.product;

import java.util.List;

public record PhasesUpdate(int productId, List<Integer> phaseIds) {

}
