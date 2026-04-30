package uk.co.matchboard.app.service;

import static uk.co.matchboard.app.service.ConfigurationServiceImpl.BOOLEANS;

import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.BadValueException;
import uk.co.matchboard.app.exception.ProductNotFoundException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.functional.TryUtils;
import uk.co.matchboard.app.model.product.CreatePhase;
import uk.co.matchboard.app.model.product.Machine;
import uk.co.matchboard.app.model.product.Phase;
import uk.co.matchboard.app.model.product.PhaseParam;
import uk.co.matchboard.app.model.product.PhaseParamData;
import uk.co.matchboard.app.model.product.Phases;
import uk.co.matchboard.app.model.product.PhasesUpdate;
import uk.co.matchboard.app.model.product.Product;
import uk.co.matchboard.app.model.product.ProductMachine;
import uk.co.matchboard.app.model.product.ProductView;
import uk.co.matchboard.app.model.product.Products;
import uk.co.matchboard.app.model.sage.SageProduct;

@Service
public class ProductServiceImpl implements ProductService {

    public static final Product EXAMPLE_PRODUCT = new Product(0, "prod", "sage", 1234, 567, 8,
            "pitch", "edge", "finish",
            "profile", "material", "owner", 12,
            List.of(new ProductMachine(1, "machine1", 60, 10),
                    new ProductMachine(2, "machine2", 120, 10),
                    new ProductMachine(3, "machine3", 180, 10)), 80, true);

    public static final Integer USAGE_FROM_CALL_OFF = 1;
    public static final Integer USAGE_TO_CALL_OFF = 2;
    public static final Integer USAGE_PER_RPI = 4;
    public static final Integer USAGE_PER_MACHINE = 8;
    public static final Integer USAGE_PER_PRODUCT_PACK = 16;
    public static final Integer USAGE_PER_RPI_LEFT_RIGHT = 32;

    private record PhaseParamKey(int id, int order) {

    }

    private final DatabaseService databaseService;

    private final SageInterfaceService sageInterfaceService;

    private final ConfigurationService configurationService;

