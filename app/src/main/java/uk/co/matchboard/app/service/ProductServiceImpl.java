package uk.co.matchboard.app.service;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.BadValueException;
import uk.co.matchboard.app.functional.OptionalResult;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.product.ProductView;
import uk.co.matchboard.app.model.product.Products;
import uk.co.matchboard.app.model.sage.SageProduct;

@Service
public class ProductServiceImpl implements ProductService {

    private static final List<String> BOOLEANS = Arrays.asList("", "Y", "y", "Yes", "YES", "True",
            "true",
            "T");

    private record ProductUpdate(List<Product> products, boolean change) {

    }

    private final DatabaseService databaseService;

    private final SageInterfaceService sageInterfaceService;

    public ProductServiceImpl(DatabaseService databaseService,
            SageInterfaceService sageInterfaceService) {
        this.databaseService = databaseService;
        this.sageInterfaceService = sageInterfaceService;
    }

    @Override
    public Result<Products> getProducts() {
        Result<List<SageProduct>> sageResult = sageInterfaceService.readProductsFromFile(
                "products.csv");
        Result<List<Product>> dbResult = databaseService.getProducts();

        Result<ProductUpdate> updateResult = sageResult.flatMap(sageList ->
                dbResult.flatMap(dbList -> {

                    Map<String, Product> dbMap = dbList.stream()
                            .collect(Collectors.toMap(Product::name, p -> p));

                    return OptionalResult.sequence(sageList.stream()
                            .map(sage -> {
                                Product existing = dbMap.get(sage.number());

                                if (existing != null) {
                                    return OptionalResult.of(existing);
                                } else {
                                    return createProduct(sage).flatMap(
                                            databaseService::createProduct);
                                }
                            })
                            .toList()).map(list -> new ProductUpdate(list, true));
                })
        );

        Result<List<Product>> latest = updateResult.fold(
                res -> res.change ? databaseService.getProducts()    : dbResult,
                _ -> databaseService.getProducts());

        return latest.map(list -> list.stream()
                        .map(product -> new ProductView(
                                product.id(),
                                product.name(),
                                product.oldName(),
                                product.enabled()
                        ))
                        .sorted(Comparator.comparing(ProductView::name))
                        .toList())
                .map(list -> new Products(list, updateResult.fold(_ -> "", Throwable::getMessage)));
    }

    private Result<Integer> parseDimension(String value, String field, SageProduct product) {
        return TryUtils.tryCatch(() -> Integer.parseInt(value.trim()))
                .mapException(
                        ex -> new BadValueException(product.number(), field, product.dimensions(),
                                ex.getMessage()));
    }

    private OptionalResult<Product> createProduct(SageProduct product) {
        if (!BOOLEANS.contains(product.enabled())) {
            return OptionalResult.empty();
        }
        var dims = product.dimensions().split("x");
        if (dims.length != 2) {
            return OptionalResult.failure(
                    new BadValueException(product.number(), "Dimension", product.dimensions(),
                            "2 dimensions required"));
        }
        var rack = parseDimension(product.rackType(), "Rack Type", product);
        if (rack.isFaulted()) {
            return OptionalResult.failure(
                    new BadValueException(product.number(), "Rack type", product.rackType(),
                            "Integer required"));
        }
        if (product.machinery().isEmpty()) {
            return OptionalResult.failure(
                    new BadValueException(product.number(), "Machinery", product.machinery(),
                            "Machinery required"));
        }
        if (product.finish().isEmpty()) {
            return OptionalResult.failure(
                    new BadValueException(product.number(), "Finish", product.finish(),
                            "Finish required"));
        }
        var widthR = parseDimension(dims[0], "Width", product);
        var lengthR = parseDimension(dims[1], "Length", product);
        var thicknessR = parseDimension(product.thickness(), "Thickness", product);
        return Result.combine(widthR, lengthR, thicknessR, (width, length, thickness) ->
                new Product(
                        0,
                        deriveNameFrom(product),
                        product.number(),
                        width,
                        length,
                        thickness,
                        product.pitch(),
                        product.edge(),
                        product.finish(),
                        product.profile(),
                        product.material(),
                        product.owner(),
                        product.rackType(),
                        Arrays.stream(product.machinery().split(";")).map(String::trim).toList(),
                        BOOLEANS.contains(product.enabled())
                )
        ).toOptional();
    }

    private String deriveNameFrom(SageProduct product) {
        return product.number();
    }
}
