plugins {
    id("org.springframework.boot") version "3.5.11"
    id("io.spring.dependency-management") version "1.1.4"
    id("nu.studer.jooq") version "8.2.3"
    id("checkstyle")
    jacoco
    application
}

checkstyle {
    toolVersion = "13.3.0"
    configFile = file("config/checkstyle.xml")
    isIgnoreFailures = false
    maxWarnings = 0
}

tasks.withType<Checkstyle> {
    exclude("**/generated/**")
}

jacoco {
    toolVersion = "0.8.13"
}

repositories {
    mavenCentral()
}

sourceSets {
    main {
        java {
            srcDir("src/generated/java")
        }
    }
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:2025.0.1")
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    implementation("org.springframework.cloud:spring-cloud-starter-vault-config")
    implementation("org.springframework.boot:spring-boot-starter-jooq")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-csv")
    implementation("org.springframework.retry:spring-retry")
    implementation("org.springframework.boot:spring-boot-starter-aop")

    implementation("org.flywaydb:flyway-core:11.7.0")
    implementation("org.flywaydb:flyway-database-postgresql:11.7.0")
    implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")
    implementation("org.apache.commons:commons-text:1.15.0")

    runtimeOnly("org.postgresql:postgresql")
    jooqGenerator("org.postgresql:postgresql")
    jooqGenerator("org.jooq:jooq-meta:3.19.0")
}

jooq {
    version.set("3.20.11")
    configurations {
        create("main") {
            generateSchemaSourceOnCompilation.set(false) // generate manually with ./gradlew generateJooq
            jooqConfiguration.apply {
                jdbc.apply {
                    driver = "org.postgresql.Driver"
                    url = System.getenv("DB_URL") ?: "jdbc:postgresql://localhost:5432/matchboard"
                    user = "postgres"
                    password = "dbpassword"
                }
                generator.apply {
                    database.apply {
                        name = "org.jooq.meta.postgres.PostgresDatabase"
                        includes = ".*"
                        inputSchema = "public"
                        excludes = "flyway_schema_history"
                    }
                    target.apply {
                        packageName = "uk.co.matchboard.generated"
                        directory = "src/generated/java"
                    }
                }
            }
        }
    }
}

testing {
    suites {
        // Configure the built-in test suite
        val test by getting(JvmTestSuite::class) {
            // Use JUnit Jupiter test framework
            useJUnitJupiter("6.0.1")
        }
    }
}

tasks.test {
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)

    reports {
        xml.required.set(true)
        html.required.set(true)
        csv.required.set(false)
    }
}

// Apply a specific Java toolchain to ease working on different environments.
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

application {
    // Define the main class for the application.
    mainClass = "uk.co.matchboard.App"
}
