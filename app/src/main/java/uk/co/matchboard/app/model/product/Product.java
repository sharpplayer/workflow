package uk.co.matchboard.app.model.product;

import java.util.List;

public record Product(int id, String name, String oldName, int width,
                      int length, int thickness, String pitch, String edge, String finish,
                      String profile, String material, String owner,
                      int rackType, List<String> machinery, int packSize, boolean enabled) {

    public boolean equalsApartFromId(Product e) {
        if (this == e) {
            return true;
        }
        if (e == null) {
            return false;
        }

        return java.util.Objects.equals(name, e.name)
                && java.util.Objects.equals(oldName, e.oldName)
                && width == e.width
                && length == e.length
                && thickness == e.thickness
                && java.util.Objects.equals(pitch, e.pitch)
                && java.util.Objects.equals(edge, e.edge)
                && java.util.Objects.equals(finish, e.finish)
                && java.util.Objects.equals(profile, e.profile)
                && java.util.Objects.equals(material, e.material)
                && java.util.Objects.equals(owner, e.owner)
                && rackType == e.rackType
                && java.util.Objects.equals(machinery, e.machinery)
                && packSize == e.packSize
                && enabled == e.enabled;
    }

    public Product copyWithId(int id) {
        return new Product(
                id,
                name,
                oldName,
                width,
                length,
                thickness,
                pitch,
                edge,
                finish,
                profile,
                material,
                owner,
                rackType,
                machinery,
                packSize,
                enabled
        );
    }
}
