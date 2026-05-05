package uk.co.matchboard.app.model.product;

import java.util.List;

public record PhaseParam(int id, String description, Integer phaseParamId, String paramName,
                         String paramConfig, Integer input, Integer order, Integer paramOrder,
                         int usage, List<Integer> machineIds) {

}