    public ProductServiceImpl(DatabaseService databaseService,
            SageInterfaceService sageInterfaceService, ConfigurationService configurationService) {
        this.databaseService = databaseService;
        this.configurationService = configurationService;
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
                    return databaseService.getAllMachines()
                            .flatMap(machines -> Result.sequence(sageList.stream()
                                    .map(sage -> {
                                        Set<String> machineSet = machines.stream()
                                                .map(Machine::name)
                                                .collect(Collectors.toCollection(HashSet::new));
                                        Product existing = dbMap.get(sage.number());
                                        Result<Product> expected = createProduct(sage, machineSet);

                                        if (existing != null) {
                                            return expected.flatMap(e -> {
                                                if (existing.equalsApartFromId(e)) {
                                                    return Result.of(existing);
                                                } else {
                                                    changeFlag.set(true);
                                                    return databaseService.updateProduct(
                                                            e.copyWithId(existing.id()));
                                                }
                                            });
                                        } else {
                                            changeFlag.set(true);
                                            return expected.flatMap(
                                                    databaseService::createProduct);
                                        }
                                    })
                                    .toList()));
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
                        .map(list -> buildPhases(product, list, true)).map(Phases::new),
                Result::failure,
                () -> Result.failure(new BadValueException(Integer.toString(productId), "ProductId",
                        Integer.toString(productId), "Not found")
                ));
    }

    @Override
    public Result<Phases> getPhases() {
        return databaseService.getPhases().map(list -> buildPhases(EXAMPLE_PRODUCT, list, false))
                .map(Phases::new);
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
                .fold(p -> databaseService.getPhaseName(phaseId)
                                .flatMap(name -> databaseService.getPhaseParamsForResolving(phaseId, name))
                                .map(phaseParams -> buildPhases(p, phaseParams, true))
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

    @Override
    public Result<Phase> createPhase(CreatePhase phase) {
        // Some validation here!
        return databaseService.createPhase(phase).map(p -> buildPhases(EXAMPLE_PRODUCT,
                p.params().stream()
                        .map(pm -> new PhaseParam(EXAMPLE_PRODUCT.id(), EXAMPLE_PRODUCT.name(),
                                pm.phaseParamId(), pm.paramName(),
                                pm.paramConfig(), pm.input(), 0, 0)).toList(), true).getFirst());
    }

    private List<Phase> buildPhases(Product product, List<PhaseParam> phaseParams,
            boolean sortByOrder) {
        var comparator = sortByOrder ? Comparator.comparing(Phase::order)
                : Comparator.comparing(Phase::description);

        return phaseParams.stream()
                .collect(Collectors.groupingBy(
                        p -> new PhaseParamKey(p.id(), p.order())))
                .values().stream()
                .map(params -> {
                    PhaseParam first = params.getFirst();

                    List<PhaseParamData> phaseDataList = getPhaseParamData(
                            product, params);

                    return new Phase(first.id(), first.description(), phaseDataList, first.order());
                })
                .sorted(comparator)
                .collect(Collectors.toList());
    }

    @NonNull
    private List<PhaseParamData> getPhaseParamData(Product product, List<PhaseParam> params) {
        return params.stream()
                .filter(pp -> pp.paramConfig() != null)
                .sorted(Comparator.comparingInt(PhaseParam::paramOrder))
                .map(pp -> new PhaseParamData(pp.phaseParamId(), pp.paramName(),
                        pp.paramConfig(),
                        pp.input(),
                        configurationService.resolveConfig(product, pp.paramConfig(), pp.input())
                                .value()))
                .collect(Collectors.toList());
    }

    private Result<Integer> parseDimension(String value, String field, SageProduct product) {
        return TryUtils.tryCatch(() -> Integer.parseInt(value.trim()))
                .mapException(
                        ex -> new BadValueException(product.number(), field,
                                product.dimensions(),
                                ex.getMessage()));
    }

    private Result<Product> createProduct(SageProduct product, Set<String> machines) {
        var dims = product.dimensions().split("x");
        if (dims.length != 2) {
            return Result.failure(
                    new BadValueException(product.number(), "Dimension", product.dimensions(),
                            "2 dimensions required"));
        }
        var rack = parseDimension(product.rackType(), "Rack Type", product);
        if (rack.isFaulted()) {
            return Result.failure(
                    new BadValueException(product.number(), "Rack Type", product.rackType(),
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
        var packSizeR = parseDimension(product.packSize(), "Pack Size", product);
        if (packSizeR.isFaulted()) {
            return Result.failure(
                    new BadValueException(product.number(), "Pack Size", product.packSize(),
                            "Integer required"));
        }

        Result<List<ProductMachine>> productMachinesR =
                getProductMachines(product);
        if (productMachinesR.isFaulted()) {
            return productMachinesR.cast();
        }
        List<ProductMachine> productMachines = productMachinesR.fold(i -> i,
                _ -> Collections.emptyList());

        if (configurationService.hasPossibleTypos(
                productMachines.stream().map(ProductMachine::name).toList(), machines)) {
            return Result.failure(
                    new BadValueException(product.number(), "Machinery", product.machinery(),
                            "Possible typo in machinery"));
        }

        var lengthR = parseDimension(dims[0], "Length", product);
        var widthR = parseDimension(dims[1], "Width", product);
        if (!product.format().equals("LANDSCAPE") && !product.format().equals("PORTRAIT")) {
            return Result.failure(
                    new BadValueException(product.number(), "Format", product.format(),
                            "LANDSCAPE or PORTRAIT"));
        }
        var thicknessR = parseDimension(product.thickness(), "Thickness", product);
        var rackTypeR = parseDimension(product.rackType(), "Rack Type", product);
        if (rackTypeR.isFaulted()) {
            return Result.failure(
                    new BadValueException(product.number(), "Rack Type", product.packSize(),
                            "Integer required"));
        }

        return Result.flatCombine(widthR, lengthR, thicknessR, rackTypeR, packSizeR,
                (width, length, thickness, rackType, packSize) -> {
                    if (product.format().equals("LANDSCAPE") == (width < length)) {
                        return Result.failure(
                                new BadValueException(product.number(), "Dimensions",
                                        product.dimensions(),
                                        "Dimensions do not match " + product.format()));
                    }

                    return Result.of(new Product(
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
                            rackType,
                            productMachines,
                            packSize,
                            BOOLEANS.contains(product.enabled())
                    ));
                }
        );
    }

    private static Result<List<ProductMachine>> getProductMachines(SageProduct product) {
        return Result.sequence(Arrays.stream(product.machinery().split(";"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    int open = s.indexOf('(');
                    int close = s.indexOf(')');

                    if (open < 0 || close < 0 || close < open) {
                        return Result.<ProductMachine>failure(
                                new BadValueException(
                                        product.number(),
                                        "Machinery",
                                        product.machinery(),
                                        "Invalid format. Expected MACHINE(TIME_PER_UNIT|TIME_PER_PACK)"
                                )
                        );
                    }

                    String name = s.substring(0, open).trim();
                    String inner = s.substring(open + 1, close).trim();

                    String[] parts = inner.split("\\|");
                    if (parts.length != 2) {
                        return Result.<ProductMachine>failure(
                                new BadValueException(
                                        product.number(),
                                        "Machinery",
                                        product.machinery(),
                                        "Expected TIME_PER_UNIT|TIME_PER_PACK"
                                )
                        );
                    }

                    try {
                        int timePerUnit = Integer.parseInt(parts[0].trim());
                        int timePerPack = Integer.parseInt(parts[1].trim());

                        return Result.of(new ProductMachine(0, name, timePerUnit, timePerPack));
                    } catch (NumberFormatException e) {
                        return Result.<ProductMachine>failure(
                                new BadValueException(
                                        product.number(),
                                        "Machinery",
                                        product.machinery(),
                                        "Invalid numeric values in machinery"
                                )
                        );
                    }
                })
                .toList());
    }

    private String deriveNameFrom(SageProduct product) {
        return product.number();
    }
}
