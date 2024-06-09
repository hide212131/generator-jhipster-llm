import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { javaMainPackageTemplatesBlock, moveToJavaPackageSrcDir } from 'generator-jhipster/generators/java/support';
import command from './command.mjs';
import { getPomVersionProperties } from 'generator-jhipster/generators/server/support';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  async beforeQueue() {
    await this.dependsOnJHipster('server');
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {
        this.parseJHipsterArguments(command.arguments);
        this.parseJHipsterOptions(command.options);
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      async defaultTask({ application }) {
        const pomFile = this.readTemplate(this.templatePath('../resources/pom.xml'));
        // TODO use application.javaDependencies
        const versions = getPomVersionProperties(pomFile);
        application.javaDependencies = this.prepareDependencies({
          ...application.javaDependencies,
          ...versions,
        });
      },
    });
  }

  get [BaseApplicationGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask({ application }) {
        await this.writeFiles({
          sections: {
            llm: [
              {
                ...javaMainPackageTemplatesBlock(),
                templates: [
                  'config/ChatCompletionRequestMessageDeserializer.java',
                  'config/JacksonConfig.java',
                  'web/rest/chat/ModelsApiController.java',
                ],
              },
              {
                condition: generator => generator.clientFrameworkAny,
                path: `src/main/java/_package_/`,
                renameTo: moveToJavaPackageSrcDir,
                templates: [data => `web/rest/chat/ChatApi_${data.imperativeOrReactive}.java`],
              },
              {
                path: './',
                templates: ['build-chat.mjs'],
              },
            ],
          },
          context: application,
        });
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async customizePackageJson() {
        this.packageJson.merge({
          scripts: {
            'webapp:build:dev': 'webpack --config webpack/webpack.dev.js --env stats=minimal && npm run webapp:build:dev:chat --',
            'webapp:build:dev:chat': 'node build-chat.mjs',
          },
        });
      },
      async customizeMainApplication({ application: { mainJavaPackageDir, mainClass } }) {
        this.editFile(`${mainJavaPackageDir}${mainClass}.java`, { ignoreNonExisting: true }, contents =>
          contents
            .replace(
              "Application '{}' is running! Access URLs:",
              `Application '{}' is running! Access URLs:
                \\tChat: \\t\\t{}://localhost:{}{}chat-ui/index.html`,
            )
            .replace(
              'applicationName,',
              `applicationName,
            protocol,
            serverPort,
            contextPath,`,
            ),
        );
      },
      async customizeApplicationYml() {
        this.editFile(`src/main/resources/config/application-dev.yml`, { ignoreNonExisting: true }, content =>
          content.replace(
            '\n# application:',
            `\n# application:
openapi.my-llm-app.base-path: /api/llm/v1
            `,
          ),
        );
      },
      async customizeSecurityConfig({ application: { reactive } }) {
        this.editFile(`src/main/java/com/mycompany/myapp/config/SecurityConfiguration.java`, { ignoreNonExisting: true }, content =>
          reactive
            ? content.replace('"/app/**",', `"/chat-ui/**", "/app/**",`).replace(
                '.pathMatchers("/api/**").authenticated()',
                `.pathMatchers("/api/llm/**").permitAll()
                      .pathMatchers("/api/**").authenticated()`,
              )
            : content.replace(
                '.requestMatchers(mvc.pattern("/api/**")).authenticated()',
                `.requestMatchers(mvc.pattern("/api/llm/**")).permitAll()
                    .requestMatchers(mvc.pattern("/chat-ui/**")).permitAll()
                    .requestMatchers(mvc.pattern("/api/**")).authenticated()`,
              ),
        );
      },
      async customizeBuildTool({ source, application: { buildToolMaven, buildToolGradle, javaDependencies, reactive } }) {
        if (buildToolMaven) {
          // for openai api compilation if not reactive
          source.addMavenProperty?.({ property: 'reactor.version', value: javaDependencies['reactor'] });
          if (!reactive) {
            source.addMavenDependency?.([
              {
                groupId: 'io.projectreactor',
                artifactId: 'reactor-core',
                version: '${reactor.version}',
              },
            ]);
          }
          this.editFile(`pom.xml`, content => {
            if (content.includes('<artifactId>openapi-generator-maven-plugin</artifactId>')) {
              content = content.replace(
                '<version>${openapi-generator-maven-plugin.version}</version>',
                `<version>\${openapi-generator-maven-plugin.version}</version>
                <configuration>
                    <typeMappings>integer=Long,int=Long</typeMappings>
                </configuration>`,
              );
              content = content.replace(
                '</useSpringBoot3>',
                `</useSpringBoot3>                
                <interfaceOnly>true</interfaceOnly>
                <openApiNullable>false</openApiNullable>
                ${!reactive ? '<reactive>true</reactive>' : ''}`, // for chat stream
              );
            }
            return content;
          });
        } else if (buildToolGradle) {
          // for openai api compilation if not reactive
          if (!reactive) {
            source.addGradleProperty?.({ property: 'reactorVersion', value: javaDependencies['reactor'] });
            source.addGradleDependency?.({
              groupId: 'io.projectreactor',
              artifactId: 'reactor-core',
              version: '${reactorVersion}',
              scope: 'implementation',
            });
          }
          this.editFile(`gradle/swagger.gradle`, { ignoreNonExisting: true }, content => {
            content = content.replace(
              'openApiGenerate {',
              `openApiGenerate {
    typeMappings = [
        "integer": "Long",
        "int"    : "Long"
    ]`,
            );
            content = content.replace(
              'configOptions = [',
              `configOptions = [interfaceOnly: "true", openApiNullable: "false", ${!reactive ? 'reactive: "true", ' : ''}`, // for chat stream
            );
            return content;
          });
        }
      },
      async writingTemplateTask({ application }) {
        await this.writeFiles({
          sections: {
            llm: [
              {
                path: 'src/main/resources',
                templates: ['swagger/api.yml'],
              },
            ],
          },
          context: application,
        });
      },
    });
  }
}
