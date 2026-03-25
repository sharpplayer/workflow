package uk.co.matchboard.app.service;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.BadValueException;
import uk.co.matchboard.app.exception.ProductNotFoundException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.product.Phase;
import uk.co.matchboard.app.model.product.PhaseParam;
import uk.co.matchboard.app.model.product.PhaseParamData;
import uk.co.matchboard.app.model.product.Phases;
import uk.co.matchboard.app.model.product.PhasesUpdate;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.product.ProductView;
import uk.co.matchboard.app.model.product.Products;
import uk.co.matchboard.app.model.sage.SageProduct;

@Service
public class ProductServiceImpl implements ProductService {

    private record PhaseKey(int id, int order) {

    }

    private static final List<String> BOOLEANS = Arrays.asList("", "Y", "y", "Yes", "YES", "True",
            "true",
            "T");

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

        AtomicBoolean changeFlag = new AtomicBoolean(false);
        Result<List<Product>> updateResult = sageResult.flatMap(sageList ->
                dbResult.flatMap(dbList -> {

                    Map<String, Product> dbMap = dbList.stream()
                            .collect(Collectors.toMap(Product::name, p -> p));

                    return Result.sequence(sageList.stream()
                            .map(sage -> {
                                Product existing = dbMap.get(sage.number());
                                Result<Product> expected = createProduct(sage);

                                if (existing != null) {
                                    return expected.flatMap(e -> {
                                        if (existing.equals(e)) {
                                            return Result.of(existing);
                                        } else {
                                            changeFlag.set(true);
                                            return databaseService.updateProduct(e);
                                        }
                                    });
                                } else {
                                    changeFlag.set(true);
                                    return expected.flatMap(
                                            databaseService::createProduct);
                                }
                            })
                            .toList());
                })
        );

        Result<List<Product>> latest = changeFlag.get() ? databaseService.getProducts() : dbResult;

        return latest.map(list -> list.stream()
                        .map(product -> new ProductView(
                                product.id(),
                                product.name(),
                                product.oldName(),
                                product.enabled()
                        ))
                        .sorted(Comparator.comparing(ProductView::name))
                        .toList())
                .map(list -> new Products(list,
                        updateResult.fold(_ -> "", Throwable::getMessage)));
    }

    @Override
    public Result<Phases> getPhases(int productId) {
        return databaseService.findProduct(productId).fold(
                product -> databaseService.getPhases(productId)
                        .map(list -> buildPhases(product, list)).map(Phases::new),
                Result::failure,
                () -> Result.failure(new BadValueException(Integer.toString(productId), "ProductId",
                        Integer.toString(productId), "Not found")
                ));
    }

    @Override
    public Result<Phases> getPhases() {
        var product = new Product(0, "prod", "sage", 1234, 567, 8, "pitch", "edge", "finish",
                "profile", "material", "owner", "12",
                List.of("machine1", "machine2", "machine3"), true);
        return databaseService.getPhases().map(list -> buildPhases(product, list)).map(Phases::new);
    }

    @Override
    public Result<Phases> updatePhases(int productId, Phases phases) {
        return databaseService.updatePhases(
                new PhasesUpdate(productId, phases.phases().stream().map(
                        Phase::id).toList())).map(_ -> phases);
    }

    @Override
    public Result<Phase> getResolvedPhase(int productId, int phaseId) {
        return databaseService.findProduct(productId)
                .fold(p -> databaseService.getPhaseParams(phaseId)
                                .map(phaseParams -> buildPhases(p, phaseParams))
                                .flatMap(phases -> {
                                    if (phases.size() != 1) {
                                        return Result.failure(
                                                new BadValueException(Integer.toString(productId),
                                                        "PhaseId",
                                                        Integer.toString(phaseId), "Bad phase resolution"));
                                    }
                                    return Result.of(phases.getFirst());
                                }), Result::failure,
                        () -> Result.failure(new ProductNotFoundException(productId)));
    }

    private List<Phase> buildPhases(Product product, List<PhaseParam> phaseParams) {
        return phaseParams.stream()
                .collect(Collectors.groupingBy(p -> new PhaseKey(p.id(), p.order())))
                .values().stream()
                .map(params -> {
                    PhaseParam first = params.getFirst();

                    List<PhaseParamData> phaseDataList = getPhaseParamData(
                            product, params);

                    return new Phase(first.id(), first.description(), phaseDataList, first.order());
                })
                .sorted(Comparator.comparingInt(Phase::order))
                .collect(Collectors.toList());
    }

    @NonNull
    private List<PhaseParamData> getPhaseParamData(Product product, List<PhaseParam> params) {
        return params.stream()
                .sorted(Comparator.comparingInt(PhaseParam::paramOrder))
                .map(pp -> new PhaseParamData(pp.phaseParamId(), pp.paramName(),
                        resolveConfig(product, pp.paramConfig(), pp.input()),
                        pp.input()))
                .collect(Collectors.toList());
    }

    private String resolveConfig(Product product, String config, boolean input) {
        if (input) {
            return "(Input)";
        } else if (config.startsWith("PRODUCT(")) {
            String prop = config.substring(8, config.length() - 1).toLowerCase();
            return TryUtils.tryCatch(() -> {
                Method accessor = Product.class.getMethod(prop);
                return accessor.invoke(product);
            }).fold(Object::toString, _ -> "");
        }
        return config;
    }

    private Result<Integer> parseDimension(String value, String field, SageProduct product) {
        return TryUtils.tryCatch(() -> Integer.parseInt(value.trim()))
                .mapException(
                        ex -> new BadValueException(product.number(), field,
                                product.dimensions(),
                                ex.getMessage()));
    }

    private Result<Product> createProduct(SageProduct product) {
        var dims = product.dimensions().split("x");
        if (dims.length != 2) {
            return Result.failure(
                    new BadValueException(product.number(), "Dimension", product.dimensions(),
                            "2 dimensions required"));
        }
        var rack = parseDimension(product.rackType(), "Rack Type", product);
        if (rack.isFaulted()) {
            return Result.failure(
                    new BadValueException(product.number(), "Rack type", product.rackType(),
                            "Integer required"));
        }
        if (product.machinery().isEmpty()) {
            return Result.failure(
                    new BadValueException(product.number(), "Machinery", product.machinery(),
                            "Machinery required"));
        }
        if (product.finish().isEmpty()) {
            return Result.failure(
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
                        Arrays.stream(product.machinery().split(";")).map(String::trim)
                                .toList(),
                        BOOLEANS.contains(product.enabled())
                )
        );
    }

    private String deriveNameFrom(SageProduct product) {
        return product.number();
    }
}
