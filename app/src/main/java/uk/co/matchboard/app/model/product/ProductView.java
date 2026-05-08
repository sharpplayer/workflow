package uk.co.matchboard.app.model.product;

import java.util.List;

public record ProductView(int id, String name, String oldName, boolean enabled,
                          List<Integer> machineIds, int packSize) {

}
