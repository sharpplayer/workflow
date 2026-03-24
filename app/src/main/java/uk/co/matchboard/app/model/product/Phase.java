package uk.co.matchboard.app.model.product;

import java.util.List;

public record Phase(int id, String description, List<PhaseParamData> params, int order) {

}
