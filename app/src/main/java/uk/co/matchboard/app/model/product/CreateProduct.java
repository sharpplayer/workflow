package uk.co.matchboard.app.model.product;

public record CreateProduct(String name, String oldName, String orientation, int width,
                                   int length, int depth, double pitch, String edge, String finish,
                                   String carrier, String profile, boolean enabled){}
