# MapBuilder Validation

The goal of this project is to implement a REST API that allows the MapBuilder extension to perform compilation, validation, and transformation of an FML (FHIR Mapping Language) file provided by MatchBox through REST calls.

This application helps the alignment designer use FML without errors by ensuring syntactic validation.

[MatchBox Engine](https://github.com/ahdis/matchbox) is included in the application to manage the different processing stages.

## Inclusion of MatchBox Engine

MatchBox Engine is included in the project. It can be found in the pom.xml file located at the root of the project.
At the time of writing this documentation, the version used is **3.9.12**.

### Changing the Fixed Version of MatchBox Engine

The version of MatchBox Engine is specified in the pom.xml file. It can be manually changed by updating the version number and then downloading the new dependency.
To resolve the dependency, use the command:

```shell
mvn dependency:resolve
```

Alternatively, Maven can manage dependency versions automatically.
First, check for available updates with:

```shell
mvn versions:display-dependency-updates
```

Then, update to the latest versions with:

```shell
mvn versions:use-latest-versions
```


## API Endpoints

### Validate FML Mapping

#### Endpoint: GET /api/matchbox/validate

**Parameters:**

- ```source``` (String) - The source FML file.

- ```data``` (String) - The data to be transformed.

- ```output``` (String) - The output path for the transformed data.

**Response:**

- ```200 OK``` - Validation and transformation successful.

- ```500 Internal Server Error``` - Error during validation, transformation, or an unexpected issue.

**Example Request:**

```shell
curl -X GET "http://localhost:8080/api/matchbox/validate?source=example.fml&data=input.json&output=output.json"
```
### Reset and Reload MatchBox Engine

#### Endpoint: GET /api/matchbox/resetAndLoadEngine

**Parameters:**

- ```path``` (String) - The path to the engine configuration.

**Response:**

- ```200 OK``` - Engine successfully reloaded.

- ```500 Internal Server Error``` - Failed to reload engine.

**Example Request:**

```shell
curl -X GET "http://localhost:8080/api/matchbox/resetAndLoadEngine?path=config.json"
```

### Health Check

#### Endpoint: GET /health

**Response:**

- ```200 OK``` - Application is fully initialized.

- ```503 Service Unavailable``` - Application is still initializing.

**Example Request:**

```shell
curl -X GET "http://localhost:8080/health"
```

### Shutdown Application

#### Endpoint: GET /shutdown

**Response:**

- ```200 OK ```- Application is shutting down.

**Example Request:**

```shell
curl -X GET "http://localhost:8080/shutdown"
```


## Packaging the Project

To package the project, Maven is required:

- Use the command mvn clean to remove an old package.

- Use the command mvn package to create a new package.
