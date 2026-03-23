package uk.co.matchboard.app.model.product;

import java.util.List;

public record Product(int id, String name, String oldName, int width,
                      int length, int thickness, String pitch, String edge, String finish,
                       String profile, String material, String owner,
                      String rackType, List<String> machinery, boolean enabled) {

}
