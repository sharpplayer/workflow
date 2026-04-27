package uk.co.matchboard.app.model.product;

public record ProductMachine(int id, String name, int secondsPerUnit, int setupPerPack) {

    public boolean equalsWithoutId(ProductMachine other) {
        if (this == other) {
            return true;
        }
        if (other == null) {
            return false;
        }

        return this.secondsPerUnit == other.secondsPerUnit
                && java.util.Objects.equals(this.name, other.name);
    }
}
