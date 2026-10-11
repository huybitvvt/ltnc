FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /source
COPY pom.xml ./
COPY src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:17-jre-jammy
RUN groupadd --gid 10001 trohub && useradd --uid 10001 --gid trohub --no-create-home trohub && mkdir -p /app/uploads && chown -R trohub:trohub /app
WORKDIR /app
COPY --from=build --chown=trohub:trohub /source/target/trohub-backend-1.0.0-SNAPSHOT.jar app.jar
USER trohub
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=65", "-jar", "/app/app.jar"]
